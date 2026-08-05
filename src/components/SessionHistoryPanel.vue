<script setup>
import { computed, ref, watch } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import AttemptsChart from "./AttemptsChart.vue";
import ComboChainChart from "./ComboChainChart.vue";
import SessionSummary from "./SessionSummary.vue";
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
  vsMatchHistory,
  vsRecord,
  collection,
  uniqueTrickCount,
  earnedBadges,
  allBadges,
  careerProgress,
  drillList,
  drillMasteredHistory,
  drillSuggestions,
  addDrillEntry,
  removeDrillEntry,
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

const expandedComboId = ref(null);
function toggleCombo(id) {
  expandedComboId.value = expandedComboId.value === id ? null : id;
}

// Oldest-first for the chart (comboRunHistory itself is newest-first,
// which reads naturally as a list but backwards as a timeline).
const comboRunsChronological = computed(() => [...comboRunHistory.value].reverse());

function formatDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const showMonthlyReport = ref(false);

// ---- Drill -----------------------------------------------------------
const drillSuggestionList = computed(() => drillSuggestions(8));

function onAddSuggestion(suggestion) {
  addDrillEntry({
    trickName: suggestion.trickName,
    entry: suggestion.entry,
    source: "auto",
  });
}

function onRemoveDrillEntry(id) {
  removeDrillEntry(id);
}

// ---- Tabs -------------------------------------------------------------
const TABS = [
  { id: "apercu", label: "Aperçu" },
  { id: "sessions", label: "Sessions" },
  { id: "trick", label: "Par trick" },
  { id: "switchup", label: "Switch up" },
  { id: "combos", label: "Combos" },
  { id: "vs", label: "BLADE VS" },
  { id: "drill", label: "Drill" },
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
// including tricks you've tried but never once landed. `failed` is
// every "Raté" tap that didn't end in a land — whether the trick was
// eventually landed after those, or skipped instead.
const allTouchedTricks = computed(() =>
  Object.entries(collection.tricks)
    .map(([name, stats]) => ({
      name,
      landed: stats.landed,
      skipped: stats.skipped,
      failed: stats.failed || 0,
    }))
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

// '' = tous, 'landed' = réussis au moins une fois, 'never' = tentés
// (raté ou passé) mais jamais réussis.
const trickStatusFilter = ref("");

const filteredTouchedTricks = computed(() => {
  if (trickStatusFilter.value === "landed") {
    return allTouchedTricks.value.filter((t) => t.landed > 0);
  }
  if (trickStatusFilter.value === "never") {
    return allTouchedTricks.value.filter((t) => t.landed === 0);
  }
  return allTouchedTricks.value;
});

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

// ---- Switch up -------------------------------------------------------
// Same "1er trick" grouping this used to do as its own standalone
// panel — every switch-up's trickName is "<first trick> to <...>", so
// the first trick is just everything before that first " to ".
function firstTrickOf(trickName) {
  return trickName.split(" to ")[0];
}

const switchUpFirstTrickOptions = computed(() => {
  const counts = {};
  for (const land of switchUpLands.value) {
    const name = firstTrickOf(land.trickName);
    counts[name] = (counts[name] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const selectedFirstTrick = ref(null);
watch(
  switchUpFirstTrickOptions,
  (list) => {
    if (!list.length) {
      selectedFirstTrick.value = null;
      return;
    }
    if (!list.some((o) => o.name === selectedFirstTrick.value)) {
      selectedFirstTrick.value = list[0].name;
    }
  },
  { immediate: true }
);

// Every distinct switch-up starting from the selected first trick —
// same shape as allTouchedTricks above (Par trick), just scoped down
// to this one first-trick's switch-ups, most-attempted first.
const switchUpTrickOptions = computed(() => {
  if (!selectedFirstTrick.value) {
    return [];
  }
  const names = new Set(
    switchUpLands.value
      .filter((l) => firstTrickOf(l.trickName) === selectedFirstTrick.value)
      .map((l) => l.trickName)
  );
  return [...names]
    .map(
      (name) =>
        allTouchedTricks.value.find((t) => t.name === name) || {
          name,
          landed: 0,
          skipped: 0,
          failed: 0,
        }
    )
    .sort((a, b) => b.landed + b.skipped - (a.landed + a.skipped));
});

const selectedSwitchUpTrick = ref(null);
watch(
  switchUpTrickOptions,
  (list) => {
    if (!list.length) {
      selectedSwitchUpTrick.value = null;
      return;
    }
    if (!list.some((o) => o.name === selectedSwitchUpTrick.value)) {
      selectedSwitchUpTrick.value = list[0].name;
    }
  },
  { immediate: true }
);

// Same three "Par trick" elements (stats, chart, sessions it appeared
// in), just reading from selectedSwitchUpTrick instead of trickSearch.
const selectedSwitchUpStats = computed(
  () => allTouchedTricks.value.find((t) => t.name === selectedSwitchUpTrick.value) || null
);
const selectedSwitchUpChartSeries = computed(
  () => rankedTricks.value.find((t) => t.name === selectedSwitchUpTrick.value) || null
);
const selectedSwitchUpSessions = computed(() => {
  if (!selectedSwitchUpTrick.value) {
    return [];
  }
  const ids = new Set(
    collection.lands
      .filter((l) => l.trickName === selectedSwitchUpTrick.value)
      .map((l) => l.sessionId)
  );
  return sessionHistory.value.filter((s) => ids.has(s.id));
});

// Default the search to the most-repeated trick, same starting point
// the old "Progression" chart used, and keep it valid if the ranking
// changes (e.g. right after landing a new repeat) — or if the status
// filter changes and the current pick falls outside it.
watch(
  [allTouchedTricks, trickStatusFilter],
  ([list]) => {
    const filtered = filteredTouchedTricks.value;
    if (!filtered.length) {
      trickSearch.value = "";
      return;
    }
    if (!filtered.some((t) => t.name === trickSearch.value)) {
      const topRanked = rankedTricks.value.find((t) =>
        filtered.some((f) => f.name === t.name)
      );
      trickSearch.value = (topRanked || filtered[0]).name;
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
        <div class="filters">
          <select class="select" v-model="trickStatusFilter">
            <option value="">Tous les tricks</option>
            <option value="landed">Réussis au moins une fois</option>
            <option value="never">Jamais réussis (raté ou passé)</option>
          </select>
        </div>

        <p v-if="!filteredTouchedTricks.length" class="hint">
          Aucun trick ne correspond à ce filtre.
        </p>
        <div v-else class="trick-picker">
          <select class="select" v-model="trickSearch">
            <option v-for="trick in filteredTouchedTricks" :key="trick.name" :value="trick.name">
              {{ trick.name }} &mdash; {{ trick.landed }} réussi{{ trick.landed > 1 ? "s" : "" }},
              {{ trick.failed }} raté{{ trick.failed > 1 ? "s" : "" }},
              {{ trick.skipped }} passé{{ trick.skipped > 1 ? "s" : "" }}
            </option>
          </select>
        </div>

        <template v-if="selectedTrickStats">
          <p v-if="selectedTrickStats.landed === 0" class="hint trick-detail__never">
            {{ selectedTrickStats.failed }} raté{{ selectedTrickStats.failed > 1 ? "s" : "" }},
            {{ selectedTrickStats.skipped }} passé{{ selectedTrickStats.skipped > 1 ? "s" : "" }}
            &mdash; jamais réussi.
          </p>
          <template v-else>
            <AttemptsChart v-if="selectedTrickChartSeries" :series="selectedTrickChartSeries" />
            <p v-else class="hint">
              Réussi {{ selectedTrickStats.landed }} fois &mdash; pas encore assez
              de répétitions pour un graphique (il en faut au moins 2).
            </p>
            <p v-if="selectedTrickStats.failed" class="trick-detail__failed">
              {{ selectedTrickStats.failed }} raté{{ selectedTrickStats.failed > 1 ? "s" : "" }}
              au total avant d'y arriver.
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
            <span class="never-landed__count">
              <template v-if="trick.failed">{{ trick.failed }} raté{{ trick.failed > 1 ? "s" : "" }} &middot; </template
              >{{ trick.skipped }} passé{{ trick.skipped > 1 ? "s" : "" }}
            </span>
          </button>
        </div>
      </template>
    </section>

    <!-- Switch up -->
    <section v-else-if="activeTab === 'switchup'">
      <p v-if="!switchUpFirstTrickOptions.length" class="hint">
        Pas encore de switch-up réussi &mdash; ils apparaîtront ici une fois
        que tu en auras réussi un.
      </p>
      <template v-else>
        <div class="filters">
          <select class="select" v-model="selectedFirstTrick">
            <option v-for="opt in switchUpFirstTrickOptions" :key="opt.name" :value="opt.name">
              1er trick : {{ opt.name }} ({{ opt.count }})
            </option>
          </select>
        </div>

        <div class="trick-picker">
          <select class="select" v-model="selectedSwitchUpTrick">
            <option v-for="trick in switchUpTrickOptions" :key="trick.name" :value="trick.name">
              {{ trick.name }} &mdash; {{ trick.landed }} réussi{{ trick.landed > 1 ? "s" : "" }},
              {{ trick.failed }} raté{{ trick.failed > 1 ? "s" : "" }},
              {{ trick.skipped }} passé{{ trick.skipped > 1 ? "s" : "" }}
            </option>
          </select>
        </div>

        <template v-if="selectedSwitchUpStats">
          <p v-if="selectedSwitchUpStats.landed === 0" class="hint trick-detail__never">
            {{ selectedSwitchUpStats.failed }} raté{{ selectedSwitchUpStats.failed > 1 ? "s" : "" }},
            {{ selectedSwitchUpStats.skipped }} passé{{ selectedSwitchUpStats.skipped > 1 ? "s" : "" }}
            &mdash; jamais réussi.
          </p>
          <template v-else>
            <AttemptsChart v-if="selectedSwitchUpChartSeries" :series="selectedSwitchUpChartSeries" />
            <p v-else class="hint">
              Réussi {{ selectedSwitchUpStats.landed }} fois &mdash; pas encore assez
              de répétitions pour un graphique (il en faut au moins 2).
            </p>
            <p v-if="selectedSwitchUpStats.failed" class="trick-detail__failed">
              {{ selectedSwitchUpStats.failed }} raté{{ selectedSwitchUpStats.failed > 1 ? "s" : "" }}
              au total avant d'y arriver.
            </p>
          </template>

          <p v-if="selectedSwitchUpSessions.length" class="trick-detail__sessions-title">
            Apparu dans {{ selectedSwitchUpSessions.length }} session{{
              selectedSwitchUpSessions.length > 1 ? "s" : ""
            }} :
          </p>
          <div v-if="selectedSwitchUpSessions.length" class="sessions">
            <div v-for="session in selectedSwitchUpSessions" :key="session.id" class="session-card">
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

        <ComboChainChart :runs="comboRunsChronological" />

        <h3 class="section-title">Runs</h3>
        <div class="sessions">
          <div v-for="run in comboRunHistory" :key="run.id" class="session-card">
            <button class="session-card__row" @click="toggleCombo(run.id)">
              <span class="session-card__main">
                <span class="session-card__date">{{ formatDate(run.endedAt) }}</span>
                <span class="session-card__label">{{ run.label }}</span>
              </span>
              <span class="session-card__stats">
                chaîne de {{ run.chain }}
                <template v-if="run.cleared"> &middot; terminé ✓</template>
              </span>
              <AppIcon
                name="forward"
                :size="14"
                :class="{ 'session-card__chevron--open': expandedComboId === run.id }"
                class="session-card__chevron"
              />
            </button>
            <div v-if="expandedComboId === run.id" class="session-card__detail combo-detail">
              <p v-if="run.cleared">
                Chemin entièrement terminé — les {{ run.chain }} tricks du parcours
                landés sans une seule chaîne cassée. ✓
              </p>
              <p v-else-if="run.endedOnTrick">
                Arrêté sur <strong>{{ run.endedOnTrick }}</strong> après une chaîne
                de {{ run.chain }} &mdash; deux essais ratés d'affilée dessus.
              </p>
              <p v-else>
                Chaîne de {{ run.chain }}, run interrompu.
              </p>
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- BLADE VS -->
    <section v-else-if="activeTab === 'vs'">
      <p v-if="!vsMatchHistory.length" class="hint">
        Pas encore de match BLADE VS terminé &mdash; lance-en un pour voir
        ton historique apparaître ici.
      </p>
      <template v-else>
        <div class="stat-grid vs-record">
          <div class="stat-tile">
            <span class="stat-tile__value">{{ vsRecord.wins }}</span>
            <span class="stat-tile__label">victoires</span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile__value">{{ vsRecord.losses }}</span>
            <span class="stat-tile__label">défaites</span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile__value">{{ vsRecord.draws }}</span>
            <span class="stat-tile__label">nuls</span>
          </div>
        </div>

        <h3 class="section-title">Matchs</h3>
        <div class="sessions">
          <div v-for="match in vsMatchHistory" :key="match.id" class="session-card">
            <div
              class="session-card__row combo-run-row"
              :class="{
                'vs-match--win': match.result === 'win',
                'vs-match--loss': match.result === 'loss',
              }"
            >
              <span class="session-card__date">{{ formatDate(match.endedAt) }}</span>
              <span class="session-card__stats">
                {{
                  match.result === "win"
                    ? "Victoire"
                    : match.result === "loss"
                      ? "Défaite"
                      : "Match nul"
                }}
                &middot; {{ match.playerLetters }}-{{ match.robotLetters }}
                <template v-if="match.robotChance !== null">
                  &middot; robot {{ match.robotChance }}%
                </template>
              </span>
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- Drill -->
    <section v-else-if="activeTab === 'drill'">
      <h3 class="section-title">En cours</h3>
      <p v-if="!drillList.length" class="hint">
        Ta liste Drill est vide. Ajoute un trick depuis le bouton "+ Drill"
        sur l'écran de tirage (n'importe quel mode), ou accepte une
        suggestion ci-dessous.
      </p>
      <div v-else class="drill-list">
        <div v-for="drill in drillList" :key="drill.id" class="drill-card">
          <div class="drill-card__top">
            <span class="drill-card__name">{{ drill.trickName }}</span>
            <button
              class="drill-card__remove"
              aria-label="Retirer du Drill"
              @click="onRemoveDrillEntry(drill.id)"
            >
              <AppIcon name="close" :size="14" />
            </button>
          </div>
          <div class="drill-card__bars">
            <div class="drill-bar">
              <div class="drill-bar__track">
                <div
                  class="drill-bar__fill"
                  :style="{ width: Math.min(100, (drill.totalLanded / drill.targetTotal) * 100) + '%' }"
                />
              </div>
              <span class="drill-bar__label">
                {{ Math.min(drill.totalLanded, drill.targetTotal) }}/{{ drill.targetTotal }} au total
              </span>
            </div>
            <div class="drill-bar">
              <div class="drill-bar__track">
                <div
                  class="drill-bar__fill drill-bar__fill--streak"
                  :style="{ width: Math.min(100, (drill.bestStreak / drill.targetStreak) * 100) + '%' }"
                />
              </div>
              <span class="drill-bar__label">
                meilleure série {{ Math.min(drill.bestStreak, drill.targetStreak) }}/{{ drill.targetStreak }}
                <template v-if="drill.currentStreak > 0">
                  (série en cours : {{ drill.currentStreak }})
                </template>
              </span>
            </div>
          </div>
        </div>
      </div>

      <h3 class="section-title">Suggestions</h3>
      <p v-if="!drillSuggestionList.length" class="hint">
        Rien à suggérer pour l'instant &mdash; reviens après avoir tenté
        quelques tricks plusieurs fois.
      </p>
      <div v-else class="drill-list">
        <div v-for="s in drillSuggestionList" :key="s.trickName" class="drill-card drill-card--suggestion">
          <div class="drill-card__top">
            <span class="drill-card__name">{{ s.trickName }}</span>
            <button class="btn btn--ghost drill-card__add" @click="onAddSuggestion(s)">
              + Drill
            </button>
          </div>
          <p class="drill-card__stats">
            {{ s.landed }} réussi{{ s.landed > 1 ? "s" : "" }} &middot;
            {{ s.failed }} raté{{ s.failed > 1 ? "s" : "" }} &middot;
            {{ s.skipped }} passé{{ s.skipped > 1 ? "s" : "" }}
          </p>
        </div>
      </div>

      <h3 class="section-title">Domptés</h3>
      <p v-if="!drillMasteredHistory.length" class="hint">
        Pas encore de trick complètement dompté via Drill.
      </p>
      <div v-else class="drill-list">
        <div v-for="m in drillMasteredHistory" :key="m.id" class="drill-card drill-card--mastered">
          <div class="drill-card__top">
            <span class="drill-card__name">{{ m.trickName }}</span>
            <AppIcon name="trophy" :size="16" />
          </div>
          <p class="drill-card__stats">
            {{ formatDate(m.completedAt) }} &middot; {{ m.targetTotal }} réussis,
            {{ m.targetStreak }} d'affilée
          </p>
        </div>
      </div>
    </section>

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
.trick-detail__failed {
  color: var(--text-dim);
  font-size: 13px;
  margin: 8px 0 0;
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

.vs-record {
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 8px;
}

.vs-match--win .session-card__stats {
  color: var(--green-hi);
}
.vs-match--loss .session-card__stats {
  color: var(--danger-hi);
}

.combo-detail {
  font-size: 14px;
  color: var(--text-dim);
}
.combo-detail strong {
  color: var(--red-hi);
}

.drill-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}
.drill-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--panel);
}
.drill-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.drill-card__name {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.drill-card__remove {
  flex: none;
  color: var(--text-dim);
  padding: 4px;
}
.drill-card__add {
  flex: none;
  font-size: 12px;
  padding: 6px 12px;
}
.drill-card__stats {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-dim);
}
.drill-card--mastered .drill-card__top {
  color: var(--red-hi);
}
.drill-card__bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}
.drill-bar__track {
  height: 8px;
  border-radius: 999px;
  background: var(--bg-1);
  border: 1px solid var(--line);
  overflow: hidden;
}
.drill-bar__fill {
  height: 100%;
  background: var(--red-hi);
  box-shadow: var(--glow-red-hi);
  transition: width 0.3s ease;
}
.drill-bar__fill--streak {
  background: var(--green-hi);
  box-shadow: none;
}
.drill-bar__label {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-dim);
}
</style>