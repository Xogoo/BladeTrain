<script setup>
import { computed, ref, watch } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import AttemptsChart from "./AttemptsChart.vue";
import SessionSummary from "./SessionSummary.vue";
import SwitchUpHistoryPanel from "./SwitchUpHistoryPanel.vue";
import MonthlyReportPanel from "./MonthlyReportPanel.vue";
import { useCollection } from "../composables/useCollection.js";

defineEmits(["close"]);

const {
  sessionHistory,
  repeatedTrickSeries,
  switchUpLands,
  resetCollection,
  comboRunHistory,
  bestComboChain,
  collection,
  uniqueTrickCount,
  earnedBadges,
  allBadges,
  careerProgress,
  isCareerComplete,
} = useCollection();

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

const showSwitchUps = ref(false);
const showMonthlyReport = ref(false);

// ---- Tabs -------------------------------------------------------------
const TABS = [
  { id: "apercu", label: "Aperçu" },
  { id: "sessions", label: "Sessions" },
  { id: "trick", label: "Par trick" },
  { id: "combos", label: "Combos" },
  { id: "carriere", label: "Carrière" },
];
const activeTab = ref("apercu");

// ---- Aperçu -------------------------------------------------------------
// Sessions that actually belong on the Sessions tab — Combo runs get
// their own session row too (so recordLand has somewhere to attach),
// but they're already fully represented in the Combos tab/history, so
// they're excluded here to avoid showing the same run twice.
const trainingSessions = computed(() =>
  sessionHistory.value.filter((s) => !s.label || !s.label.startsWith("Combo — "))
);

const badgeCount = computed(() => `${earnedBadges.value.length}/${allBadges.value.length}`);

// ---- Sessions (with trick + mode filters) -------------------------------

// Every distinct trick landed at least once, most-landed first —
// options for the Sessions filter. Deliberately separate from
// rankedTricks/repeatedTrickSeries below, which only cover tricks
// landed 2+ times (that's what makes a useful attempts-over-time
// chart) — a trick you've only landed once is still worth being able
// to find in Sessions.
const allTrickNames = computed(() => {
  const counts = new Map();
  for (const land of collection.lands) {
    counts.set(land.trickName, (counts.get(land.trickName) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
});

// Coarse category derived from a session's free-text label, for the
// mode filter — sessions from before labels existed (label === null)
// read as plain Solo, same as an unlabeled Custom session today.
function sessionCategory(session) {
  const label = session.label || "Solo";
  if (label.startsWith("Carrière")) return "Carrière";
  if (label.startsWith("Famille")) return "Famille";
  if (label.startsWith("Mix")) return "Mix";
  if (label.startsWith("Points faibles")) return "Points faibles";
  if (label.startsWith("Grinds à réviser")) return "Révision";
  if (label.startsWith("BLADE VS")) return "BLADE VS";
  return "Solo";
}

const sessionCategories = computed(() => {
  const seen = new Set(trainingSessions.value.map(sessionCategory));
  return [...seen].sort();
});

const sessionTrickFilter = ref("");
const sessionCategoryFilter = ref("");

const filteredSessionHistory = computed(() => {
  let list = trainingSessions.value;
  if (sessionCategoryFilter.value) {
    list = list.filter((s) => sessionCategory(s) === sessionCategoryFilter.value);
  }
  if (sessionTrickFilter.value) {
    const matchingSessionIds = new Set(
      collection.lands
        .filter((l) => l.trickName === sessionTrickFilter.value)
        .map((l) => l.sessionId)
    );
    list = list.filter((s) => matchingSessionIds.has(s.id));
  }
  return list;
});

// ---- Par trick -----------------------------------------------------------

// Tricks landed 2+ times, most-practiced first — enough data points for
// a meaningful attempts-over-time chart.
const rankedTricks = computed(() =>
  [...repeatedTrickSeries.value].sort((a, b) => b.tries.length - a.tries.length)
);

// Every trick ever touched — landed and/or skipped — most-attempted
// first. This is the full universe the "Par trick" search covers,
// including tricks you've tried but never once landed.
const allTouchedTricks = computed(() =>
  Object.entries(collection.tricks)
    .map(([name, stats]) => ({ name, landed: stats.landed, skipped: stats.skipped }))
    .sort((a, b) => b.landed + b.skipped - (a.landed + a.skipped))
);

// Tried at least once, never landed — surfaced as its own standing
// list so it's visible without having to search for anything first.
const neverLandedTricks = computed(() =>
  allTouchedTricks.value
    .filter((t) => t.landed === 0 && t.skipped > 0)
    .sort((a, b) => b.skipped - a.skipped)
);

const trickSearch = ref("");

function selectTrick(name) {
  trickSearch.value = name;
}

const selectedTrickStats = computed(
  () => allTouchedTricks.value.find((t) => t.name === trickSearch.value) || null
);

// Only set (and only meaningful) when the selected trick has been
// landed 2+ times — AttemptsChart needs a real series of tries.
const selectedTrickChartSeries = computed(
  () => rankedTricks.value.find((t) => t.name === trickSearch.value) || null
);

const selectedTrickSessions = computed(() => {
  if (!trickSearch.value) {
    return [];
  }
  const ids = new Set(
    collection.lands.filter((l) => l.trickName === trickSearch.value).map((l) => l.sessionId)
  );
  return sessionHistory.value.filter((s) => ids.has(s.id));
});

// Default the search to the most-repeated trick, same starting point
// the old "Progression" chart used, and keep it valid if the ranking
// changes (e.g. right after landing a new repeat).
watch(
  allTouchedTricks,
  (list) => {
    if (!list.length) {
      trickSearch.value = "";
      return;
    }
    if (!list.some((t) => t.name === trickSearch.value)) {
      trickSearch.value = (rankedTricks.value[0] || list[0]).name;
    }
  },
  { immediate: true }
);
</script>

<template>
  <AppModal title="Historique" @close="$emit('close')">
    <div class="tabs" role="tablist">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="tabs__btn"
        :class="{ 'tabs__btn--active': activeTab === tab.id }"
        role="tab"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Aperçu -->
    <section v-if="activeTab === 'apercu'">
      <div class="stat-grid">
        <div class="stat-tile">
          <span class="stat-tile__value">{{ uniqueTrickCount }}</span>
          <span class="stat-tile__label">tricks uniques</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">{{ trainingSessions.length }}</span>
          <span class="stat-tile__label">sessions</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">{{ bestComboChain ?? "—" }}</span>
          <span class="stat-tile__label">meilleure chaîne Combo</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">{{ careerProgress("normal").percent }}%</span>
          <span class="stat-tile__label">Carrière Normal</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">{{ careerProgress("switch").percent }}%</span>
          <span class="stat-tile__label">Carrière Switch</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">{{ badgeCount }}</span>
          <span class="stat-tile__label">badges</span>
        </div>
      </div>

      <div class="quick-links">
        <button class="btn monthly-report-teaser" @click="showMonthlyReport = true">
          <AppIcon name="zap" :size="16" /> Rapport mensuel
        </button>
        <button
          v-if="switchUpLands.length"
          class="btn switchup-teaser"
          @click="showSwitchUps = true"
        >
          <AppIcon name="list" :size="16" />
          Voir tes {{ switchUpLands.length }} switch-up{{ switchUpLands.length === 1 ? "" : "s" }}
        </button>
      </div>

      <div class="actions">
        <button
          class="btn btn--ghost reset-btn"
          :class="{ 'reset-btn--confirm': confirmingReset }"
          @click="onReset"
          @blur="confirmingReset = false"
        >
          {{ confirmingReset ? "Confirmer" : "Réinitialiser l'historique" }}
        </button>
      </div>
    </section>

    <!-- Sessions -->
    <section v-else-if="activeTab === 'sessions'">
      <p v-if="!trainingSessions.length" class="hint">
        Pas encore de session &mdash; ton historique apparaîtra ici une fois
        que tu auras joué.
      </p>
      <template v-else>
        <div class="filters">
          <select class="select" v-model="sessionCategoryFilter">
            <option value="">Tous les modes</option>
            <option v-for="cat in sessionCategories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <select class="select" v-model="sessionTrickFilter">
            <option value="">Tous les tricks</option>
            <option v-for="trick in allTrickNames" :key="trick.name" :value="trick.name">
              {{ trick.name }} &times;{{ trick.count }}
            </option>
          </select>
        </div>
        <p v-if="!filteredSessionHistory.length" class="hint">
          Aucune session ne correspond à ce filtre.
        </p>
        <div v-else class="sessions">
          <div v-for="session in filteredSessionHistory" :key="session.id" class="session-card">
            <button class="session-card__row" @click="toggle(session.id)">
              <span class="session-card__main">
                <span class="session-card__date">{{ formatDate(session.startedAt) }}</span>
                <span v-if="session.label" class="session-card__label">{{ session.label }}</span>
              </span>
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
      </template>
    </section>

    <!-- Par trick -->
    <section v-else-if="activeTab === 'trick'">
      <p v-if="!allTouchedTricks.length" class="hint">
        Rien à afficher pour l'instant &mdash; réussis ou passe quelques
        tricks pour voir cette page se remplir.
      </p>
      <template v-else>
        <div class="trick-picker">
          <select class="select" v-model="trickSearch">
            <option v-for="trick in allTouchedTricks" :key="trick.name" :value="trick.name">
              {{ trick.name }} &mdash; {{ trick.landed }} réussi{{ trick.landed > 1 ? "s" : "" }},
              {{ trick.skipped }} passé{{ trick.skipped > 1 ? "s" : "" }}
            </option>
          </select>
        </div>

        <template v-if="selectedTrickStats">
          <p v-if="selectedTrickStats.landed === 0" class="hint trick-detail__never">
            Tenté {{ selectedTrickStats.skipped }} fois, jamais réussi.
          </p>
          <template v-else>
            <AttemptsChart v-if="selectedTrickChartSeries" :series="selectedTrickChartSeries" />
            <p v-else class="hint">
              Réussi {{ selectedTrickStats.landed }} fois &mdash; pas encore assez
              de répétitions pour un graphique (il en faut au moins 2).
            </p>
          </template>

          <p v-if="selectedTrickSessions.length" class="trick-detail__sessions-title">
            Apparu dans {{ selectedTrickSessions.length }} session{{
              selectedTrickSessions.length > 1 ? "s" : ""
            }} :
          </p>
          <div v-if="selectedTrickSessions.length" class="sessions">
            <div v-for="session in selectedTrickSessions" :key="session.id" class="session-card">
              <button class="session-card__row" @click="toggle(session.id)">
                <span class="session-card__main">
                  <span class="session-card__date">{{ formatDate(session.startedAt) }}</span>
                  <span v-if="session.label" class="session-card__label">{{ session.label }}</span>
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
        </template>

        <h3 class="section-title">Jamais réussis</h3>
        <p v-if="!neverLandedTricks.length" class="hint">
          Rien ici &mdash; tout ce que tu as déjà tenté, tu l'as réussi au
          moins une fois.
        </p>
        <div v-else class="never-landed">
          <button
            v-for="trick in neverLandedTricks"
            :key="trick.name"
            class="never-landed__row"
            :class="{ 'never-landed__row--active': trickSearch === trick.name }"
            @click="selectTrick(trick.name)"
          >
            <span>{{ trick.name }}</span>
            <span class="never-landed__count">&times;{{ trick.skipped }}</span>
          </button>
        </div>
      </template>
    </section>

    <!-- Combos -->
    <section v-else-if="activeTab === 'combos'">
      <p v-if="!comboRunHistory.length" class="hint">
        Pas encore de Combo terminé &mdash; lance-en un depuis Carrière ou
        Mix pour voir tes runs apparaître ici.
      </p>
      <template v-else>
        <p class="combo-best">
          Meilleure chaîne : <strong>{{ bestComboChain }}</strong>
        </p>
        <div class="sessions">
          <div v-for="run in comboRunHistory" :key="run.id" class="session-card">
            <div class="session-card__row combo-run-row">
              <span class="session-card__date">{{ formatDate(run.endedAt) }}</span>
              <span class="session-card__stats">
                {{ run.label }} &middot; chaîne de {{ run.chain }}
                <template v-if="run.cleared"> &middot; chemin terminé ✓</template>
              </span>
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- Carrière -->
    <section v-else-if="activeTab === 'carriere'">
      <div class="career-track" v-for="track in ['normal', 'switch']" :key="track">
        <h3 class="section-title">{{ track === "normal" ? "Normal" : "Switch" }}</h3>
        <div class="career-track__bar">
          <div
            class="career-track__fill"
            :style="{ width: careerProgress(track).percent + '%' }"
          />
        </div>
        <p class="career-track__stats">
          {{ careerProgress(track).percent }}% &middot;
          {{ careerProgress(track).landed }}/{{ careerProgress(track).total }} tricks
          <template v-if="isCareerComplete(track)"> &middot; complète ✓</template>
        </p>
      </div>
    </section>

    <SwitchUpHistoryPanel v-if="showSwitchUps" @close="showSwitchUps = false" />
    <MonthlyReportPanel v-if="showMonthlyReport" @close="showMonthlyReport = false" />
  </AppModal>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 18px;
  padding-bottom: 2px;
}
.tabs__btn {
  flex: none;
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.06em;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text-dim);
  white-space: nowrap;
}
.tabs__btn--active {
  color: var(--red-hi);
  border-color: rgba(var(--fg-rgb), 0.6);
  box-shadow: 0 0 10px rgba(var(--fg-rgb), 0.2);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}
.stat-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 14px 8px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  text-align: center;
}
.stat-tile__value {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 900;
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
  line-height: 1;
}
.stat-tile__label {
  font-family: var(--font-display);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.quick-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 8px;
}

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
.trick-detail__never {
  margin-bottom: 14px;
}
.trick-detail__sessions-title {
  color: var(--text-dim);
  font-size: 13px;
  margin: 16px 0 8px;
}
.combo-best {
  color: var(--text-dim);
  font-size: 14px;
  margin: 0 0 10px;
}
.combo-best strong {
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

.filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

/* Trick selector: a plain dropdown, most-repeated first — the pill
   row this replaced didn't fit small screens (overflowed and needed
   horizontal scrolling to see the rest). Same select styling as the
   family picker in StartScreen, for consistency. */
.trick-picker {
  margin-bottom: 12px;
}
.trick-picker .select,
.filters .select {
  width: 100%;
  font-family: var(--font-body);
  font-size: 15px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--bg-1);
  color: var(--text);
}
/* Native <option> elements don't always inherit the select's own
   background/color on some mobile browsers, leaving unselected rows
   looking transparent until hovered — set them explicitly. */
.trick-picker .select option,
.filters .select option {
  background: var(--bg-1);
  color: var(--text);
}

.never-landed {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.never-landed__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  color: var(--text);
  font-size: 14px;
  text-align: left;
}
.never-landed__row--active {
  border-color: rgba(var(--fg-rgb), 0.6);
  color: var(--red-hi);
}
.never-landed__count {
  color: var(--text-dim);
  font-family: var(--font-display);
  font-size: 13px;
}

.switchup-teaser {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.monthly-report-teaser {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: center;
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
.session-card__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.session-card__date {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.session-card__label {
  font-size: 12px;
  color: var(--text-dim);
}
.session-card__stats {
  margin-left: auto;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-dim);
  text-align: right;
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

.career-track {
  margin-bottom: 22px;
}
.career-track__bar {
  height: 10px;
  border-radius: 999px;
  background: var(--bg-1);
  border: 1px solid var(--line);
  overflow: hidden;
}
.career-track__fill {
  height: 100%;
  background: var(--red-hi);
  box-shadow: var(--glow-red-hi);
  transition: width 0.3s ease;
}
.career-track__stats {
  margin-top: 8px;
  font-size: 14px;
  color: var(--text-dim);
}
</style>