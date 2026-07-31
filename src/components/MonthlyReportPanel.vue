<script setup>
import { computed, ref } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import { useCollection } from "../composables/useCollection.js";

defineEmits(["close"]);

const { monthlyReport, monthsWithActivity } = useCollection();

// Defaults to the most recent month with any activity at all (not
// necessarily the calendar's current month — nothing to show for this
// month yet shouldn't open on a wall of zeroes when last month has
// real data).
const months = monthsWithActivity;
const currentIndex = ref(0);
const monthKey = computed(() => months.value[currentIndex.value] ?? null);
const report = computed(() => (monthKey.value ? monthlyReport(monthKey.value) : null));

const canGoNewer = computed(() => currentIndex.value > 0);
const canGoOlder = computed(() => currentIndex.value < months.value.length - 1);

function formatMonthLabel(key) {
  if (!key) return "";
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1)
    .toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
}

function formatDay(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}
</script>

<template>
  <AppModal title="Rapport mensuel" @close="$emit('close')">
    <div v-if="!months.length" class="empty">
      Pas encore assez de tricks réussis pour un rapport — reviens après
      quelques sessions.
    </div>

    <template v-else>
      <div class="month-nav">
        <button
          class="btn btn--ghost month-nav__btn"
          :disabled="!canGoOlder"
          @click="currentIndex += 1"
        >
          <AppIcon name="forward" :size="14" style="transform: scaleX(-1)" /> Précédent
        </button>
        <span class="month-nav__label">{{ formatMonthLabel(monthKey) }}</span>
        <button
          class="btn btn--ghost month-nav__btn"
          :disabled="!canGoNewer"
          @click="currentIndex -= 1"
        >
          Suivant <AppIcon name="forward" :size="14" />
        </button>
      </div>

      <div class="stats">
        <div class="stat">
          <span class="stat__value">{{ report.totalLands }}</span>
          <span class="stat__label">tricks réussis</span>
        </div>
        <div class="stat">
          <span class="stat__value">{{ report.daysPracticed }}</span>
          <span class="stat__label">jours pratiqués</span>
        </div>
        <div class="stat">
          <span class="stat__value">{{ report.totalScore }}</span>
          <span class="stat__label">points</span>
        </div>
      </div>

      <div v-if="report.bestDay" class="highlight">
        <AppIcon name="zap" :size="16" />
        Meilleur jour : <strong>{{ formatDay(report.bestDay.date) }}</strong>
        ({{ report.bestDay.count }} trick{{ report.bestDay.count === 1 ? "" : "s" }})
      </div>

      <section v-if="report.topTricks.length" class="section">
        <h3 class="section__title">Tricks les plus travaillés</h3>
        <ol class="top-tricks">
          <li v-for="trick in report.topTricks" :key="trick.name">
            <span class="top-tricks__name">{{ trick.name }}</span>
            <span class="top-tricks__count">×{{ trick.count }}</span>
          </li>
        </ol>
      </section>

      <section v-if="report.badgesEarned.length" class="section">
        <h3 class="section__title">
          Badges débloqués ({{ report.badgesEarned.length }})
        </h3>
        <ul class="badge-list">
          <li v-for="badge in report.badgesEarned" :key="badge.id">
            <AppIcon name="zap" :size="14" /> {{ badge.name }}
          </li>
        </ul>
      </section>

      <section v-if="report.familiesCompleted.length" class="section">
        <h3 class="section__title">
          Familles terminées ({{ report.familiesCompleted.length }})
        </h3>
        <ul class="badge-list">
          <li v-for="family in report.familiesCompleted" :key="family.id">
            <AppIcon name="check" :size="14" /> {{ family.name }}
          </li>
        </ul>
      </section>

      <p class="hint">
        {{ report.sessionsCount }} session{{ report.sessionsCount === 1 ? "" : "s" }},
        {{ report.totalTries }} essai{{ report.totalTries === 1 ? "" : "s" }} au total
        ce mois-ci.
      </p>
    </template>
  </AppModal>
</template>

<style scoped>
.empty {
  padding: 20px 4px;
  color: var(--text-dim);
  text-align: center;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}

.month-nav__label {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
  text-align: center;
  flex: 1;
}

.month-nav__btn {
  font-size: 12px;
  padding: 8px 10px;
  white-space: nowrap;
}

.stats {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
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
  font-size: 11px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.highlight {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
  font-size: 14px;
  margin-bottom: 14px;
}

.section {
  margin-bottom: 16px;
}

.section__title {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-dim);
  margin: 0 0 8px;
}

.top-tricks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.top-tricks li {
  display: flex;
  justify-content: space-between;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  font-size: 14px;
}

.top-tricks__count {
  color: var(--text-dim);
  font-weight: 700;
}

.badge-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.badge-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  font-size: 14px;
}

.hint {
  color: var(--text-dim);
  font-size: 13px;
  text-align: center;
}
</style>