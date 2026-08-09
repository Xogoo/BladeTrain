<script setup>
import { computed } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import { useGame } from "../composables/useGame.js";
import { useSettings } from "../composables/useSettings.js";
import { resolveFamily, familyEntryKey } from "../game/families.js";
import { generateSpin } from "../game/trickGenerator.js";

// Self-contained, same pattern as MixChecklistPanel — reads combo
// state directly rather than receiving it as props, since it's opened
// from ScoreBoard (a sibling of GameScreen, not a parent/child).
defineEmits(["close"]);

const { state } = useGame();
const { settings } = useSettings();

function familyBaseName(name) {
  return name.replace(/ \((Normal|Switch)\)$/, "");
}

// Path entries only store the forced-trick recipe (grindName,
// variationName, ...), not the display name — this reconstructs it
// exactly, same as any other forced draw, safe to call regardless of
// the player's own live settings.
function comboEntryName(entry) {
  return generateSpin(settings.tricks, [], null, null, null, null, entry, null).name;
}

// Combo-Carrière only — Combo-Mix draws randomly from a pool, there's
// no fixed order or "next family" to count down to. Finds the
// contiguous stretch of state.comboPath belonging to the CURRENT
// trick's family, so this shows "X/Y avant la famille suivante" and
// the exact order those tricks come in — same scope as the old inline
// panel, just in a modal now.
const familySegment = computed(() => {
  if (state.comboSource !== "career" || !state.comboPath.length) {
    return null;
  }
  const current = state.comboPath[state.comboPathIndex];
  if (!current) {
    return null;
  }
  let start = state.comboPathIndex;
  while (start > 0 && state.comboPath[start - 1].familyId === current.familyId) {
    start--;
  }
  let end = state.comboPathIndex;
  while (
    end < state.comboPath.length - 1 &&
    state.comboPath[end + 1].familyId === current.familyId
  ) {
    end++;
  }
  return {
    familyName: current.familyName,
    entries: state.comboPath.slice(start, end + 1),
    currentOffset: state.comboPathIndex - start,
  };
});

// Combo-Mix only — grouped by family so this reads the same way
// MixChecklistPanel does. Deliberately reads state.comboLandedKeys
// (this run only) rather than lifetime familyProgress — Combo never
// advances real family progress, so a lifetime checklist would show a
// landed trick as still "to do" here, or vice versa.
const mixSections = computed(() => {
  if (state.comboSource !== "mix") {
    return [];
  }
  return state.comboFamilyIds
    .map((id) => resolveFamily(id, settings.customFamilies))
    .filter(Boolean)
    .map((family) => ({
      familyId: family.id,
      familyName: familyBaseName(family.name),
      entries: family.entries.map((entry) => ({
        entry,
        landed: state.comboLandedKeys.includes(familyEntryKey(entry)),
      })),
    }));
});

const title = computed(() =>
  familySegment.value ? familySegment.value.familyName : "Tricks du Combo"
);
</script>

<template>
  <AppModal :title="title" @close="$emit('close')">
    <template v-if="familySegment">
      <div class="checklist">
        <div
          v-for="(step, i) in familySegment.entries"
          :key="i"
          class="checklist-row"
          :class="{
            'checklist-row--done': i < familySegment.currentOffset,
            'checklist-row--current': i === familySegment.currentOffset,
          }"
        >
          <span class="checklist-row__index">{{ i + 1 }}</span>
          <span class="checklist-row__name">{{ comboEntryName(step.entry) }}</span>
          <AppIcon v-if="i < familySegment.currentOffset" name="check" :size="14" />
        </div>
      </div>
    </template>
    <template v-else-if="mixSections.length">
      <div class="mix-sections">
        <div v-for="section in mixSections" :key="section.familyId" class="mix-section">
          <p class="mix-section__title">{{ section.familyName }}</p>
          <div class="checklist">
            <div
              v-for="item in section.entries"
              :key="comboEntryName(item.entry)"
              class="checklist-row checklist-row--pass-fail"
              :class="{ 'checklist-row--landed': item.landed }"
            >
              <AppIcon :name="item.landed ? 'check' : 'close'" :size="14" />
              <span class="checklist-row__name">{{ comboEntryName(item.entry) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
    <p v-else class="hint">Aucun combo en cours.</p>
  </AppModal>
</template>

<style scoped>
.checklist {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mix-sections {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: min(60dvh, 480px);
  overflow-y: auto;
}

.mix-section__title {
  font-family: var(--font-display);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--text);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--line);
}

.checklist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-dim);
}

.checklist-row--done {
  color: var(--text-dim);
  opacity: 0.6;
}
.checklist-row--current {
  color: var(--red-hi);
  background: var(--bg-1);
  font-weight: 700;
}
.checklist-row__index {
  flex: none;
  width: 22px;
  text-align: right;
  font-family: var(--font-display);
  opacity: 0.7;
}

/* Mix combo entries are pass/fail this run (landed or not) — same
   red/green convention as every other checklist in the app (see
   FamilyChecklistPanel/MixChecklistPanel), unlike Career's own
   --done/--current styling above which is about sequence position,
   not success. */
.checklist-row--pass-fail {
  color: var(--danger-hi);
}
.checklist-row--landed {
  color: var(--green-hi);
}

.checklist-row__name {
  flex: 1;
  min-width: 0;
}

.hint {
  color: var(--text-dim);
  font-size: 13px;
}
</style>