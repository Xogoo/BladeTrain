<script setup>
import { computed, ref } from "vue";

// Tap/click/drag anywhere on the wheel to pick a color: angle sets the
// hue (0-359°), distance from center sets the saturation (0-1, 1 = rim
// = fully vivid, fading towards a pale/neutral center) — matching the
// reference wheel's radial fade instead of ignoring it. Every accent
// color is derived from both (see game/accentPalette.js).
const props = defineProps({
  hue: { type: Number, required: true },
  saturation: { type: Number, default: 1 },
});
const emit = defineEmits(["update:hue", "update:saturation"]);

const wheelRef = ref(null);
const dragging = ref(false);

function pickFromEvent(event) {
  const rect = wheelRef.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const maxRadius = rect.width / 2;
  const point = event.touches ? event.touches[0] : event;
  const dx = point.clientX - cx;
  const dy = point.clientY - cy;
  // atan2 measures from the 3 o'clock position, counterclockwise in
  // screen coordinates (y grows downward) — rotate by +90° to match
  // the wheel's own conic-gradient, which starts at 12 o'clock and
  // goes clockwise (CSS "from 0deg" convention).
  const hue = Math.round(((Math.atan2(dy, dx) * (180 / Math.PI) + 90 + 360) % 360));
  const distance = Math.sqrt(dx * dx + dy * dy);
  const saturation = Math.max(0, Math.min(1, distance / maxRadius));
  emit("update:hue", hue);
  emit("update:saturation", Math.round(saturation * 100) / 100);
}

function onPointerDown(event) {
  dragging.value = true;
  pickFromEvent(event);
}
function onPointerMove(event) {
  if (dragging.value) {
    pickFromEvent(event);
  }
}
function onPointerUp() {
  dragging.value = false;
}

// Handle position: follows the actual picked hue/saturation, so it
// genuinely reflects where the last pick landed — not a decorative dot
// stuck at a fixed distance from center regardless of what's selected.
const handleStyle = computed(() => {
  // Convert back from "0°=top, clockwise" to standard math angle for
  // trig (0°=right, counterclockwise) — inverse of the conversion above.
  const mathAngle = ((90 - props.hue + 360) % 360) * (Math.PI / 180);
  const radiusPercent = Math.max(0, Math.min(1, props.saturation)) * 46;
  const x = 50 + radiusPercent * Math.cos(mathAngle);
  const y = 50 - radiusPercent * Math.sin(mathAngle);
  return { left: `${x}%`, top: `${y}%` };
});
</script>

<template>
  <div
    ref="wheelRef"
    class="color-wheel"
    @mousedown="onPointerDown"
    @mousemove="onPointerMove"
    @mouseup="onPointerUp"
    @mouseleave="onPointerUp"
    @touchstart.prevent="onPointerDown"
    @touchmove.prevent="onPointerMove"
    @touchend="onPointerUp"
  >
    <div class="color-wheel__handle" :style="handleStyle" />
  </div>
</template>

<style scoped>
.color-wheel {
  position: relative;
  width: min(240px, 70vw);
  aspect-ratio: 1;
  border-radius: 50%;
  margin: 0 auto;
  cursor: pointer;
  touch-action: none;
  background:
    radial-gradient(circle, #fff, rgba(255, 255, 255, 0) 68%),
    conic-gradient(
      from 0deg,
      #ff0000,
      #ffae00,
      #fbff00,
      #23ff00,
      #00fff2,
      #0026ff,
      #cc00ff,
      #ff0080,
      #ff0000
    );
  box-shadow: 0 0 0 3px var(--bg-1), 0 0 0 4px var(--line-strong), 0 8px 24px rgba(0, 0, 0, 0.35);
}

.color-wheel__handle {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 3px solid #fff;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}
</style>