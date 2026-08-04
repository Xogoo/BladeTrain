<script>
// Module-level (shared across every AppModal instance) stack of
// currently-open modals, topmost last. Needed because modals can stack
// (e.g. Réglages -> "Aperçu des tricks possibles" -> Créer une famille
// perso) — without this, Escape would fire every open modal's own
// keydown listener at once and close all of them together instead of
// just the one actually on top.
const openModals = [];
</script>

<script setup>
import { onMounted, onUnmounted } from "vue";
import AppIcon from "./AppIcon.vue";

defineProps({
  title: { type: String, required: true },
});
const emit = defineEmits(["close"]);

// Escape closes the modal — standard keyboard/accessibility expectation,
// and the only way to dismiss it without a mouse/touch tap otherwise.
const self = {};
function onKeydown(event) {
  if (event.key === "Escape" && openModals[openModals.length - 1] === self) {
    emit("close");
  }
}
onMounted(() => {
  openModals.push(self);
  document.addEventListener("keydown", onKeydown);
});
onUnmounted(() => {
  const index = openModals.indexOf(self);
  if (index !== -1) {
    openModals.splice(index, 1);
  }
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal panel rise-in" role="dialog" :aria-label="title">
        <header class="modal__header">
          <h2>{{ title }}</h2>
          <button class="btn btn--ghost btn--icon" aria-label="Fermer" @click="emit('close')">
            <AppIcon name="close" />
          </button>
        </header>
        <div class="modal__body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(4, 6, 16, 0.72);
  backdrop-filter: blur(6px);
  overscroll-behavior-x: none;
  touch-action: pan-y pinch-zoom;
}

.modal {
  width: min(720px, 100%);
  max-height: 88dvh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--bg-2), var(--bg-1));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
  overscroll-behavior-x: none;
  touch-action: pan-y pinch-zoom;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}

.modal__header h2 {
  font-size: 18px;
  text-transform: uppercase;
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
}

.modal__body {
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-x: none;
  /* Only vertical panning is a real gesture in here — there's nothing
     to scroll to sideways. Without this, a touch drag that's even
     slightly diagonal can get misread as a horizontal swipe (rubber-
     band bounce, or worse, the OS's own edge-swipe navigation), which
     reads as the whole screen "swiping" instead of just scrolling.
     pinch-zoom is listed explicitly alongside pan-y — omitting it
     doesn't just fall back to the default, it actively disables
     two-finger zoom inside every modal (Réglages, Historique,
     Collection...), which is never supposed to be blocked; only the
     double-tap-zoom gesture (see base.css's touch-action:
     manipulation) is meant to be off. */
  touch-action: pan-y pinch-zoom;
  padding: 20px;
}
</style>