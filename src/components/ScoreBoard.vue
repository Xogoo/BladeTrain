<script setup>
import { computed, ref, watch } from "vue";
import { LETTERS, useGame } from "../composables/useGame.js";
import { useSettings } from "../composables/useSettings.js";
import { useCollection } from "../composables/useCollection.js";

const { state, isSolo, activeFamily } = useGame();
const { levelName } = useSettings();
const { uniqueTrickCount, familyIndex } = useCollection();

// Family names carry their own "(Normal)"/"(Switch)" suffix (see
// families.js) — stripped here, there's no room for it in this small
// a space and the track is already obvious from context.
function familyBaseName(name) {
  return name.replace(/ \((Normal|Switch)\)$/, "");
}

const pointsPop = ref(false);

const playersIn = computed(
  () => state.players.filter((p) => p.letters < LETTERS.length).length
);

watch(
  () => state.points,
  () => {
    pointsPop.value = false;
    requestAnimationFrame(() => {
      pointsPop.value = true;
    });
  }
);
</script>

<template>
  <div v-if="isSolo" class="scoreboard panel">
    <div class="scoreboard__block">
      <span class="scoreboard__caption">Score</span>
      <span class="scoreboard__value" :class="{ pop: pointsPop }">{{ state.points }}</span>
    </div>
    <div class="scoreboard__divider" />
    <div class="scoreboard__block">
      <span class="scoreboard__caption">Tirages</span>
      <span class="scoreboard__value scoreboard__value--plain">{{
        state.spinsUsed
      }}</span>
    </div>
    <div class="scoreboard__divider" />
    <div v-if="activeFamily" class="scoreboard__block">
      <span class="scoreboard__caption">{{ familyBaseName(activeFamily.name) }}</span>
      <span class="scoreboard__level">
        {{ familyIndex(activeFamily.id) }}/{{ activeFamily.entries.length }}
      </span>
    </div>
    <div v-else class="scoreboard__block">
      <span class="scoreboard__caption">Collection</span>
      <span class="scoreboard__level">{{ uniqueTrickCount }}</span>
    </div>
  </div>

  <div v-else class="scoreboard panel">
    <div class="scoreboard__block">
      <span class="scoreboard__caption">Manche</span>
      <span class="scoreboard__value">{{ state.round }}</span>
    </div>
    <div class="scoreboard__divider" />
    <div class="scoreboard__block">
      <span class="scoreboard__caption">En jeu</span>
      <span class="scoreboard__value scoreboard__value--plain">{{
        playersIn
      }}</span>
    </div>
    <div class="scoreboard__divider" />
    <div class="scoreboard__block">
      <span class="scoreboard__caption">Niveau</span>
      <span class="scoreboard__level">{{ levelName() }}</span>
    </div>
  </div>
</template>

<style scoped>
.scoreboard {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 8px 20px;
}

.scoreboard__block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 64px;
}

.scoreboard__caption {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.scoreboard__value {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 900;
  color: var(--text);
  text-shadow: var(--glow-white);
}

.scoreboard__value.pop {
  animation: pop 0.6s ease;
}

.scoreboard__value--plain {
  color: var(--text-dim);
  text-shadow: none;
}

.scoreboard__level {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--red-hi);
  text-shadow: var(--glow-red);
  padding-top: 4px;
}

.scoreboard__divider {
  width: 1px;
  height: 34px;
  background: var(--line);
}
</style>