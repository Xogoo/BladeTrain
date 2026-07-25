<script setup>
import { computed, ref } from "vue";
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import { generateSpin, enumeratePossibleTricks } from "../game/trickGenerator.js";
import { useSettings } from "../composables/useSettings.js";

const props = defineProps({
  settings: { type: Object, required: true },
});
const emit = defineEmits(["back", "start"]);

const { savePreset } = useSettings();
const newPresetName = ref("");
const saveStatus = ref("");

function onSavePreset() {
  if (!newPresetName.value.trim()) {
    return;
  }
  savePreset(newPresetName.value);
  saveStatus.value = `Enregistré : "${newPresetName.value.trim()}"`;
  newPresetName.value = "";
}

const MAX_SHOWN = 20;
const SAMPLE_ROLLS = 400;

// Try the real, exact count first — it's cheap for any settings a
// player would realistically pick (a handful of grinds/variations).
// Only settings broad enough to multiply out into the thousands (every
// grind, every variation, switch up on, ...) fall back to sampling the
// real generator many times and reporting "at least" instead, since
// exhaustively enumerating those would be too slow to be worth it.
const sample = computed(() => {
  const exact = enumeratePossibleTricks(
    props.settings.tricks,
    props.settings.grinds,
    props.settings.switchUpGrinds
  );
  if (exact.exact) {
    return {
      total: exact.names.length,
      shown: exact.names.slice(0, MAX_SHOWN),
      truncated: exact.names.length > MAX_SHOWN,
      isExact: true,
    };
  }

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
    truncated: true,
    isExact: false,
  };
});
</script>

<template>
  <AppModal title="Aperçu des tricks possibles" @close="emit('back')">
    <p class="hint">
      <template v-if="sample.isExact && !sample.truncated">
        {{ sample.total }} trick{{ sample.total === 1 ? "" : "s" }} possible{{
          sample.total === 1 ? "" : "s"
        }}
        avec ces réglages :
      </template>
      <template v-else-if="sample.isExact">
        {{ sample.total }} tricks différents possibles avec ces réglages — en
        voici {{ MAX_SHOWN }} :
      </template>
      <template v-else>
        Réglages trop larges pour un calcul exact — au moins {{ sample.total }}
        tricks différents possibles, en voici {{ MAX_SHOWN }} :
      </template>
    </p>

    <ul class="preview-list">
      <li v-for="name in sample.shown" :key="name">{{ name }}</li>
    </ul>

    <div class="preset-save">
      <input
        type="text"
        class="select"
        placeholder="Nom du réglage (ex: Backslide to AO Acid)"
        v-model="newPresetName"
        @keyup.enter="onSavePreset"
      />
      <button class="btn btn--ghost" :disabled="!newPresetName.trim()" @click="onSavePreset">
        Sauvegarder ces réglages
      </button>
      <p v-if="saveStatus" class="preset-save__status">{{ saveStatus }}</p>
    </div>

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

.preset-save {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}
.preset-save input {
  width: 100%;
  font-size: 15px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--bg-1);
  color: var(--text);
}
.preset-save__status {
  font-size: 13px;
  color: var(--red-hi);
  margin: 0;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions .btn {
  flex: 1;
}
</style>