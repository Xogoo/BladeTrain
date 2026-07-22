<script setup>
import { computed } from "vue";
import AppModal from "./AppModal.vue";
import { explainTrick } from "../game/trickExplainer.js";

const props = defineProps({
  trick: { type: Object, required: true }, // { name, orig }
});
defineEmits(["close"]);

const rows = computed(() =>
  explainTrick({ parsed: props.trick.name, orig: props.trick.orig })
);
</script>

<template>
  <AppModal :title="trick.name" @close="$emit('close')">
    <p class="orig">Roues : {{ trick.orig }}</p>
    <div v-for="row in rows" :key="row.title" class="explain-row">
      <a
        v-if="row.thumbUrl"
        :href="row.url || 'http://skateyeg.com/bog/'"
        target="_blank"
        rel="noopener"
      >
        <img class="explain-row__thumb" :src="row.thumbUrl" :alt="row.title" />
      </a>
      <div>
        <h3 class="explain-row__title">
          <a v-if="row.url" :href="row.url" target="_blank" rel="noopener">{{ row.title }}</a>
          <template v-else>{{ row.title }}</template>
        </h3>
        <!-- comments come from the local trick database and may contain links -->
        <p class="explain-row__comment" v-html="row.comment" />
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.orig {
  color: var(--text-dim);
  font-size: 15px;
  margin-bottom: 16px;
}

.explain-row {
  display: flex;
  gap: 14px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
}

.explain-row__thumb {
  width: 92px;
  height: 92px;
  flex: none;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid var(--line-strong);
}

.explain-row__title {
  font-size: 16px;
  color: var(--red-hi);
  margin-bottom: 4px;
}

.explain-row__comment {
  font-size: 16px;
  color: var(--text);
}
</style>
