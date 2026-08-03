import { computed } from "vue";
import { useCollection, migrateZerospinSplit, migrateFamilyEntryKeyFormat } from "./useCollection.js";
import { useSettings, migrateSwitchUpNoneVariants } from "./useSettings.js";

// There is no server here, and this app is sideloaded (not from the
// App Store) — there is no way to run code in the background on a
// schedule and silently email a file with zero interaction from the
// player. The closest honest equivalent: nudge the player once a
// backup is overdue (needsBackupReminder below), and make the actual
// send/save a single tap once they act on it (exportBackup below).

// How long we let a backup go stale before nudging the player again.
const BACKUP_REMINDER_DAYS = 7;
const BACKUP_REMINDER_MS = BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;

function backupFileName() {
  const date = new Date().toISOString().slice(0, 10);
  return `blade-backup-${date}.json`;
}

function familiesFileName() {
  const date = new Date().toISOString().slice(0, 10);
  return `blade-familles-perso-${date}.json`;
}

// Silent local safety net — separate from the player's own manual
// export/share above. Snapshots collection+settings into IndexedDB at
// most once a day, keeping the last few. This is NOT a substitute for
// a real backup: it lives on this same device/browser profile, so it
// can't help if the device itself is lost, wiped, or the browser data
// is cleared — it only protects against something going wrong
// LOCALLY (an accidental reset, a bad migration, a stray bug) between
// the player's own real exports.
const AUTO_BACKUP_DB_NAME = "blade-auto-backup";
const AUTO_BACKUP_STORE = "snapshots";
const AUTO_BACKUP_KEEP = 5;

function openAutoBackupDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(AUTO_BACKUP_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(AUTO_BACKUP_STORE, { keyPath: "timestamp" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function pruneAutoBackups(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTO_BACKUP_STORE, "readwrite");
    const store = tx.objectStore(AUTO_BACKUP_STORE);
    const request = store.getAllKeys();
    request.onsuccess = () => {
      // ISO timestamp strings sort lexically the same as chronologically.
      const keysNewestFirst = [...request.result].sort().reverse();
      for (const key of keysNewestFirst.slice(AUTO_BACKUP_KEEP)) {
        store.delete(key);
      }
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function saveAutoBackupSnapshot(payload) {
  try {
    const db = await openAutoBackupDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(AUTO_BACKUP_STORE, "readwrite");
      tx.objectStore(AUTO_BACKUP_STORE).put({ timestamp: payload.exportedAt, payload });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    await pruneAutoBackups(db);
    db.close();
  } catch {
    // IndexedDB blocked/unavailable (private browsing, storage full,
    // very old browser...) — this is a silent safety net on top of
    // the real export, never worth surfacing an error over.
  }
}

async function listAutoBackupsRaw() {
  try {
    const db = await openAutoBackupDb();
    const rows = await new Promise((resolve, reject) => {
      const tx = db.transaction(AUTO_BACKUP_STORE, "readonly");
      const request = tx.objectStore(AUTO_BACKUP_STORE).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  } catch {
    return [];
  }
}

// Shared by exportBackup and exportFamilies below: try the native share
// sheet first (Mail, AirDrop, Files, whatever the player picks, with
// the JSON file attached), falling back to a plain download if sharing
// files isn't supported.
async function shareOrDownloadJson(json, fileName, shareText) {
  const file = new File([json], fileName, { type: "application/json" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName, text: shareText });
      return { method: "share" };
    } catch (err) {
      // AbortError = the player closed the share sheet without picking
      // anything — not a failure, just don't mark anything done.
      if (err?.name === "AbortError") {
        return { method: "cancelled" };
      }
      // Any other error: fall through to the download fallback below.
    }
  }

  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return { method: "download" };
}

export function useBackup() {
  const { collection } = useCollection();
  const { settings, importCustomFamilies } = useSettings();

  function buildPayload() {
    return {
      app: "BLADE",
      version: 1,
      exportedAt: new Date().toISOString(),
      // Plain JSON clones — never share the live reactive objects
      // themselves, so nothing downstream can accidentally mutate
      // state.
      collection: JSON.parse(JSON.stringify(collection)),
      settings: JSON.parse(JSON.stringify(settings)),
    };
  }

  function markBackedUp() {
    collection.lastBackupAt = new Date().toISOString();
  }

  const lastBackupAt = computed(() => collection.lastBackupAt);

  const needsBackupReminder = computed(() => {
    const hasData = collection.lands.length > 0 || collection.landedTotal > 0;
    if (!hasData) return false;
    if (!collection.lastBackupAt) return true;
    return Date.now() - new Date(collection.lastBackupAt).getTime() > BACKUP_REMINDER_MS;
  });

  // Separate, gentler nudge: once per calendar month, the end-of-session
  // recap offers a one-tap "Envoyer la sauvegarde" — shown regardless of
  // whether the 7-day reminder above has already fired, and marked seen
  // as soon as it's shown (not only once acted on), so it doesn't nag
  // for the rest of the month either way.
  function currentMonthKey() {
    return new Date().toISOString().slice(0, 7); // "YYYY-MM"
  }

  const showMonthlyBackupPrompt = computed(() => {
    const hasData = collection.lands.length > 0 || collection.landedTotal > 0;
    return hasData && collection.lastMonthlyPromptMonth !== currentMonthKey();
  });

  function markMonthlyPromptShown() {
    collection.lastMonthlyPromptMonth = currentMonthKey();
  }

  /**
   * Tries the native share sheet first (Mail, AirDrop, Files, whatever
   * the player picks, with the actual JSON file attached) — this is
   * the one-tap path. Falls back to a plain file download if sharing
   * files isn't supported, which on iOS still opens a "Save to Files"
   * prompt the player can then attach to an email themselves.
   */
  async function exportBackup() {
    const payload = buildPayload();
    const json = JSON.stringify(payload, null, 2);
    const shareText = settings.backupEmail
      ? `Sauvegarde de ta progression BLADE — envoie-la à ${settings.backupEmail} pour la garder en sécurité.`
      : "Sauvegarde de ta progression BLADE.";
    const result = await shareOrDownloadJson(json, backupFileName(), shareText);
    if (result.method !== "cancelled") {
      markBackedUp();
    }
    return result;
  }

  /**
   * Same idea as exportBackup, but scoped to just the player's custom
   * ("perso") families — for sharing a family with someone else, or
   * moving just those between devices, without dragging the whole
   * progress/settings backup along.
   */
  async function exportFamilies() {
    const payload = {
      app: "BLADE",
      type: "custom-families",
      version: 1,
      exportedAt: new Date().toISOString(),
      families: JSON.parse(
        JSON.stringify(settings.customFamilies.filter((f) => f.id !== "weak-points"))
      ),
    };
    const json = JSON.stringify(payload, null, 2);
    return shareOrDownloadJson(
      json,
      familiesFileName(),
      "Familles de tricks perso BLADE."
    );
  }

  /**
   * Imports families from a previously exported file (or one shared by
   * someone else) — merges into the existing list rather than
   * replacing it (see importCustomFamilies in useSettings.js for the
   * dedupe rule). Returns { imported, skipped } for the caller to show
   * a status message.
   */
  function importFamilies(payload) {
    if (!payload || !Array.isArray(payload.families)) {
      throw new Error(
        "Ce fichier ne ressemble pas à un export de familles perso BLADE."
      );
    }
    return importCustomFamilies(payload.families);
  }

  /**
   * Restores collection + settings from a previously exported file.
   * Used by a "Restore backup" file picker in the settings panel.
   */
  function restoreBackup(payload) {
    if (
      !payload ||
      (payload.app !== "BLADE" && payload.app !== "AIGHT") ||
      !payload.collection
    ) {
      throw new Error("Ce fichier ne ressemble pas à une sauvegarde BLADE.");
    }
    // A backup made before the Zerospin family split, or before the
    // 3rd-grind familyEntryKey format change (see useCollection.js),
    // never goes through loadCollection()'s own migrations when
    // restored mid-session — run both here too, or progress comes
    // back orphaned/reset under either change.
    Object.assign(
      collection,
      migrateFamilyEntryKeyFormat(migrateZerospinSplit(payload.collection))
    );
    if (payload.settings) {
      Object.assign(settings, migrateSwitchUpNoneVariants(payload.settings));
    }
  }

  /**
   * Called once per solo session end (see useGame.js) — snapshots
   * collection+settings into IndexedDB, but at most once a day, so a
   * long session or several short ones in the same day don't pile up
   * redundant snapshots. Failures are swallowed on purpose (see
   * saveAutoBackupSnapshot above) — this must never interrupt or
   * error out the actual game flow it's called from.
   */
  async function autoBackupIfDue() {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    if (collection.lastAutoBackupDate === today) {
      return;
    }
    await saveAutoBackupSnapshot(buildPayload());
    collection.lastAutoBackupDate = today;
  }

  /** Newest-first list of local auto-backup snapshots, for a small
   * "restore from a recent local snapshot" UI (see CollectionPanel.vue). */
  async function listAutoBackups() {
    return listAutoBackupsRaw();
  }

  /** Restores one specific local snapshot by its timestamp key — same
   * underlying restoreBackup as a manually-imported file. */
  async function restoreAutoBackup(timestamp) {
    const backups = await listAutoBackupsRaw();
    const entry = backups.find((b) => b.timestamp === timestamp);
    if (!entry) {
      throw new Error("Cette sauvegarde locale n'existe plus.");
    }
    restoreBackup(entry.payload);
  }

  return {
    lastBackupAt,
    needsBackupReminder,
    showMonthlyBackupPrompt,
    markMonthlyPromptShown,
    exportBackup,
    restoreBackup,
    exportFamilies,
    importFamilies,
    autoBackupIfDue,
    listAutoBackups,
    restoreAutoBackup,
  };
}