<script setup>
import { computed } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import { generateSpin } from "../game/trickGenerator.js";

const props = defineProps({
  settings: { type: Object, required: true },
});
const emit = defineEmits(["back", "start"]);

// Enumerating every combination these settings allow would explode into
// the thousands (grinds × variations × approach × 3 rotation reels ×
// switch-up...), so this samples the real generator instead — same
// function the actual game uses, just called many times with no locked
// grinds/bias, deduplicated by name. Always accurate to what you'd
// actually see, since it's not a separate hand-built enumeration that
// could drift from trickGenerator.js's real rules.
const SAMPLE_ROLLS = 400;
const MAX_SHOWN = 20;

const sample = computed(() => {
  const names = new Set();
  for (let i = 0; i < SAMPLE_ROLLS; i += 1) {
    const spin = generateSpin(
      props.settings.tricks,
      [],
      null,
      props.settings.grinds,
      props.settings.switchUpGrinds
    );
    names.add(spin.name);
  }
  const all = [...names].sort((a, b) => a.localeCompare(b));
  return {
    total: all.length,
    shown: all.slice(0, MAX_SHOWN),
    truncated: all.length > MAX_SHOWN,
  };
});
</script>

<template>
  <AppModal title="Aperçu des tricks possibles" @close="emit('back')">
    <p class="hint">
      <template v-if="sample.truncated">
        Au moins {{ sample.total }} tricks différents possibles avec ces
        réglages — en voici {{ MAX_SHOWN }} :
      </template>
      <template v-else>
        {{ sample.total }} trick{{ sample.total === 1 ? "" : "s" }} possible{{
          sample.total === 1 ? "" : "s"
        }}
        avec ces réglages :
      </template>
    </p>

    <ul class="preview-list">
      <li v-for="name in sample.shown" :key="name">{{ name }}</li>
    </ul>

    <div class="actions">
      <button class="btn btn--ghost" @click="emit('back')">
        <AppIcon name="forward" :size="16" style="transform: scaleX(-1)" /> Retour
      </button>
      <button class="btn btn--go" @click="emit('start')">
        <AppIcon name="play" :size="18" /> Débuter !
      </button>
    </div>
  </AppModal>
</template>

<style scoped>
.hint {
  color: var(--text-dim);
  font-size: 14px;
  margin-bottom: 14px;
}

.preview-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 340px;
  overflow-y: auto;
  margin-bottom: 18px;
}

.preview-list li {
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--bg-1);
  font-size: 14px;
  color: var(--text);
}

.actions {
  display: flex;
  gap: 10px;
}

.actions .btn {
  flex: 1;
}
</style>
