<script setup>
import { computed } from "vue";
import AppModal from "./AppModal.vue";
import { useCollection } from "../composables/useCollection.js";
import { resolveFamily } from "../game/families.js";

defineEmits(["close"]);

const { ayaLifetimeProgress } = useCollection();

const soulFamily = resolveFamily("soul-normal", []);
const grooveFamily = resolveFamily("groove-normal", []);

// Recomputed fresh every time this opens rather than cached — cheap
// (a handful of sessions, a couple dozen tricks) and guarantees it's
// never stale relative to whatever was just checked off.
const progress = computed(() => ayaLifetimeProgress());

const bars = computed(() => [
  { label: "Soul", done: progress.value.soul, total: soulFamily.entries.length },
  { label: "Groove", done: progress.value.groove, total: grooveFamily.entries.length },
]);
</script>

<template>
  <AppModal title="Progression" @close="$emit('close')">
    <p class="aya-progress__hint">
      Tous les tricks déjà réussis au moins une fois, toutes sessions
      confondues.
    </p>
    <div v-for="bar in bars" :key="bar.label" class="aya-progress__row">
      <div class="aya-progress__header">
        <span class="aya-progress__label">{{ bar.label }}</span>
        <span class="aya-progress__count">{{ bar.done }}/{{ bar.total }}</span>
      </div>
      <div class="aya-progress__track">
        <div
          class="aya-progress__fill"
          :style="{ width: `${bar.total ? (bar.done / bar.total) * 100 : 0}%` }"
        />
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.aya-progress__hint {
  font-size: 13px;
  color: var(--text-dim);
  margin-bottom: 20px;
}

.aya-progress__row {
  margin-bottom: 18px;
}

.aya-progress__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}

.aya-progress__label {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
}

.aya-progress__count {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-dim);
}

.aya-progress__track {
  height: 10px;
  border-radius: 999px;
  background: var(--panel);
  border: 1px solid var(--line);
  overflow: hidden;
}

.aya-progress__fill {
  height: 100%;
  background: var(--red-hi);
  box-shadow: var(--glow-red);
  transition: width 0.25s ease;
}
</style>