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

const { saveCustomFamily } = useSettings();
const newFamilyName = ref("");
const saveStatus = ref("");

function onCreateFamily() {
  if (!newFamilyName.value.trim() || !sample.value.isExact) {
    return;
  }
  saveCustomFamily(newFamilyName.value, sample.value.entries);
  saveStatus.value = `Famille perso créée : "${newFamilyName.value.trim()}"`;
  newFamilyName.value = "";
}

const SAMPLE_ROLLS = 400;

// Try the real, exact count (and full entry list) first — cheap for
// any settings a player would realistically pick. Only settings broad
// enough to multiply out into the thousands fall back to sampling the
// real generator many times for an "at least" estimate instead — that
// case can't become a personal family (see onCreateFamily's guard),
// since there's no reliable complete entry list to build one from.
const sample = computed(() => {
  const exact = enumeratePossibleTricks(
    props.settings.tricks,
    props.settings.grinds,
    props.settings.switchUpGrinds,
    {},
    props.settings.switchUp2Grinds
  );
  if (exact.exact) {
    return {
      total: exact.names.length,
      shown: exact.names,
      entries: exact.entries,
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
      props.settings.switchUpGrinds,
      null,
      null,
      props.settings.switchUp2Grinds
    );
    names.add(spin.name);
  }
  const all = [...names].sort((a, b) => a.localeCompare(b));
  return {
    total: all.length,
    shown: all,
    entries: [],
    isExact: false,
  };
});
</script>

<template>
  <AppModal title="Aperçu des tricks possibles" @close="emit('back')">
    <p class="hint">
      <template v-if="sample.isExact">
        {{ sample.total }} trick{{ sample.total === 1 ? "" : "s" }} possible{{
          sample.total === 1 ? "" : "s"
        }}
        avec ces réglages :
      </template>
      <template v-else>
        Réglages trop larges pour un calcul exact — au moins {{ sample.total }}
        tricks différents trouvés sur {{ SAMPLE_ROLLS }} tirages :
      </template>
    </p>

    <ul class="preview-list">
      <li v-for="name in sample.shown" :key="name">{{ name }}</li>
    </ul>

    <div class="preset-save">
      <input
        type="text"
        class="select"
        placeholder="Nom de la famille (ex: Backslide to AO Acid)"
        autocapitalize="sentences"
        autocomplete="off"
        v-model="newFamilyName"
        :disabled="!sample.isExact"
        @keyup.enter="onCreateFamily"
      />
      <button
        class="btn btn--ghost"
        :disabled="!newFamilyName.trim() || !sample.isExact"
        @click="onCreateFamily"
      >
        Créer une famille perso
      </button>
      <p v-if="!sample.isExact" class="preset-save__hint">
        Impossible tant que la liste n'est pas exacte — resserre tes réglages
        (moins de grinds/variations activés à la fois).
      </p>
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
.preset-save__hint {
  font-size: 12px;
  color: var(--text-dim);
  margin: 0;
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