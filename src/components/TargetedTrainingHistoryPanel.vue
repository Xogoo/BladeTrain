<script setup>
import { computed, ref } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import { useSettings } from "../composables/useSettings.js";
import { useCollection } from "../composables/useCollection.js";
import TargetedTrainingChecklistPanel from "./TargetedTrainingChecklistPanel.vue";

const emit = defineEmits(["close", "redo"]);

const { settings, redoTargetedTraining, deleteTargetedTraining } = useSettings();
const { targetedTrainingItems } = useCollection();

// Two-tap confirm per row, same pattern as everywhere else destructive.
const confirmingId = ref(null);

// Which past entry (if any) is being previewed — see
// TargetedTrainingChecklistPanel's `config` prop. Lets the player see
// exactly what a past entraînement ciblé contained before committing
// to Refaire, without touching their current live settings.
const previewingEntry = ref(null);

function onDeleteClick(id) {
  if (confirmingId.value !== id) {
    confirmingId.value = id;
    return;
  }
  deleteTargetedTraining(id);
  confirmingId.value = null;
}

function onRedoClick(entry) {
  redoTargetedTraining(entry);
  emit("redo");
  emit("close");
}

function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// A one-line "what was this" summary — full config is too long to
// show per row, so this picks out the handful of settings most likely
// to distinguish one entraînement ciblé from another at a glance.
function summarize(entry) {
  const parts = [];
  const trickCount = targetedTrainingItems(entry, entry.sessionId).length;
  parts.push(`${trickCount} trick${trickCount > 1 ? "s" : ""}`);
  if (entry.tricks.switchUp) parts.push("Switch up");
  if (entry.tricks.topside) parts.push("Topside");
  if (entry.tricks.switch) parts.push("Switch");
  if (entry.tricks.trainingFocus) parts.push("Ciblé verrouillé");
  return parts.join(" · ");
}

const history = computed(() => settings.targetedTrainingHistory);
</script>

<template>
  <AppModal title="Historique — Entraînement ciblé" @close="$emit('close')">
    <p v-if="!history.length" class="hint">
      Rien encore — lance un entraînement ciblé pour le voir apparaître ici.
    </p>
    <div v-else class="training-list">
      <div v-for="entry in history" :key="entry.id" class="training-card">
        <div class="training-card__info">
          <span class="training-card__date">{{ formatDate(entry.date) }}</span>
          <span class="training-card__summary">{{ summarize(entry) }}</span>
        </div>
        <div class="training-card__actions">
          <button
            class="btn btn--ghost training-card__preview"
            @click="previewingEntry = entry"
          >
            <AppIcon name="trophy" :size="13" /> Aperçu
          </button>
          <button class="btn btn--go training-card__redo" @click="onRedoClick(entry)">
            <AppIcon name="play" :size="14" /> Refaire
          </button>
          <button
            class="btn btn--ghost training-card__delete"
            :class="{ 'btn--confirm': confirmingId === entry.id }"
            @click="onDeleteClick(entry.id)"
            @blur="confirmingId = null"
          >
            <AppIcon name="close" :size="13" />
          </button>
        </div>
      </div>
    </div>
  </AppModal>

  <TargetedTrainingChecklistPanel
    v-if="previewingEntry"
    :config="previewingEntry"
    :title="`Tricks — ${formatDate(previewingEntry.date)}`"
    @close="previewingEntry = null"
  />
</template>

<style scoped>
.hint {
  color: var(--text-dim);
  font-size: 14px;
}

.training-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: min(60dvh, 480px);
  overflow-y: auto;
}

.training-card {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-1);
  border: 1px solid var(--line);
}

.training-card__info {
  flex: 1 1 160px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.training-card__date {
  font-family: var(--font-display);
  font-size: 12px;
  color: var(--text-dim);
}

.training-card__summary {
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.training-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: none;
}

.training-card__preview {
  font-size: 13px;
  padding: 8px 12px;
  white-space: nowrap;
}

.training-card__redo {
  font-size: 13px;
  padding: 8px 14px;
  white-space: nowrap;
}

.training-card__delete {
  padding: 8px 10px;
}
</style>