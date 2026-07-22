<script setup>
import AppIcon from "./AppIcon.vue";
import SessionSummary from "./SessionSummary.vue";
import { useGame } from "../composables/useGame.js";

const { state, goToStart } = useGame();
</script>

<template>
  <section class="report rise-in">
    <h2 class="report__title sticker-text">Rapport de session</h2>

    <div class="report__body panel">
      <SessionSummary v-if="state.lastSessionId" :session-id="state.lastSessionId" />
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

.report__back {
  margin-top: 6px;
  font-size: 16px;
  padding: 14px 30px;
}
</style>