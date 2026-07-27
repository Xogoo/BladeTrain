<script setup>
import { computed } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import { useCollection } from "../composables/useCollection.js";
import { resolveFamily } from "../game/families.js";
import { nameEntry } from "../game/trickGenerator.js";
import { useSettings } from "../composables/useSettings.js";

// A quick "where am I in this family" checklist — every trick, green
// check if landed / red cross if not — opened from the ScoreBoard's
// and Focus mode's "Nom de famille X/Y" display. Deliberately lighter
// than FamilyHistoryPanel (no chart/stats/hardest-trick callouts):
// this is meant to be glanced at mid-session, not read like a report.
const props = defineProps({
  familyId: { type: String, required: true },
});
defineEmits(["close"]);

const { settings } = useSettings();
const { familyEntryStatuses, familyIndex } = useCollection();

const family = computed(() => resolveFamily(props.familyId, settings.customFamilies));
const statuses = computed(() => (family.value ? familyEntryStatuses(family.value) : []));

function displayName(status) {
  return status.land ? status.land.trickName : nameEntry(status.entry);
}
</script>

<template>
  <AppModal
    :title="family ? family.name : 'Tricks de la famille'"
    @close="$emit('close')"
  >
    <template v-if="family">
      <p class="checklist-progress">
        {{ familyIndex(family.id) }}/{{ family.entries.length }} réussis
      </p>
      <div class="checklist">
        <div
          v-for="status in statuses"
          :key="displayName(status)"
          class="checklist-row"
          :class="{ 'checklist-row--done': status.landed }"
        >
          <AppIcon :name="status.landed ? 'check' : 'close'" :size="15" />
          <span class="checklist-row__name">{{ displayName(status) }}</span>
        </div>
      </div>
    </template>
    <p v-else class="hint">Famille introuvable.</p>
  </AppModal>
</template>

<style scoped>
.checklist-progress {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--text-dim);
  margin-bottom: 14px;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: min(60dvh, 480px);
  overflow-y: auto;
}

.checklist-row {
  display: flex;
  align-items: center;
  gap: 10px;
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
  font-size: 14px;
  color: var(--text);
}

.hint {
  color: var(--text-dim);
  font-size: 13px;
}
</style>