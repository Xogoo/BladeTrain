<script setup>
import { computed, ref, watch } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import AttemptsChart from "./AttemptsChart.vue";
import SessionSummary from "./SessionSummary.vue";
import { useCollection } from "../composables/useCollection.js";

defineEmits(["close"]);

const { sessionHistory, repeatedTrickSeries, resetCollection } = useCollection();

const confirmingReset = ref(false);
const onReset = () => {
  if (!confirmingReset.value) {
    confirmingReset.value = true;
    return;
  }
  resetCollection();
  confirmingReset.value = false;
};

const expandedId = ref(null);
function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Tricks landed 2+ times, most-practiced first — this ordering is what
// drives both the pill list and the default selection below.
const rankedTricks = computed(() =>
  [...repeatedTrickSeries.value].sort((a, b) => b.tries.length - a.tries.length)
);

// Which trick's line is currently on screen. Only one at a time, by
// design — several overlapping lines got unreadable once a handful of
// tricks were repeated across sessions.
const selectedName = ref(null);

// Default to the most-repeated trick, and keep the selection valid if
// the ranking changes (e.g. right after landing a new repeat).
watch(
  rankedTricks,
  (list) => {
    if (!list.length) {
      selectedName.value = null;
      return;
    }
    if (!list.some((t) => t.name === selectedName.value)) {
      selectedName.value = list[0].name;
    }
  },
  { immediate: true }
);

const selectedSeries = computed(
  () => rankedTricks.value.find((t) => t.name === selectedName.value) || null
);
</script>

<template>
  <AppModal title="Historique" @close="$emit('close')">
    <h3 class="section-title">Progression</h3>

    <div v-if="rankedTricks.length" class="trick-picker">
      <button
        v-for="trick in rankedTricks"
        :key="trick.name"
        class="trick-picker__pill"
        :class="{ 'trick-picker__pill--active': trick.name === selectedName }"
        @click="selectedName = trick.name"
      >
        {{ trick.name }}
        <span class="trick-picker__count">&times;{{ trick.tries.length }}</span>
      </button>
    </div>

    <AttemptsChart :series="selectedSeries" />

    <h3 class="section-title">Sessions</h3>
    <p v-if="!sessionHistory.length" class="hint">
      Pas encore de session solo &mdash; ton historique apparaîtra ici une fois que tu auras joué.
    </p>
    <div v-else class="sessions">
      <div v-for="session in sessionHistory" :key="session.id" class="session-card">
        <button class="session-card__row" @click="toggle(session.id)">
          <span class="session-card__date">{{ formatDate(session.startedAt) }}</span>
          <span class="session-card__stats">
            {{ session.landed }} réussis &middot; {{ session.skipped }} passés
          </span>
          <AppIcon
            name="forward"
            :size="14"
            :class="{ 'session-card__chevron--open': expandedId === session.id }"
            class="session-card__chevron"
          />
        </button>
        <div v-if="expandedId === session.id" class="session-card__detail">
          <SessionSummary :session-id="session.id" />
        </div>
      </div>
    </div>

    <div class="actions">
      <button
        class="btn btn--ghost reset-btn"
        :class="{ 'reset-btn--confirm': confirmingReset }"
        @click="onReset"
        @blur="confirmingReset = false"
      >
        {{ confirmingReset ? "Retape pour tout effacer" : "Réinitialiser l'historique" }}
      </button>
    </div>
  </AppModal>
</template>

<style scoped>
.section-title {
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--red-hi);
  margin: 18px 0 10px;
}
.section-title:first-child {
  margin-top: 0;
}
.hint {
  color: var(--text-dim);
  font-size: 14px;
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

/* Trick selector: horizontally scrollable pills, most-repeated first.
   Same visual language as .app-nav__btn so it doesn't feel like a
   different UI kit was dropped into the History panel. */
.trick-picker {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 10px;
  margin-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}
.trick-picker::-webkit-scrollbar {
  height: 4px;
}
.trick-picker__pill {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text-dim);
  font-family: var(--font-display);
  font-size: 12px;
  white-space: nowrap;
  transition: color 0.2s ease, border-color 0.2s ease;
}
.trick-picker__pill--active {
  color: var(--red-hi);
  border-color: var(--red-hi);
  box-shadow: var(--glow-red-hi);
}
.trick-picker__count {
  opacity: 0.7;
  font-size: 11px;
}

.sessions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.session-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}
.session-card__row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--panel);
  text-align: left;
}
.session-card__date {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--text);
}
.session-card__stats {
  margin-left: auto;
  font-size: 13px;
  color: var(--text-dim);
}
.session-card__chevron {
  flex: none;
  color: var(--red-hi);
  transform: rotate(90deg);
  transition: transform 0.2s ease;
}
.session-card__chevron--open {
  transform: rotate(-90deg);
}
.session-card__detail {
  padding: 14px;
  border-top: 1px solid var(--line);
  background: var(--bg-2);
}
</style>
