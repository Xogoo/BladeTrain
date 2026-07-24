<script setup>
import { computed, ref, watch } from "vue";
import AppModal from "./AppModal.vue";
import { useCollection } from "../composables/useCollection.js";

defineEmits(["close"]);

const { switchUpLands } = useCollection();

// Every switch-up's trickName is "<first trick> to <...>" — the first
// trick's own display name (already synonym/topside-aware, whatever
// the namer produced) is just everything before that first " to ".
// No need to re-derive it from grind/variation data separately.
function firstTrickOf(land) {
  return land.trickName.split(" to ")[0];
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Every first trick that's ever led to a switch-up, alphabetical, with
// how many different switch-ups started from it.
const firstTrickOptions = computed(() => {
  const counts = {};
  for (const land of switchUpLands.value) {
    const name = firstTrickOf(land);
    counts[name] = (counts[name] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const selectedFirst = ref(null);
watch(
  firstTrickOptions,
  (list) => {
    if (!list.length) {
      selectedFirst.value = null;
      return;
    }
    if (!list.some((o) => o.name === selectedFirst.value)) {
      selectedFirst.value = list[0].name;
    }
  },
  { immediate: true }
);

// Every switch-up starting from the selected first trick, most recent
// first.
const matchingSwitchUps = computed(() => {
  if (!selectedFirst.value) {
    return [];
  }
  return switchUpLands.value
    .filter((land) => firstTrickOf(land) === selectedFirst.value)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
});
</script>

<template>
  <AppModal title="Switch-ups" @close="$emit('close')">
    <p v-if="!firstTrickOptions.length" class="hint">
      Pas encore de switch-up réussi &mdash; ils apparaîtront ici une fois que
      tu en auras réussi un.
    </p>
    <template v-else>
      <div class="first-picker">
        <span class="first-picker__label">1er trick</span>
        <select class="select" v-model="selectedFirst">
          <option v-for="opt in firstTrickOptions" :key="opt.name" :value="opt.name">
            {{ opt.name }} ({{ opt.count }})
          </option>
        </select>
      </div>

      <div class="switchups">
        <div v-for="(su, i) in matchingSwitchUps" :key="i" class="switchup-card">
          <span class="switchup-card__name">{{ su.trickName }}</span>
          <span class="switchup-card__date">{{ formatDate(su.date) }}</span>
        </div>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.hint {
  color: var(--text-dim);
  font-size: 14px;
}

.first-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.first-picker__label {
  flex: none;
  font-family: var(--font-display);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-dim);
}

.first-picker .select {
  flex: 1;
  font-family: var(--font-body);
  font-size: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--bg-1);
  color: var(--text);
}

.first-picker .select option {
  background: var(--bg-1);
  color: var(--text);
}

.switchups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.switchup-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--bg-1);
}

.switchup-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.switchup-card__date {
  flex: none;
  font-size: 12px;
  color: var(--text-dim);
  white-space: nowrap;
}
</style>