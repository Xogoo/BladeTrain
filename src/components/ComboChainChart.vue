<script setup>
import { computed } from "vue";

const props = defineProps({
  // Chronological order (oldest first) — the caller passes
  // comboRunHistory reversed, since that computed is newest-first.
  runs: { type: Array, default: () => [] },
});

const W = 320;
const H = 160;
const PAD = 28;

const chains = computed(() => props.runs.map((r) => r.chain));
const maxChain = computed(() => Math.max(1, ...chains.value));
const maxPoints = computed(() => Math.max(2, props.runs.length));

function xFor(i) {
  return PAD + (i / (maxPoints.value - 1 || 1)) * (W - PAD * 2);
}
// Higher = better here (a longer chain is a better run), so — unlike
// AttemptsChart's inverted tries axis — this one climbs the normal way.
function yFor(value) {
  return H - PAD - (value / maxChain.value) * (H - PAD * 2);
}

const points = computed(() =>
  props.runs.map((r, i) => `${xFor(i)},${yFor(r.chain)}`).join(" ")
);

const yTicks = computed(() => {
  const max = maxChain.value;
  const mid = Math.round(max / 2);
  return [0, mid, max].filter((v, i, arr) => arr.indexOf(v) === i);
});

// Same "first half vs second half" trend read AttemptsChart uses, just
// not inverted — a rising average chain length is genuinely "up" here.
const trend = computed(() => {
  if (chains.value.length < 2) return null;
  const mid = Math.ceil(chains.value.length / 2);
  const firstHalf = chains.value.slice(0, mid);
  const secondHalf = chains.value.slice(mid);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const delta = avg(secondHalf) - avg(firstHalf);
  if (Math.abs(delta) < 0.5) return "flat";
  return delta > 0 ? "up" : "down";
});
</script>

<template>
  <div class="chart-wrap">
    <svg
      v-if="runs.length"
      :viewBox="`0 0 ${W} ${H}`"
      class="chart"
      preserveAspectRatio="xMidYMid meet"
    >
      <g v-for="tick in yTicks" :key="tick">
        <line :x1="PAD" :x2="W - PAD" :y1="yFor(tick)" :y2="yFor(tick)" class="chart__grid" />
        <text :x="PAD - 6" :y="yFor(tick) + 3" class="chart__axis-label" text-anchor="end">
          {{ tick }}
        </text>
      </g>
      <polyline
        :points="points"
        fill="none"
        class="chart__line"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        v-for="(run, j) in runs"
        :key="run.id"
        :cx="xFor(j)"
        :cy="yFor(run.chain)"
        :r="run.cleared ? 5 : 3.5"
        class="chart__dot"
        :class="{ 'chart__dot--cleared': run.cleared }"
      />
      <text
        v-for="(run, j) in runs"
        :key="'label-' + run.id"
        :x="xFor(j)"
        :y="yFor(run.chain) - 10"
        class="chart__point-label"
        text-anchor="middle"
      >
        {{ run.chain }}
      </text>
      <text :x="W / 2" :y="H - 6" class="chart__axis-label" text-anchor="middle">
        runs dans l'ordre &middot; plus haut = chaîne plus longue &middot; ⬤ = chemin terminé
      </text>
    </svg>
    <p v-else class="chart__empty">
      Termine un premier run Combo pour voir apparaître ta progression ici.
    </p>
    <p v-if="trend === 'up'" class="chart__trend chart__trend--good">
      En hausse — tes chaînes s'allongent ces derniers temps 👍
    </p>
    <p v-else-if="trend === 'down'" class="chart__trend chart__trend--bad">
      En baisse — tes chaînes récentes sont plus courtes
    </p>
  </div>
</template>

<style scoped>
.chart-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chart {
  width: 100%;
  height: auto;
}
.chart__grid {
  stroke: var(--line);
  stroke-width: 1;
}
.chart__line {
  stroke: var(--red-hi);
}
.chart__dot {
  fill: var(--red-hi);
}
.chart__dot--cleared {
  fill: var(--bg-1);
  stroke: var(--red-hi);
  stroke-width: 2;
}
.chart__point-label {
  font-size: 10px;
  font-weight: 700;
  fill: var(--text);
  font-family: var(--font-display);
}
.chart__axis-label {
  font-size: 9px;
  font-weight: 600;
  fill: var(--text-dim);
  font-family: var(--font-body);
}
.chart__empty {
  color: var(--text-dim);
  font-size: 14px;
  text-align: center;
  padding: 20px 10px;
}
.chart__trend {
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  color: var(--text-dim);
}
.chart__trend--good {
  color: var(--green-hi);
}
.chart__trend--bad {
  color: var(--danger-hi);
}
</style>