<script setup>
import { computed } from "vue";
import AppIcon from "./AppIcon.vue";
import { useGame } from "../composables/useGame.js";
import { useCollection } from "../composables/useCollection.js";
import { useSettings } from "../composables/useSettings.js";

const { state, goToStart, startComboCareer, startComboMix } = useGame();
const { bestComboChain } = useCollection();
const { settings } = useSettings();

const recap = computed(() => state.comboRecap);
const isNewBest = computed(
  () => recap.value && bestComboChain.value !== null && recap.value.chain >= bestComboChain.value
);

function relancer() {
  if (!recap.value) {
    return;
  }
  if (recap.value.source === "career") {
    startComboCareer(recap.value.track, settings);
  } else {
    startComboMix(recap.value.familyIds, settings);
  }
}

function goHome() {
  goToStart();
}
</script>

<template>
  <section class="combo-recap rise-in">
    <p class="combo-recap__eyebrow">
      {{ recap?.cleared ? "Chemin terminé !" : "Combo terminé" }}
    </p>
    <h2 class="combo-recap__title sticker-text">
      {{ recap?.chain ?? 0 }} trick{{ (recap?.chain ?? 0) > 1 ? "s" : "" }}
    </h2>
    <p class="combo-recap__subtitle">
      {{ recap?.label }}
      <span v-if="isNewBest" class="combo-recap__best">— nouveau record !</span>
    </p>

    <div class="combo-recap__stats">
      <div class="combo-recap__stat">
        <span class="combo-recap__stat-value">{{ recap?.chain ?? 0 }}</span>
        <span class="combo-recap__stat-label">chaîne</span>
      </div>
      <div class="combo-recap__stat">
        <span class="combo-recap__stat-value">{{ bestComboChain ?? "—" }}</span>
        <span class="combo-recap__stat-label">record</span>
      </div>
    </div>

    <div class="combo-recap__actions">
      <button class="btn btn--go" @click="relancer()">
        <AppIcon name="play" :size="18" /> Relancer
      </button>
      <button class="btn btn--ghost" @click="goHome()">
        <AppIcon name="forward" :size="16" style="transform: scaleX(-1)" /> Retour à l'accueil
      </button>
    </div>
  </section>
</template>

<style scoped>
.combo-recap {
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 30px 16px 46px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.combo-recap__eyebrow {
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
}

.combo-recap__title {
  font-size: clamp(32px, 9vw, 48px);
  font-weight: 900;
  text-transform: uppercase;
  margin: 2px 0;
}

.combo-recap__subtitle {
  color: var(--text-dim);
  font-size: 15px;
  max-width: 340px;
}

.combo-recap__best {
  color: var(--red-hi);
  font-weight: 700;
}

.combo-recap__stats {
  display: flex;
  gap: 28px;
  margin-top: 18px;
}

.combo-recap__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.combo-recap__stat-value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 900;
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
  line-height: 1;
}

.combo-recap__stat-label {
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-top: 4px;
}

.combo-recap__actions {
  margin-top: 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(280px, 100%);
}
</style>