import { computed } from "vue";
import { useCollection, migrateZerospinSplit } from "./useCollection.js";
import { useSettings } from "./useSettings.js";

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
      families: JSON.parse(JSON.stringify(settings.customFamilies)),
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
    // A backup made before the Zerospin family split (see
    // useCollection.js) never goes through loadCollection()'s own
    // migration when restored mid-session — run it here too, or that
    // family's progress comes back orphaned under the old ids.
    Object.assign(collection, migrateZerospinSplit(payload.collection));
    if (payload.settings) {
      Object.assign(settings, payload.settings);
    }
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
  };
}