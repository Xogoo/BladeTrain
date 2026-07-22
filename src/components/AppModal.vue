<script setup>
import AppIcon from "./AppIcon.vue";

defineProps({
  title: { type: String, required: true },
});
const emit = defineEmits(["close"]);
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
}

.modal {
  width: min(720px, 100%);
  max-height: 88dvh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--bg-2), var(--bg-1));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
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
  padding: 20px;
}
</style>
