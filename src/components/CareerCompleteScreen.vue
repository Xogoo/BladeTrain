<script setup>
import { computed } from "vue";
import AppIcon from "./AppIcon.vue";
import { useGame } from "../composables/useGame.js";
import { useCollection } from "../composables/useCollection.js";
import { FAMILIES } from "../game/families.js";

const { state, goToStart } = useGame();
const { careerProgress } = useCollection();

const track = computed(() => state.careerJustCompleted?.track ?? "normal");
const trackLabel = computed(() => (track.value === "normal" ? "Normal" : "Switch"));
const badge = computed(() => state.careerJustCompleted?.badge ?? null);

const familyCount = computed(
  () => FAMILIES.filter((f) => f.track === track.value).length
);
const totalTricks = computed(() => careerProgress(track.value).total);

// Tumbling logo images rain down — same visual language as the Group
// mode game-over screen, just for the biggest moment in the app.
const rain = Array.from({ length: 30 }, () => ({
  left: `${Math.random() * 100}%`,
  size: `${16 + Math.random() * 24}px`,
  delay: `${Math.random() * 3}s`,
  duration: `${2.6 + Math.random() * 3}s`,
  spin: `${Math.round((Math.random() * 2 - 1) * 720)}deg`,
  opacity: 0.25 + Math.random() * 0.5,
}));
</script>

<template>
  <section class="career-win rise-in">
    <div class="logo-rain" aria-hidden="true">
      <img
        v-for="(drop, i) in rain"
        :key="i"
        src="/img/blade-mark-square.svg"
        alt=""
        :style="{
          left: drop.left,
          width: drop.size,
          animationDelay: drop.delay,
          animationDuration: drop.duration,
          '--spin': drop.spin,
          '--drop-opacity': drop.opacity,
        }"
      />
    </div>

    <img class="career-win__stamp" src="/img/blade-mark-square.svg" alt="" />

    <p class="career-win__eyebrow">Carrière {{ trackLabel }} complète</p>
    <h2 class="career-win__title sticker-text">
      {{ badge ? badge.name : "Légende" }}
    </h2>
    <p class="career-win__subtitle">
      Les {{ familyCount }} familles de la Carrière {{ trackLabel }}, terminées.
    </p>

    <div class="career-win__stats">
      <div class="career-win__stat">
        <span class="career-win__stat-value">{{ familyCount }}</span>
        <span class="career-win__stat-label">familles</span>
      </div>
      <div class="career-win__stat">
        <span class="career-win__stat-value">{{ totalTricks }}</span>
        <span class="career-win__stat-label">tricks</span>
      </div>
    </div>

    <div class="career-win__actions">
      <button class="btn btn--go" @click="goToStart()">
        <AppIcon name="play" :size="18" /> Continuer
      </button>
    </div>
  </section>
</template>

<style scoped>
.career-win {
  position: relative;
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 30px 16px 46px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.career-win__stamp {
  width: 120px;
  margin-bottom: 6px;
  animation:
    career-stamp-in 0.6s cubic-bezier(0.2, 1.4, 0.35, 1) both,
    career-stamp-glow 2.2s ease-in-out 0.6s infinite;
}

@keyframes career-stamp-in {
  0% {
    opacity: 0;
    transform: scale(3) rotate(-18deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(-4deg);
  }
}

@keyframes career-stamp-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 14px rgba(var(--fg-rgb), 0.45));
  }
  50% {
    filter: drop-shadow(0 0 32px rgba(var(--fg-rgb), 0.85));
  }
}

.career-win__eyebrow {
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
}

.career-win__title {
  font-size: clamp(32px, 9vw, 48px);
  font-weight: 900;
  text-transform: uppercase;
  margin: 2px 0;
}

.career-win__subtitle {
  color: var(--text-dim);
  font-size: 15px;
  max-width: 340px;
}

.career-win__stats {
  display: flex;
  gap: 28px;
  margin-top: 18px;
}

.career-win__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.career-win__stat-value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 900;
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
  line-height: 1;
}

.career-win__stat-label {
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-top: 4px;
}

.career-win__actions {
  margin-top: 26px;
}

.logo-rain {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.logo-rain img {
  position: absolute;
  top: -40px;
  opacity: 0;
  filter: drop-shadow(0 0 6px rgba(var(--fg-rgb), 0.35));
  animation-name: logo-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes logo-fall {
  0% {
    opacity: var(--drop-opacity);
    transform: translateY(0) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(92vh) rotate(var(--spin));
  }
}
</style>