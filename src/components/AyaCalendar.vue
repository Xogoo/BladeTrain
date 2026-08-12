<script setup>
import { ref, computed } from "vue";
import AyaSessionPanel from "./AyaSessionPanel.vue";
import AyaProgressPanel from "./AyaProgressPanel.vue";
import { useCollection } from "../composables/useCollection.js";

defineEmits(["back"]);

const { collection } = useCollection();
const showProgress = ref(false);

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function pad(n) {
  return String(n).padStart(2, "0");
}
function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function todayKey() {
  return dateKey(new Date());
}

const monthCursor = ref((() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
})());
const openDay = ref(null);

const year = computed(() => monthCursor.value.getFullYear());
const month = computed(() => monthCursor.value.getMonth());

const cells = computed(() => {
  const firstOfMonth = new Date(year.value, month.value, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate();
  const list = [];
  for (let i = 0; i < startOffset; i++) list.push(null);
  for (let d = 1; d <= daysInMonth; d++) list.push(new Date(year.value, month.value, d));
  return list;
});

function prevMonth() {
  monthCursor.value = new Date(year.value, month.value - 1, 1);
}
function nextMonth() {
  monthCursor.value = new Date(year.value, month.value + 1, 1);
}

// Just opens the panel — it decides for itself whether to show the
// summary (a session already exists) or the edit form (it doesn't),
// and NOTHING gets written here. A brand new day only actually
// becomes a session once "Enregistrer" is tapped inside the panel
// (see AyaSessionPanel.vue) — tapping a date to look at it must never
// silently create one.
function onDayTap(d) {
  openDay.value = dateKey(d);
}
</script>

<template>
  <section class="aya rise-in">
    <div class="aya__top">
      <button class="btn btn--ghost" @click="$emit('back')">&lsaquo; Retour</button>
      <button class="btn btn--ghost" @click="showProgress = true">Progression</button>
    </div>

    <h2 class="aya__title sticker-text">
      Aya <span class="aya__title-accent">❤️</span>
    </h2>
    <p class="aya__subtitle">Soul &amp; Groove — carnet de sessions</p>

    <div class="aya__nav">
      <button class="aya__nav-btn" @click="prevMonth" aria-label="Mois précédent">
        &lsaquo;
      </button>
      <span class="aya__month">{{ MONTH_NAMES[month] }} {{ year }}</span>
      <button class="aya__nav-btn" @click="nextMonth" aria-label="Mois suivant">
        &rsaquo;
      </button>
    </div>

    <div class="aya__weekdays">
      <span v-for="(w, i) in WEEKDAYS" :key="i">{{ w }}</span>
    </div>

    <div class="aya__grid">
      <div v-for="(d, i) in cells" :key="i" class="aya__cell-wrap">
        <button
          v-if="d"
          class="aya__cell"
          :class="{
            'aya__cell--has-session': collection.ayaSessions[dateKey(d)],
            'aya__cell--today': dateKey(d) === todayKey(),
          }"
          @click="onDayTap(d)"
        >
          {{ d.getDate() }}
          <span v-if="collection.ayaSessions[dateKey(d)]" class="aya__dot" />
        </button>
      </div>
    </div>

    <button
      v-if="!collection.ayaSessions[todayKey()]"
      class="btn btn--go aya__quick-add"
      @click="onDayTap(new Date())"
    >
      + Session d'aujourd'hui
    </button>

    <AyaSessionPanel
      v-if="openDay"
      :date-key="openDay"
      @close="openDay = null"
    />
    <AyaProgressPanel v-if="showProgress" @close="showProgress = false" />
  </section>
</template>

<style scoped>
.aya {
  width: min(460px, 100%);
  margin: 0 auto;
  padding: 20px 16px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.aya__top {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.aya__title {
  font-size: clamp(26px, 7vw, 34px);
  font-weight: 900;
  text-transform: uppercase;
  margin: 0;
}

.aya__title-accent {
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
}

.aya__subtitle {
  margin: 4px 0 20px;
  font-size: 13px;
  color: var(--text-dim);
}

.aya__nav {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.aya__nav-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--line-strong);
  background: var(--panel-strong);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
}

.aya__month {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  text-transform: uppercase;
}

.aya__weekdays {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 6px;
}
.aya__weekdays span {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
}

.aya__grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 24px;
}

.aya__cell-wrap {
  aspect-ratio: 1;
}

.aya__cell {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.12s ease;
}
.aya__cell:active {
  transform: scale(0.94);
}

.aya__cell--today {
  border-color: rgba(var(--fg-rgb), 0.3);
}

.aya__cell--has-session {
  background: rgba(var(--fg-rgb), 0.06);
  border-color: var(--red-hi);
  color: var(--red-hi);
  font-weight: 700;
}

.aya__dot {
  position: absolute;
  bottom: 5px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--red-hi);
}

.aya__quick-add {
  font-size: 14px;
}
</style>