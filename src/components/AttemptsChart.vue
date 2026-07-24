<script setup>
import { computed } from "vue";

const props = defineProps({
  // Single trick series: { name, tries: [n1, n2, ...] } in
  // chronological order, or null if nothing is selected yet.
  // Unlike the old multi-line version, this component now only ever
  // draws one trick at a time — the caller (SessionHistoryPanel)
  // decides which one via its trick selector.
  series: { type: Object, default: null },
});


const W = 320;
const H = 160;
const PAD = 28;

const tries = computed(() => props.series?.tries ?? []);

const maxTries = computed(() => Math.max(1, ...tries.value));
const maxPoints = computed(() => Math.max(2, tries.value.length));

function xFor(i) {
  return PAD + (i / (maxPoints.value - 1 || 1)) * (W - PAD * 2);
}
// Inverted on purpose: fewer tries draws HIGHER on the chart. A line
// that climbs over time then reads as "getting better" the way people
// naturally expect an upward line to mean — instead of the confusing
// opposite, where more tries (worse) used to sit higher on screen.
function yFor(value) {
  return PAD + (value / maxTries.value) * (H - PAD * 2);
}

const points = computed(() =>
  tries.value.map((value, i) => `${xFor(i)},${yFor(value)}`).join(" ")
);

// Y-axis gridlines: 0, mid, max tries.
const yTicks = computed(() => {
  const max = maxTries.value;
  const mid = Math.round(max / 2);
  return [0, mid, max].filter((v, i, arr) => arr.indexOf(v) === i);
});

// Quick read on trend: comparing the average of the first half of
// attempts against the second half tells you if you're improving on
// this specific trick, without needing a legend or extra math on screen.
const trend = computed(() => {
  if (tries.value.length < 2) return null;
  const mid = Math.ceil(tries.value.length / 2);
  const firstHalf = tries.value.slice(0, mid);
  const secondHalf = tries.value.slice(mid);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const delta = avg(firstHalf) - avg(secondHalf);
  if (Math.abs(delta) < 0.25) return "flat";
  return delta > 0 ? "down" : "up";
});
</script>

<template>
  <div class="chart-wrap">
    <svg
      v-if="tries.length"
      :viewBox="`0 0 ${W} ${H}`"
      class="chart"
      preserveAspectRatio="xMidYMid meet"
    >
      <g v-for="tick in yTicks" :key="tick">
        <line
          :x1="PAD"
          :x2="W - PAD"
          :y1="yFor(tick)"
          :y2="yFor(tick)"
          class="chart__grid"
        />
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
        v-for="(pt, j) in tries"
        :key="j"
        :cx="xFor(j)"
        :cy="yFor(pt)"
        r="3.5"
        class="chart__dot"
      />
      <text :x="W / 2" :y="H - 6" class="chart__axis-label" text-anchor="middle">
        réussi la 1ère, 2ème, 3ème fois&hellip; &middot; plus haut = moins d'essais (mieux)
      </text>
    </svg>
    <p v-else class="chart__empty">
      Réussis deux fois le même trick exact pour commencer à voir ta progression ici.
    </p>
    <p v-if="trend === 'down'" class="chart__trend chart__trend--good">
      En baisse — moins d'essais nécessaires ces derniers temps 👍
    </p>
    <p v-else-if="trend === 'up'" class="chart__trend chart__trend--bad">
      En hausse — plus d'essais nécessaires ces derniers temps
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