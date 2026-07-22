<script setup>
import AppModal from "./AppModal.vue";
import { useGame } from "../composables/useGame.js";

defineEmits(["close"]);
const { state } = useGame();
</script>

<template>
  <AppModal title="Liste des tricks" @close="$emit('close')">
    <h3 class="section-title">Réussis ({{ state.tricks.length }})</h3>
    <table class="data-table" v-if="state.tricks.length">
      <thead>
        <tr>
          <th>Points</th>
          <th>Nom</th>
          <th>Roues</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(trick, i) in state.tricks" :key="i">
          <td>+{{ trick.score }}</td>
          <td>{{ trick.name }}</td>
          <td class="orig">{{ trick.orig }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">Rien de réussi pour l'instant.</p>

    <h3 class="section-title">Passés ({{ state.skipped.length }})</h3>
    <table class="data-table" v-if="state.skipped.length">
      <tbody>
        <tr v-for="(trick, i) in state.skipped" :key="i">
          <td>{{ trick.score }}</td>
          <td>{{ trick.name }}</td>
          <td class="orig">{{ trick.orig }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">Aucun trick passé. Respect.</p>
  </AppModal>
</template>

<style scoped>
.section-title {
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--red-hi);
  margin: 14px 0 8px;
}

.orig {
  color: var(--text-dim);
  font-size: 14px;
}

.empty {
  color: var(--text-dim);
  padding: 4px 0 10px;
}
</style>
