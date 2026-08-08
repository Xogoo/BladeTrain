<script setup>
import { computed } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import { useCollection } from "../composables/useCollection.js";
import { useGame } from "../composables/useGame.js";
import { resolveFamily } from "../game/families.js";
import { nameEntry } from "../game/trickGenerator.js";
import { useSettings } from "../composables/useSettings.js";

// Same idea as FamilyChecklistPanel, but for Mix's several families at
// once — one section per family, each with its own mini-checklist, so
// "which tricks are left in this Mix" is glanceable mid-session just
// like a single family already is.
//
// Deliberately scoped to THIS SESSION (sessionFamilyEntryStatuses), not
// lifetime familyProgress — Mix's whole point is training a pool that
// never excludes already-landed entries (see useGame.js's buildMixPool
// comment): you can mix in tricks you mastered long ago just to keep
// them sharp. Reading lifetime progress here made that pointless —
// anything ever landed before showed permanently green regardless of
// what actually happened this run.
const props = defineProps({
  familyIds: { type: Array, required: true },
});
defineEmits(["close"]);

const { settings } = useSettings();
const { sessionFamilyEntryStatuses } = useCollection();
const { state } = useGame();

const families = computed(() =>
  props.familyIds
    .map((id) => resolveFamily(id, settings.customFamilies))
    .filter(Boolean)
);

const sections = computed(() =>
  families.value.map((family) => ({
    family,
    statuses: sessionFamilyEntryStatuses(family, state.sessionId),
  }))
);

const totalLanded = computed(() =>
  sections.value.reduce(
    (sum, s) => sum + s.statuses.filter((st) => st.landed).length,
    0
  )
);
const totalCount = computed(() =>
  sections.value.reduce((sum, s) => sum + s.family.entries.length, 0)
);

function displayName(status) {
  return status.land ? status.land.trickName : nameEntry(status.entry);
}
</script>

<template>
  <AppModal title="Tricks du Mix" @close="$emit('close')">
    <template v-if="sections.length">
      <p class="checklist-progress">{{ totalLanded }}/{{ totalCount }} réussis</p>
      <div class="mix-sections">
        <div v-for="section in sections" :key="section.family.id" class="mix-section">
          <p class="mix-section__title">
            {{ section.family.name }}
            <span class="mix-section__count">
              {{ section.statuses.filter((s) => s.landed).length }}/{{ section.family.entries.length }}
            </span>
          </p>
          <div class="checklist">
            <div
              v-for="status in section.statuses"
              :key="displayName(status)"
              class="checklist-row"
              :class="{ 'checklist-row--done': status.landed }"
            >
              <AppIcon :name="status.landed ? 'check' : 'close'" :size="15" />
              <span class="checklist-row__name">{{ displayName(status) }}</span>
              <span v-if="status.landed && status.land && status.land.tries" class="checklist-row__attempts">
                (après {{ status.land.tries }} tentative{{ status.land.tries > 1 ? "s" : "" }})
              </span>
              <span v-if="!status.landed" class="checklist-row__attempts">
                ({{ status.skipCount ? `${status.skipCount} tentative${status.skipCount > 1 ? "s" : ""}` : "aucune tentative" }})
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
    <p v-else class="hint">Aucune famille active.</p>
  </AppModal>
</template>

<style scoped>
.checklist-progress {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--text-dim);
  margin-bottom: 14px;
}

.mix-sections {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: min(60dvh, 480px);
  overflow-y: auto;
}

.mix-section__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-display);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--text);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--line);
}

.mix-section__count {
  font-size: 12px;
  color: var(--text-dim);
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checklist-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 9px 12px;
  border-radius: 10px;
  background: var(--bg-1);
  border: 1px solid var(--line);
  color: var(--danger-hi);
}

.checklist-row--done {
  color: var(--green-hi);
}

.checklist-row__name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--text);
}

.checklist-row__attempts {
  flex: none;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-dim);
}

.hint {
  color: var(--text-dim);
  font-size: 13px;
}
</style>