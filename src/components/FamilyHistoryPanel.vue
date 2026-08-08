<script setup>
import { computed } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import AttemptsChart from "./AttemptsChart.vue";
import { useCollection } from "../composables/useCollection.js";
import { resolveFamily } from "../game/families.js";
import { nameEntry } from "../game/trickGenerator.js";
import { useSettings } from "../composables/useSettings.js";

const props = defineProps({
  familyId: { type: String, required: true },
});
defineEmits(["close"]);

const { settings } = useSettings();
const { familyLifetimeEntryStatuses, familyTriesSeries } = useCollection();

const family = computed(() => resolveFamily(props.familyId, settings.customFamilies));

function familyBaseName(name) {
  return name.replace(/ \((Normal|Switch)\)$/, "");
}

// This panel is only ever opened from the plain "Familles de tricks"
// picker (never from within Carrière itself) — a lifetime report, not
// an active session's own checklist (that's FamilyChecklistPanel,
// which resets every session outside Career — see its own comment).
// "Have I ever landed this trick, in any mode/session" is exactly what
// a history report should answer, so this always reads
// familyLifetimeEntryStatuses regardless of how any particular session
// happened to be scored.
const statuses = computed(() =>
  family.value ? familyLifetimeEntryStatuses(family.value) : []
);
const landed = computed(() => statuses.value.filter((s) => s.landed));
const notLanded = computed(() => statuses.value.filter((s) => !s.landed));

const triesSeries = computed(() =>
  family.value ? familyTriesSeries(family.value.id) : []
);
const chartSeries = computed(() =>
  family.value ? { name: family.value.name, tries: triesSeries.value } : null
);

const avgTries = computed(() => {
  if (!triesSeries.value.length) {
    return null;
  }
  const sum = triesSeries.value.reduce((a, b) => a + b, 0);
  return Math.round((sum / triesSeries.value.length) * 10) / 10;
});

const totalSkips = computed(() =>
  statuses.value.reduce((sum, s) => sum + s.skipCount, 0)
);

// The trick that took the most tries — a fun/useful "your nemesis in
// this family" callout, only shown once there's actually a landed
// trick with more than one try to point to.
const hardestTrick = computed(() => {
  const candidates = landed.value.filter((s) => s.land && s.land.tries > 1);
  if (!candidates.length) {
    return null;
  }
  return candidates.reduce((worst, s) => (s.land.tries > worst.land.tries ? s : worst));
});

function displayName(status) {
  return status.land ? status.land.trickName : nameEntry(status.entry);
}

// The trick(s) that took the fewest tries to land — the "best
// mastered" counterpart to "Le plus dur" below. Ties (several tricks
// landed in the same fewest number of tries) are all shown together.
const bestTries = computed(() => {
  const candidates = landed.value.filter((s) => s.land);
  if (!candidates.length) {
    return null;
  }
  return Math.min(...candidates.map((s) => s.land.tries));
});
const easiestTricks = computed(() => {
  if (bestTries.value === null) {
    return [];
  }
  return landed.value.filter((s) => s.land && s.land.tries === bestTries.value);
});
</script>

<template>
  <AppModal
    :title="family ? `Historique — ${familyBaseName(family.name)}` : 'Historique'"
    @close="$emit('close')"
  >
    <template v-if="family">
      <div class="history-stats">
        <div class="history-stat">
          <span class="history-stat__value">{{ landed.length }}/{{
            family.entries.length
          }}</span>
          <span class="history-stat__label">réussis</span>
        </div>
        <div class="history-stat">
          <span class="history-stat__value">{{ avgTries ?? "—" }}</span>
          <span class="history-stat__label">essais moy.</span>
        </div>
        <div class="history-stat">
          <span class="history-stat__value">{{ totalSkips }}</span>
          <span class="history-stat__label">passés</span>
        </div>
      </div>

      <p v-if="!notLanded.length" class="history-complete">
        <AppIcon name="check" :size="16" /> Famille complétée
      </p>

      <p v-if="hardestTrick" class="history-hardest">
        <AppIcon name="zap" :size="14" />
        Le plus dur : <strong>{{ displayName(hardestTrick) }}</strong> ({{
          hardestTrick.land.tries
        }}
        essais)
      </p>

      <p v-if="easiestTricks.length" class="history-easiest">
        <AppIcon name="check" :size="14" />
        Le mieux maîtrisé{{ easiestTricks.length > 1 ? "s" : "" }} :
        <strong>{{ easiestTricks.map(displayName).join(", ") }}</strong>
        ({{ bestTries }} essai{{ bestTries === 1 ? "" : "s" }})
      </p>

      <h3 class="section-title">Progression</h3>
      <AttemptsChart :series="chartSeries" />

      <h3 class="section-title">Réussis ({{ landed.length }})</h3>
      <p v-if="!landed.length" class="hint">Rien encore — à toi de jouer.</p>
      <div v-else class="trick-list">
        <div v-for="status in landed" :key="displayName(status)" class="trick-row trick-row--done">
          <AppIcon name="check" :size="14" />
          <span class="trick-row__name">{{ displayName(status) }}</span>
          <span v-if="status.land" class="trick-row__meta">
            {{ status.land.tries }} essai{{ status.land.tries === 1 ? "" : "s" }}
          </span>
        </div>
      </div>

      <h3 class="section-title">Pas encore réussis ({{ notLanded.length }})</h3>
      <p v-if="!notLanded.length" class="hint">Tout est réussi !</p>
      <div v-else class="trick-list">
        <div v-for="status in notLanded" :key="displayName(status)" class="trick-row">
          <AppIcon name="lock" :size="13" />
          <span class="trick-row__name">{{ displayName(status) }}</span>
          <span class="trick-row__meta">
            ({{ status.skipCount ? `${status.skipCount} tentative${status.skipCount > 1 ? "s" : ""}` : "aucune tentative" }})
          </span>
        </div>
      </div>
    </template>
    <p v-else class="hint">Famille introuvable.</p>
  </AppModal>
</template>

<style scoped>
.history-stats {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.history-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 8px;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
}

.history-stat__value {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 900;
  color: var(--red-hi);
}

.history-stat__label {
  font-family: var(--font-display);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.history-complete {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--green-hi);
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 10px;
}

.history-hardest {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-dim);
  margin-bottom: 16px;
}
.history-hardest strong {
  color: var(--text);
}

.history-easiest {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-dim);
  margin-bottom: 16px;
}
.history-easiest strong {
  color: var(--green-hi);
}

.section-title {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--red-hi);
  margin: 18px 0 8px;
}
.section-title:first-of-type {
  margin-top: 0;
}

.hint {
  color: var(--text-dim);
  font-size: 13px;
}

.trick-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.trick-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--bg-1);
  border: 1px solid var(--line);
  color: var(--text-dim);
}

.trick-row--done {
  color: var(--green-hi);
}

.trick-row__name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text);
}

.trick-row__meta {
  flex: none;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dim);
  white-space: nowrap;
}
</style>