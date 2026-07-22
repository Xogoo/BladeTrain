<script setup>
import { computed, ref } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import { GRINDS } from "../game/trickData.js";
import { BADGES, useCollection } from "../composables/useCollection.js";
import { useGame } from "../composables/useGame.js";
import { useSettings } from "../composables/useSettings.js";

const emit = defineEmits(["close"]);

const {
  collection,
  uniqueTrickCount,
  landedGrindCount,
  totalGrinds,
  grindProgressPercent,
  earnedBadges,
  hasBadge,
  grindLandedCount,
  resetCollection,
  staleCombos,
} = useCollection();
const { startReviewSession } = useGame();
const { settings } = useSettings();

// Two-tap confirm so a stray tap can't wipe lifetime progress.
const confirmingReset = ref(false);

const onReset = () => {
  if (!confirmingReset.value) {
    confirmingReset.value = true;
    return;
  }
  resetCollection();
  confirmingReset.value = false;
};

// Sort FS/BS pairs next to their base name, like the tricktionary.
const grinds = [...GRINDS].sort((a, b) =>
  a.name.replace(/^(BS|FS)/, "ZZ").localeCompare(b.name.replace(/^(BS|FS)/, "ZZ"))
);

// "Grinds to review": grind+variation combos not landed in the chosen
// window, or never landed at all. Recomputed whenever the window
// changes — cheap enough (a few hundred pairs at most) to do inline.
const REVIEW_WINDOWS = [7, 14, 30, 60, 90];
const reviewDays = ref(30);
const staleList = computed(() =>
  [...staleCombos(reviewDays.value)].sort((a, b) => {
    // Never-landed combos first, then oldest last-landed date first.
    if (!a.lastLandedAt && !b.lastLandedAt) return 0;
    if (!a.lastLandedAt) return -1;
    if (!b.lastLandedAt) return 1;
    return new Date(a.lastLandedAt) - new Date(b.lastLandedAt);
  })
);

function formatStaleness(iso) {
  if (!iso) return "jamais réussi";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "il y a 1 jour";
  return `il y a ${days} jours`;
}

function startReview() {
  if (!staleList.value.length) return;
  startReviewSession(
    staleList.value.map(({ grindName, variationName }) => ({
      grindName,
      variationName,
    })),
    settings
  );
  emit("close");
}

</script>

<template>
  <AppModal title="Collection" @close="$emit('close')">
    <div class="stats">
      <div class="stat">
        <span class="stat__value">{{ uniqueTrickCount }}</span>
        <span class="stat__label">tricks uniques</span>
      </div>
      <div class="stat">
        <span class="stat__value">{{ collection.landedTotal }}</span>
        <span class="stat__label">total réussi</span>
      </div>
      <div class="stat">
        <span class="stat__value">{{ earnedBadges.length }}/{{ BADGES.length }}</span>
        <span class="stat__label">badges</span>
      </div>
    </div>

    <div class="grind-progress">
      <span class="grind-progress__count"
        >{{ landedGrindCount }}/{{ totalGrinds }}</span
      >
      grinds réussis
      <span class="grind-progress__bar">
        <span
          class="grind-progress__fill"
          :style="{ width: `${grindProgressPercent}%` }"
        />
      </span>
    </div>

    <h3 class="section-title">Grinds à réviser</h3>
    <div class="review-controls">
      <span>Pas refaits depuis</span>
      <select class="select" v-model.number="reviewDays">
        <option v-for="d in REVIEW_WINDOWS" :key="d" :value="d">{{ d }} jours</option>
      </select>
    </div>
    <ul v-if="staleList.length" class="review-list">
      <li v-for="entry in staleList" :key="`${entry.grindName}-${entry.variationName}`">
        <span class="review-list__name">
          {{ entry.grindName }}
          <span v-if="entry.variationName !== 'None'" class="review-list__variation">
            {{ entry.variationName }}
          </span>
        </span>
        <span class="review-list__age">{{ formatStaleness(entry.lastLandedAt) }}</span>
      </li>
    </ul>
    <p v-else class="hint">Rien à réviser pour cette période — bien joué !</p>
    <button
      v-if="staleList.length"
      class="btn btn--go review-start"
      @click="startReview"
    >
      <AppIcon name="play" :size="16" /> Lancer une session sur cette liste ({{ staleList.length }})
    </button>

    <h3 class="section-title">Grinds</h3>
    <ul class="grind-list">
      <li
        v-for="grind in grinds"
        :key="grind.name"
        :class="{ landed: grindLandedCount(grind.name) > 0 }"
      >
        <span class="grind-list__check">
          <AppIcon
            v-if="grindLandedCount(grind.name) > 0"
            name="check"
            :size="14"
          />
        </span>
        {{ grind.name }}
        <span v-if="grindLandedCount(grind.name) > 0" class="grind-list__count"
          >{{ grindLandedCount(grind.name) }}&times;</span
        >
      </li>
    </ul>

    <h3 class="section-title">Badges</h3>
    <div class="badges">
      <div
        v-for="badge in BADGES"
        :key="badge.id"
        class="badge-card"
        :class="{ 'badge-card--earned': hasBadge(badge.id) }"
      >
        <AppIcon name="trophy" :size="20" />
        <span class="badge-card__text">
          <strong>{{ badge.name }}</strong>
          <small>{{ badge.desc }}</small>
        </span>
      </div>
    </div>

    <div class="actions">
      <button
        class="btn btn--ghost reset-btn"
        :class="{ 'reset-btn--confirm': confirmingReset }"
        @click="onReset"
        @blur="confirmingReset = false"
      >
        {{ confirmingReset ? "Retape pour tout effacer" : "Réinitialiser la progression" }}
      </button>
    </div>
  </AppModal>
</template>

<style scoped>
.stats {
  display: flex;
  gap: 10px;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 14px 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
}

.stat__value {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 900;
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
}

.stat__label {
  font-family: var(--font-display);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.grind-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 15px;
  color: var(--text-dim);
}

.grind-progress__count {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--text);
}

.grind-progress__bar {
  flex: 1;
  height: 7px;
  border-radius: 999px;
  background: rgba(var(--fg-rgb), 0.08);
  overflow: hidden;
}

.grind-progress__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--red-deep), var(--red));
  box-shadow: var(--glow-red);
  transition: width 0.4s ease;
}

.section-title {
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--red-hi);
  margin: 20px 0 10px;
}

.hint {
  color: var(--text-dim);
  font-size: 14px;
}

.review-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--text-dim);
}

.review-controls .select {
  font-family: var(--font-body);
  font-size: 14px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--bg-1);
  color: var(--text);
}

.review-controls .select option {
  background: var(--bg-1);
  color: var(--text);
}

.review-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.review-list li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--panel);
  border: 1px solid var(--line);
  font-size: 14px;
}

.review-list__variation {
  color: var(--text-dim);
  font-size: 12px;
  margin-left: 6px;
}

.review-list__age {
  flex: none;
  font-size: 12px;
  color: var(--red-hi);
  white-space: nowrap;
}

.review-start {
  width: 100%;
  margin-bottom: 6px;
}

.badges {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.badge-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--text-dim);
  opacity: 0.45;
}

.badge-card--earned {
  opacity: 1;
  color: var(--red-hi);
  border-color: rgba(var(--fg-rgb), 0.6);
  box-shadow: 0 0 10px rgba(var(--fg-rgb), 0.2);
}

.badge-card__text {
  display: flex;
  flex-direction: column;
}

.badge-card__text strong {
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.badge-card__text small {
  font-size: 13px;
  color: var(--text-dim);
}

.grind-list {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 14px;
}

.grind-list li {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-dim);
}

.grind-list li.landed {
  color: var(--text);
}

.grind-list__check {
  width: 16px;
  display: inline-flex;
  justify-content: center;
  color: var(--red-hi);
  flex: none;
}

.grind-list__count {
  margin-left: auto;
  font-size: 13px;
  color: var(--red-hi);
}

.actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.reset-btn--confirm {
  color: var(--red-hi);
  border-color: rgba(var(--fg-rgb), 0.6);
  box-shadow: 0 0 10px rgba(var(--fg-rgb), 0.2);
}

@media (max-width: 560px) {
  .badges,
  .grind-list {
    grid-template-columns: 1fr;
  }
}
</style>