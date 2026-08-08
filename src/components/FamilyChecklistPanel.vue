<script setup>
import { computed } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import { useCollection } from "../composables/useCollection.js";
import { useGame } from "../composables/useGame.js";
import { resolveFamily } from "../game/families.js";
import { nameEntry } from "../game/trickGenerator.js";
import { useSettings } from "../composables/useSettings.js";

// A quick "where am I in this family" checklist — every trick, green
// check if landed / red cross if not — opened from the ScoreBoard's
// and Focus mode's "Nom de famille X/Y" display. Deliberately lighter
// than FamilyHistoryPanel (no chart/stats/hardest-trick callouts):
// this is meant to be glanced at mid-session, not read like a report.
//
// Career resumes lifetime progress and reads familyEntryStatuses
// (persisted, tricks acquired for good). Every other context — plain
// "Familles de tricks" practice, Points faibles — resets to 0 each
// session (see useGame.js's nextSpin/landTrick), so it reads
// sessionFamilyEntryStatuses instead: what's landed in an OLDER
// session, or never at all, is equally fair game again today.
const props = defineProps({
  familyId: { type: String, required: true },
  isCareer: { type: Boolean, default: false },
});
defineEmits(["close"]);

const { settings } = useSettings();
const { familyEntryStatuses, sessionFamilyEntryStatuses } = useCollection();
const { state } = useGame();

const family = computed(() => resolveFamily(props.familyId, settings.customFamilies));
const statuses = computed(() => {
  if (!family.value) {
    return [];
  }
  return props.isCareer
    ? familyEntryStatuses(family.value, family.value.id)
    : sessionFamilyEntryStatuses(family.value, state.sessionId);
});
const landedCount = computed(() => statuses.value.filter((s) => s.landed).length);

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
        {{ landedCount }}/{{ family.entries.length }} réussis
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
          <span v-if="status.landed && status.land && status.land.tries" class="checklist-row__attempts">
            (après {{ status.land.tries }} tentative{{ status.land.tries > 1 ? "s" : "" }})
          </span>
          <span v-if="!status.landed" class="checklist-row__attempts">
            ({{ status.skipCount ? `${status.skipCount} tentative${status.skipCount > 1 ? "s" : ""}` : "aucune tentative" }})
          </span>
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