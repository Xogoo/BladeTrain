<script setup>
import { nextTick, ref, watch } from "vue";

const props = defineProps({
  label: { type: String, required: true },
  pool: { type: Array, required: true },
  winner: { type: Object, required: true },
  spinId: { type: Number, required: true },
  /** Total spin time for this reel in ms (stagger is baked in by the parent). */
  duration: { type: Number, required: true },
});

const emit = defineEmits(["stopped"]);

// Must match --reel-item-h in the styles below.
const ITEM_H = 58;

const strip = ref([]);
const offset = ref(0);
const transition = ref("none");
const spinning = ref(false);
const settled = ref(false);

watch(() => props.spinId, spin, { immediate: true });

/** Random filler entries ending on the winner, so the strip always lands right. */
function buildStrip() {
  const fillerCount = 14 + Math.floor(Math.random() * 6);
  const filler = Array.from(
    { length: fillerCount },
    () => props.pool[Math.floor(Math.random() * props.pool.length)].name
  );
  return [...filler, props.winner.name];
}

async function spin() {
  settled.value = false;
  spinning.value = true;
  strip.value = buildStrip();
  transition.value = "none";
  offset.value = 0;
  await nextTick();

  // Two frames so the reset above is painted before the animation starts.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      transition.value = `transform ${props.duration}ms cubic-bezier(0.14, 0.72, 0.2, 1)`;
      offset.value = -(strip.value.length - 1) * ITEM_H;
    });
  });

  window.setTimeout(() => {
    spinning.value = false;
  }, props.duration * 0.72);
  window.setTimeout(() => {
    settled.value = true;
    emit("stopped");
  }, props.duration + 80);
}
</script>

<template>
  <div class="reel" :class="{ 'reel--settled': settled }">
    <div class="reel__label">{{ label }}</div>
    <div class="reel__window">
      <div
        class="reel__strip"
        :class="{ 'reel__strip--spinning': spinning }"
        :style="{ transform: `translateY(${offset}px)`, transition }"
      >
        <div v-for="(item, i) in strip" :key="i" class="reel__item">
          {{ item }}
        </div>
      </div>
      <div class="reel__shade" />
    </div>
    <div class="reel__score" :class="{ 'reel__score--visible': settled && winner.score > 0 }">
      +{{ winner.score }}
    </div>
  </div>
</template>

<style scoped>
.reel {
  --reel-item-h: 58px;
  display: grid;
  grid-template-columns: 92px 1fr 52px;
  align-items: center;
  gap: 10px;
}

.reel__label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1.5;
  text-transform: uppercase;
  color: var(--text-dim);
  text-align: right;
  transition: color 0.3s ease, text-shadow 0.3s ease;
}

.reel--settled .reel__label {
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
}

.reel__window {
  position: relative;
  height: var(--reel-item-h);
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--line-strong);
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.4), rgba(var(--fg-rgb), 0.05) 50%, rgba(0, 0, 0, 0.4)),
    var(--bg-2);
  box-shadow: inset 0 2px 14px rgba(0, 0, 0, 0.55);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.reel--settled .reel__window {
  border-color: rgba(var(--fg-rgb), 0.7);
  box-shadow: inset 0 2px 14px rgba(0, 0, 0, 0.55), var(--glow-red-hi);
}

.reel__strip {
  will-change: transform;
}

.reel__strip--spinning {
  filter: blur(2.5px);
}

.reel__item {
  height: var(--reel-item-h);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: clamp(14px, 3.6vw, 19px);
  font-weight: 700;
  letter-spacing: 0.03em;
  white-space: nowrap;
  padding: 0 10px;
}

/* top & bottom shading inside the window, like a curved drum */
.reel__shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.75),
    transparent 30%,
    transparent 70%,
    rgba(0, 0, 0, 0.75)
  );
}

.reel__score {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 900;
  text-align: center;
  padding: 6px 0;
  border-radius: 10px;
  border: 1px solid transparent;
  color: var(--red-hi);
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.reel__score--visible {
  opacity: 1;
  transform: scale(1);
  border-color: rgba(var(--fg-rgb), 0.45);
  text-shadow: var(--glow-red-hi);
}

@media (max-width: 560px) {
  .reel {
    grid-template-columns: 74px 1fr 44px;
    gap: 7px;
  }
}
</style>
