<script setup>
import { computed, ref } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import { FAMILIES } from "../game/families.js";
import { useCollection } from "../composables/useCollection.js";
import { useGame } from "../composables/useGame.js";
import { useSettings } from "../composables/useSettings.js";

const emit = defineEmits(["close"]);

const {
  collection,
  uniqueTrickCount,
  landedGrindCount,
  totalGrinds,
  grindProgressPercent,
  allBadges,
  earnedBadges,
  hasBadge,
  familyIndex,
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

// Every built-in family (both tracks, all 20 tiers) plus the player's
// own, each with its completion — a quick "where do I stand" overview
// without having to open Carrière/Familles one at a time. Sorted
// normal-then-switch-by-tier so it reads the same order as Carrière;
// custom families (no fixed tier) are appended at the end, most
// recently created first.
const familyProgress = computed(() => {
  const builtIn = [...FAMILIES]
    .sort((a, b) => (a.track === b.track ? a.tier - b.tier : a.track === "normal" ? -1 : 1))
    .map((family) => ({
      id: family.id,
      name: family.name,
      landed: familyIndex(family.id),
      total: family.entries.length,
    }));
  const custom = [...settings.customFamilies]
    .slice()
    .reverse()
    .map((family) => ({
      id: family.id,
      name: family.name,
      landed: familyIndex(family.id),
      total: family.entries.length,
    }));
  return [...builtIn, ...custom];
});

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
        <span class="stat__value">{{ earnedBadges.length }}/{{ allBadges.length }}</span>
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

    <h3 class="section-title">Familles ({{ familyProgress.filter((f) => f.landed >= f.total).length }}/{{ familyProgress.length }})</h3>
    <ul class="family-list">
      <li
        v-for="family in familyProgress"
        :key="family.id"
        :class="{ 'family-list--done': family.landed >= family.total }"
      >
        <span class="family-list__name">{{ family.name }}</span>
        <span class="family-list__bar">
          <span
            class="family-list__fill"
            :style="{ width: `${family.total ? (family.landed / family.total) * 100 : 0}%` }"
          />
        </span>
        <span class="family-list__count">{{ family.landed }}/{{ family.total }}</span>
      </li>
    </ul>

    <h3 class="section-title">Badges</h3>
    <div class="badges">
      <div
        v-for="badge in allBadges"
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
        {{ confirmingReset ? "Confirmer" : "Réinitialiser la progression" }}
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

.family-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 260px;
  overflow-y: auto;
  margin-bottom: 6px;
}

.family-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--panel);
  border: 1px solid var(--line);
  font-size: 13px;
  color: var(--text-dim);
}

.family-list--done {
  color: var(--text);
}

.family-list__name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.family-list__bar {
  flex: 1 1 60px;
  min-width: 40px;
  height: 6px;
  border-radius: 999px;
  background: rgba(var(--fg-rgb), 0.08);
  overflow: hidden;
}

.family-list__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--red-deep), var(--red));
}

.family-list--done .family-list__fill {
  background: var(--green-hi);
}

.family-list__count {
  flex: none;
  font-family: var(--font-display);
  font-size: 12px;
  color: var(--red-hi);
  white-space: nowrap;
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
  .badges {
    grid-template-columns: 1fr;
  }
}
</style>