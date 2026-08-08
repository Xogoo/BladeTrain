<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { LETTERS, useGame } from "../composables/useGame.js";
import { useSettings } from "../composables/useSettings.js";
import { useCollection } from "../composables/useCollection.js";
import { resolveFamily } from "../game/families.js";
import FamilyChecklistPanel from "./FamilyChecklistPanel.vue";
import MixChecklistPanel from "./MixChecklistPanel.vue";
import TargetedTrainingChecklistPanel from "./TargetedTrainingChecklistPanel.vue";

const { state, isSolo, isDrill, activeFamily } = useGame();
const { settings, levelName } = useSettings();
const { familyIndex, sessionFamilyEntryStatuses, sessionById, targetedTrainingItems } = useCollection();

const showChecklist = ref(false);
const showMixChecklist = ref(false);
const showTargetedChecklist = ref(false);

// Mix trains several families at once (state.activeFamilyIds) instead
// of state.activeFamilyId — activeFamily is always null for it, so
// without this it fell through to the Custom/targeted-training
// readout below, showing whatever settings.tricks happened to be left
// over from a completely different session instead of the Mix's own
// combined progress.
const mixFamilies = computed(() =>
  state.activeFamilyIds
    .map((id) => resolveFamily(id, settings.customFamilies))
    .filter(Boolean)
);
const isMix = computed(() => mixFamilies.value.length > 0);
// Scoped to THIS session, not lifetime "::practice" progress — Mix
// deliberately draws from a pool that never excludes already-landed
// entries (see useGame.js's buildMixPool), so a player can retrain
// tricks mastered long ago on purpose. Reading lifetime progress here
// made the readout permanently "done" for anything ever landed before,
// regardless of what this run actually covered — see
// MixChecklistPanel's matching fix for the same reasoning.
const mixProgress = computed(() => {
  let landed = 0;
  let total = 0;
  for (const family of mixFamilies.value) {
    const statuses = sessionFamilyEntryStatuses(family, state.sessionId);
    landed += statuses.filter((s) => s.landed).length;
    total += family.entries.length;
  }
  return `${landed}/${total}`;
});

// Career resumes lifetime progress (persisted, tricks acquired for
// good — see progressFamilyId in useGame.js). Every other context
// resets to 0 each session, same as Mix above — what's landed in an
// OLDER session, or never at all, is equally fair game again today.
const activeFamilyLanded = computed(() => {
  if (!activeFamily.value) {
    return 0;
  }
  return state.isCareerSession
    ? familyIndex(activeFamily.value.id, activeFamily.value.entries)
    : sessionFamilyEntryStatuses(activeFamily.value, state.sessionId).filter(
        (s) => s.landed
      ).length;
});

// "X/Y" for the Grinds block when there's no active family — same
// item list (standalone grinds + switch-up combos, each counted as
// ONE trick) as TargetedTrainingChecklistPanel, so the two never
// disagree. X = how many of those items have been landed, Y = how
// many exist in total for this config.
const enabledGrindsCount = computed(() => {
  const items = targetedTrainingItems(settings, state.sessionId);
  const landed = items.filter((item) => item.landed).length;
  return `${landed}/${items.length}`;
});

// Switch families carry their own leading "Switch " prefix (see
// families.js) — nothing to strip here anymore, kept as a pass-through
// in case a suffix-style annotation ever comes back.
function familyBaseName(name) {
  return name.replace(/ \((Normal|Switch)\)$/, "");
}

const pointsPop = ref(false);

const playersIn = computed(
  () => state.players.filter((p) => p.letters < LETTERS.length).length
);

watch(
  () => state.points,
  () => {
    pointsPop.value = false;
    requestAnimationFrame(() => {
      pointsPop.value = true;
    });
  }
);

// "Session en cours depuis Xmin" — a quiet reminder so it's never
// ambiguous whether you're supposed to have already wrapped up.
// Recomputed every 30s via `now` ticking, since nothing else about the
// session necessarily changes to trigger a re-render otherwise.
const now = ref(Date.now());
let nowTimer = null;
onMounted(() => {
  nowTimer = window.setInterval(() => {
    now.value = Date.now();
  }, 30000);
});
onUnmounted(() => {
  window.clearInterval(nowTimer);
});

const sessionDuration = computed(() => {
  if (!state.sessionId) {
    return null;
  }
  const session = sessionById(state.sessionId);
  if (!session) {
    return null;
  }
  const minutes = Math.max(
    0,
    Math.round((now.value - new Date(session.startedAt).getTime()) / 60000)
  );
  if (minutes < 1) {
    return "Session en cours depuis moins d'1 min";
  }
  if (minutes < 60) {
    return `Session en cours depuis ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `Session en cours depuis ${hours} h${rest ? ` ${rest} min` : ""}`;
});
</script>

<template>
  <div class="scoreboard-wrap">
    <div v-if="isSolo || isDrill" class="scoreboard panel">
      <div class="scoreboard__block">
        <span class="scoreboard__caption">Score</span>
        <span class="scoreboard__value" :class="{ pop: pointsPop }">{{ state.points }}</span>
      </div>
      <div class="scoreboard__divider" />
      <div class="scoreboard__block">
        <span class="scoreboard__caption">Tirages</span>
        <span class="scoreboard__value scoreboard__value--plain">{{
          state.spinsUsed
        }}</span>
      </div>
      <div class="scoreboard__divider" />
      <div v-if="isDrill" class="scoreboard__block">
        <span class="scoreboard__caption">Niveau</span>
        <span class="scoreboard__level">Drill</span>
      </div>
      <button
        v-else-if="activeFamily"
        class="scoreboard__block scoreboard__block--tap"
        @click="showChecklist = true"
      >
        <span class="scoreboard__caption">{{ familyBaseName(activeFamily.name) }}</span>
        <span class="scoreboard__level">
          {{ activeFamilyLanded }}/{{ activeFamily.entries.length }}
        </span>
      </button>
      <button
        v-else-if="isMix"
        class="scoreboard__block scoreboard__block--tap"
        @click="showMixChecklist = true"
      >
        <span class="scoreboard__caption">Mix ({{ mixFamilies.length }})</span>
        <span class="scoreboard__level">{{ mixProgress }}</span>
      </button>
      <button
        v-else
        class="scoreboard__block scoreboard__block--tap"
        @click="showTargetedChecklist = true"
      >
        <span class="scoreboard__caption">Tricks</span>
        <span class="scoreboard__level">
          {{ enabledGrindsCount }}
        </span>
      </button>
    </div>

    <div v-else class="scoreboard panel">
      <div class="scoreboard__block">
        <span class="scoreboard__caption">Manche</span>
        <span class="scoreboard__value">{{ state.round }}</span>
      </div>
      <div class="scoreboard__divider" />
      <div class="scoreboard__block">
        <span class="scoreboard__caption">En jeu</span>
        <span class="scoreboard__value scoreboard__value--plain">{{
          playersIn
        }}</span>
      </div>
      <div class="scoreboard__divider" />
      <div class="scoreboard__block">
        <span class="scoreboard__caption">Niveau</span>
        <span class="scoreboard__level">{{ levelName() }}</span>
      </div>
    </div>

    <p v-if="sessionDuration" class="scoreboard__duration">{{ sessionDuration }}</p>
  </div>

  <FamilyChecklistPanel
    v-if="showChecklist && activeFamily"
    :family-id="activeFamily.id"
    :is-career="state.isCareerSession"
    @close="showChecklist = false"
  />

  <MixChecklistPanel
    v-if="showMixChecklist && isMix"
    :family-ids="state.activeFamilyIds"
    @close="showMixChecklist = false"
  />

  <TargetedTrainingChecklistPanel
    v-if="showTargetedChecklist"
    @close="showTargetedChecklist = false"
  />
</template>

<style scoped>
.scoreboard-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.scoreboard__duration {
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-dim);
}

.scoreboard {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 8px 20px;
}

.scoreboard__block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 64px;
  max-width: 120px;
}

.scoreboard__block--tap {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
}

.scoreboard__caption {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scoreboard__value {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 900;
  color: var(--text);
  text-shadow: var(--glow-white);
}

.scoreboard__value.pop {
  animation: pop 0.6s ease;
}

.scoreboard__value--plain {
  color: var(--text-dim);
  text-shadow: none;
}

.scoreboard__level {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--red-hi);
  text-shadow: var(--glow-red);
  padding-top: 4px;
}

.scoreboard__divider {
  width: 1px;
  height: 34px;
  background: var(--line);
}
</style>