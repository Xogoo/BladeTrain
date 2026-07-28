<script setup>
import { onMounted, ref } from "vue";
import AppIcon from "./AppIcon.vue";
import SessionSummary from "./SessionSummary.vue";
import { useGame } from "../composables/useGame.js";
import { useBackup } from "../composables/useBackup.js";

const { state, goToStart } = useGame();
const { showMonthlyBackupPrompt, markMonthlyPromptShown, exportBackup } = useBackup();

// Shown at most once per calendar month, right here at the end of a
// session — marked seen as soon as this screen appears (not only once
// acted on), so it doesn't keep coming back for the rest of the month
// either way.
const showBackupPrompt = ref(false);
const backupStatus = ref("");
onMounted(() => {
  if (showMonthlyBackupPrompt.value) {
    showBackupPrompt.value = true;
    markMonthlyPromptShown();
  }
});

async function sendMonthlyBackup() {
  const result = await exportBackup();
  if (result.method === "cancelled") {
    return;
  }
  backupStatus.value =
    result.method === "share" ? "Sauvegarde envoyée !" : "Sauvegarde téléchargée !";
}
</script>

<template>
  <section class="report rise-in">
    <h2 class="report__title sticker-text">Rapport de session</h2>

    <div class="report__body panel">
      <SessionSummary v-if="state.lastSessionId" :session-id="state.lastSessionId" />
    </div>

    <div v-if="showBackupPrompt" class="backup-prompt panel">
      <div class="backup-prompt__row">
        <AppIcon name="share" :size="18" />
        <div class="backup-prompt__text">
          <strong>Nouveau mois — pense à ta sauvegarde !</strong>
          <span>Garde ta progression en sécurité en l'envoyant quelque part.</span>
        </div>
      </div>
      <button class="btn btn--ghost backup-prompt__btn" @click="sendMonthlyBackup">
        {{ backupStatus || "Envoyer la sauvegarde" }}
      </button>
    </div>

    <button class="btn btn--go report__back" @click="goToStart()">
      <AppIcon name="play" :size="18" /> Retour à l'accueil
    </button>
  </section>
</template>

<style scoped>
.report {
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 30px 16px 46px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  text-align: center;
}

.report__title {
  font-size: clamp(24px, 6vw, 32px);
  text-transform: uppercase;
}

.report__body {
  width: 100%;
  padding: 18px;
  text-align: left;
}

.backup-prompt {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  text-align: left;
  color: var(--red-hi);
}

.backup-prompt__row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.backup-prompt__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.backup-prompt__text strong {
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.backup-prompt__text span {
  color: var(--text-dim);
  font-size: 13px;
}

.backup-prompt__btn {
  width: 100%;
  font-size: 13px;
  padding: 10px 14px;
}

.report__back {
  margin-top: 6px;
  font-size: 16px;
  padding: 14px 30px;
}
</style>