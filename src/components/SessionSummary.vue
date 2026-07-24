<script setup>
import { computed } from "vue";
import AppIcon from "./AppIcon.vue";
import { useCollection } from "../composables/useCollection.js";

const props = defineProps({
  sessionId: { type: [Number, String], required: true },
});

const { sessionById, sessionLands, sessionBadges, sessionFamilyProgress } =
  useCollection();

const session = computed(() => sessionById(props.sessionId));
const lands = computed(() =>
  [...sessionLands(props.sessionId)].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  )
);

const avgTries = computed(() => {
  const s = session.value;
  if (!s || s.landed === 0) return 0;
  return Math.round((s.totalTries / s.landed) * 10) / 10;
});

const attempted = computed(() => (session.value?.landed || 0) + (session.value?.skipped || 0));

const totalScore = computed(() =>
  lands.value.reduce((sum, land) => sum + (land.score || 0), 0)
);

const bestTrick = computed(() => {
  if (!lands.value.length) return null;
  return [...lands.value].sort((a, b) => b.score - a.score)[0];
});

const badges = computed(() => sessionBadges(props.sessionId));
const familyProgress = computed(() => sessionFamilyProgress(props.sessionId));

function familyBaseName(name) {
  return name.replace(/ \((Normal|Switch)\)$/, "");
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <div v-if="session" class="summary">
    <p class="summary__date">{{ formatDate(session.startedAt) }}</p>

    <div class="summary__score">
      <span class="summary__score-value">{{ totalScore }}</span>
      <span class="summary__score-label">point{{ totalScore === 1 ? "" : "s" }}</span>
    </div>

    <div class="summary__stats">
      <div class="summary__stat">
        <span class="summary__value">{{ session.landed }}</span>
        <span class="summary__label">réussis</span>
      </div>
      <div class="summary__stat">
        <span class="summary__value">{{ session.skipped }}</span>
        <span class="summary__label">passés</span>
      </div>
      <div class="summary__stat">
        <span class="summary__value">{{ attempted }}</span>
        <span class="summary__label">tentés</span>
      </div>
      <div class="summary__stat">
        <span class="summary__value">{{ avgTries }}</span>
        <span class="summary__label">essais moy.</span>
      </div>
    </div>

    <div v-if="bestTrick" class="summary__highlight">
      <AppIcon name="zap" :size="16" />
      <span
        ><strong>Meilleur trick :</strong> {{ bestTrick.trickName }} (+{{
          bestTrick.score
        }})</span
      >
    </div>

    <div v-if="familyProgress.length" class="summary__section">
      <h3 class="summary__section-title">Familles entraînées</h3>
      <div class="summary__families">
        <span v-for="fp in familyProgress" :key="fp.family.id" class="summary__family-pill">
          {{ familyBaseName(fp.family.name) }} +{{ fp.count }}
        </span>
      </div>
    </div>

    <div v-if="badges.length" class="summary__section">
      <h3 class="summary__section-title">Badges débloqués</h3>
      <div class="summary__badges">
        <div v-for="badge in badges" :key="badge.id" class="summary__badge">
          <AppIcon name="trophy" :size="16" />
          <span>{{ badge.name }}</span>
        </div>
      </div>
    </div>

    <ul v-if="lands.length" class="summary__list">
      <li v-for="(land, i) in lands" :key="i">
        <span class="summary__list-name">{{ land.trickName }}</span>
        <span class="summary__list-tries"
          >{{ land.tries }} essai{{ land.tries === 1 ? "" : "s" }}</span
        >
      </li>
    </ul>
    <p v-else class="summary__empty">Aucun trick réussi pendant cette session.</p>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.summary__date {
  font-size: 13px;
  color: var(--text-dim);
  text-align: center;
}

.summary__score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.summary__score-value {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 900;
  line-height: 1;
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
}

.summary__score-label {
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.summary__highlight {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--panel);
  border: 1px solid var(--line);
  font-size: 13px;
  color: var(--text);
}

.summary__highlight strong {
  color: var(--red-hi);
}

.summary__section-title {
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin: 0 0 8px;
}

.summary__families {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.summary__family-pill {
  font-family: var(--font-display);
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  color: var(--red-hi);
}

.summary__badges {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary__badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--panel);
  border: 1px solid var(--line);
  font-size: 13px;
  color: var(--text);
}

.summary__stats {
  display: flex;
  gap: 8px;
}

.summary__stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 6px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
}

.summary__value {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 900;
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
}

.summary__label {
  font-family: var(--font-display);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.summary__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary__list li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--panel);
  border: 1px solid var(--line);
  font-size: 14px;
}

.summary__list-name {
  color: var(--text);
}

.summary__list-tries {
  flex: none;
  color: var(--red-hi);
  font-family: var(--font-display);
  font-size: 12px;
}

.summary__empty {
  color: var(--text-dim);
  font-size: 14px;
  text-align: center;
  padding: 10px 0;
}
</style>