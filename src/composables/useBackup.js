import { computed } from "vue";
import { useCollection } from "./useCollection.js";
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

export function useBackup() {
  const { collection } = useCollection();
  const { settings } = useSettings();

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
    const fileName = backupFileName();
    const file = new File([json], fileName, { type: "application/json" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Sauvegarde BLADE",
          text: settings.backupEmail
            ? `Sauvegarde de ta progression BLADE — envoie-la à ${settings.backupEmail} pour la garder en sécurité.`
            : "Sauvegarde de ta progression BLADE.",
        });
        markBackedUp();
        return { method: "share" };
      } catch (err) {
        // AbortError = the player closed the share sheet without
        // picking anything — not a failure, just don't mark it done.
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
    markBackedUp();
    return { method: "download" };
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
    Object.assign(collection, payload.collection);
    if (payload.settings) {
      Object.assign(settings, payload.settings);
    }
  }

  return {
    lastBackupAt,
    needsBackupReminder,
    exportBackup,
    restoreBackup,
  };
}
