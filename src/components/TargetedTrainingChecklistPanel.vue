<script setup>
import { computed } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import { useSettings } from "../composables/useSettings.js";
import { useCollection } from "../composables/useCollection.js";
import { useGame } from "../composables/useGame.js";

// Unlike a family, "Entraînement ciblé" has no fixed trick list — any
// grind × variation × rotation combo matching the settings can come
// up. A switch-up is ONE trick here, never split into its two grinds
// (e.g. "FS Backslide to AO Top PStar" is a single row, not "FS
// Backslide" and "PStar" separately) — see targetedTrainingItems in
// useCollection.js. Green check if landed THIS SESSION / red cross if
// not — resets every session, same as the training itself, rather
// than tracking lifetime mastery like a family does.
//
// By default reads the live current settings + current session (used
// from the ScoreBoard). Pass `config` to preview a SPECIFIC saved
// entry instead — e.g. from TargetedTrainingHistoryPanel, so the
// player can see what it actually contains (and how that session went)
// before tapping Refaire, without touching their current settings.
const props = defineProps({
  config: { type: Object, default: null }, // { tricks, grinds, switchUpGrinds, sessionId }
  title: { type: String, default: "Tricks de l'entraînement ciblé" },
});
defineEmits(["close"]);

const { settings } = useSettings();
const { targetedTrainingItems } = useCollection();
const { state } = useGame();

const source = computed(() => props.config ?? settings);
const sessionId = computed(() => props.config ? props.config.sessionId : state.sessionId);
const items = computed(() => targetedTrainingItems(source.value, sessionId.value));
const landedCount = computed(() => items.value.filter((item) => item.landed).length);
</script>

<template>
  <AppModal :title="title" @close="$emit('close')">
    <p class="checklist-progress">{{ landedCount }}/{{ items.length }} réussis</p>
    <div class="checklist">
      <div
        v-for="item in items"
        :key="item.key"
        class="checklist-row"
        :class="{ 'checklist-row--done': item.landed }"
      >
        <AppIcon :name="item.landed ? 'check' : 'close'" :size="15" />
        <span class="checklist-row__name">{{ item.name }}</span>
      </div>
    </div>
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
  max-height: min(50dvh, 380px);
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
</style>