<script setup>
import { computed, ref } from "vue";
import AppIcon from "./AppIcon.vue";
import {
  CUSTOM_LEVEL,
  LEVELS,
  SOLO_LEVELS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  useSettings,
} from "../composables/useSettings.js";
import { useGame } from "../composables/useGame.js";
import { useCollection } from "../composables/useCollection.js";
import { FAMILIES } from "../game/families.js";
import { useSpeech } from "../composables/useSpeech.js";
import { useBackup } from "../composables/useBackup.js";

const emit = defineEmits(["open-settings"]);

const { settings, applyLevel } = useSettings();
const { startGame, startFamilySession } = useGame();
const { familyIndex, isFamilyComplete, careerProgress, resetCareerProgress } = useCollection();
const { needsBackupReminder, exportBackup } = useBackup();

// Solo has two real choices now: a free Custom session, or training one
// specific family (picked below). Not tied to settings.level — Custom
// already covers that; this just decides what "Démarrer la session" does.
const soloSection = ref("custom"); // 'custom' | 'family'
// FAMILIES is defined in an arbitrary creation order — sorted here by
// tier (career difficulty order) so this dropdown reads the same way
// as the Carrière path, instead of whatever order they were added in.
const soloFamilyOptions = computed(() =>
  [...FAMILIES].sort((a, b) => a.tier - b.tier)
);
const selectedFamilyId = ref(FAMILIES[0]?.id ?? null);
const selectedFamily = computed(
  () => FAMILIES.find((f) => f.id === selectedFamilyId.value) || null
);
const selectedFamilyStep = computed(() =>
  selectedFamily.value ? familyIndex(selectedFamily.value.id) : 0
);
const selectedFamilyDone = computed(() =>
  selectedFamily.value ? isFamilyComplete(selectedFamily.value.id) : false
);

function chooseSoloSection(section) {
  soloSection.value = section;
}

function startSoloSession() {
  if (soloSection.value === "family" && selectedFamily.value) {
    startFamilySession(selectedFamily.value.id, settings, {
      restart: selectedFamilyDone.value,
    });
  } else {
    startGame(settings);
  }
}

// Career: two fully independent progressions (Normal / Switch), each
// walking the same families.js order — see game/families.js `tier`,
// which is now a strict 1..N progression rather than a grouping (each
// tier has exactly one family). Step 1 is always unlocked; every next
// step unlocks once the previous one is fully complete — tapping a
// locked step does nothing. Tapping an unlocked one starts training it
// directly, same mechanism as Solo's "Famille de tricks".
const careerTrack = ref(null); // 'normal' | 'switch' | null

const careerSteps = computed(() => {
  if (!careerTrack.value) {
    return [];
  }
  const families = FAMILIES.filter((family) => family.track === careerTrack.value).sort(
    (a, b) => a.tier - b.tier
  );
  let previousDone = true; // nothing before step 1, so it's always open
  return families.map((family) => {
    const done = isFamilyComplete(family.id);
    const unlocked = previousDone;
    previousDone = done;
    return { family, done, unlocked };
  });
});

// Zigzag path: nodes alternate left (25%) / right (75%), one fixed
// ROW_HEIGHT apart vertically, however many steps there are — smooth
// S-curves between consecutive points (not straight segments) give a
// winding, less rigid line. The SVG connector below is generated from
// these exact same coordinates so it always lines up, no matter how
// the list grows.
const ZIGZAG_ROW_HEIGHT = 128;
const zigzagX = (i) => (i % 2 === 0 ? 25 : 75);
const zigzagY = (i) => i * ZIGZAG_ROW_HEIGHT + ZIGZAG_ROW_HEIGHT / 2;
const zigzagPathHeight = computed(() => careerSteps.value.length * ZIGZAG_ROW_HEIGHT);
const zigzagPath = computed(() => {
  const n = careerSteps.value.length;
  if (!n) {
    return "";
  }
  let d = `M${zigzagX(0)} ${zigzagY(0)}`;
  for (let i = 1; i < n; i++) {
    const [x0, y0] = [zigzagX(i - 1), zigzagY(i - 1)];
    const [x1, y1] = [zigzagX(i), zigzagY(i)];
    const midY = (y0 + y1) / 2;
    d += ` C${x0} ${midY} ${x1} ${midY} ${x1} ${y1}`;
  }
  return d;
});

// Family names carry their own "(Normal)"/"(Switch)" suffix (see
// families.js) so they read fine on their own in the Solo picker — but
// inside the career-track screen that's already the whole context, so
// it's stripped here for a cleaner list.
function familyBaseName(name) {
  return name.replace(/ \((Normal|Switch)\)$/, "");
}

function careerStepPercent(family) {
  return Math.round((familyIndex(family.id) / family.entries.length) * 100);
}

function chooseCareerTrack(track) {
  careerTrack.value = track;
  step.value = "career-track";
}

function startCareerFamily(careerStep) {
  if (!careerStep.unlocked) {
    return;
  }
  startFamilySession(careerStep.family.id, settings, {
    restart: isFamilyComplete(careerStep.family.id),
  });
}

// Career gets its own reset, deliberately separate from the general
// "Réinitialiser la progression" in Collection — same tap-again-to-
// confirm pattern used there and in Session History.
const confirmingCareerReset = ref(false);
function onCareerReset() {
  if (!confirmingCareerReset.value) {
    confirmingCareerReset.value = true;
    return;
  }
  resetCareerProgress();
  confirmingCareerReset.value = false;
}

const MODES = [
  {
    id: "solo",
    name: "Solo",
    tagline: "Session sans fin — construis ta collection de tricks",
  },
  {
    id: "career",
    name: "Carrière",
    tagline: "Deux progressions indépendantes — Normal et Switch",
  },
  {
    id: "group",
    name: "Groupe",
    tagline: "S.K.A.T.E entre potes — loupe et récolte B·L·A·D·E",
  },
];

const step = ref("mode"); // 'mode' | 'career' | 'career-track' | 'setup'

const presetTitle = computed(() =>
  settings.mode === "solo" ? "Mode" : "Difficulté"
);
const presetLevels = computed(() =>
  settings.mode === "solo" ? SOLO_LEVELS : LEVELS
);

const { fadeOutMusic } = useSpeech();

// Committing to a mode ends the intro: the title music fades out here
// (and only here — it keeps playing through the toolbar panels).
function chooseMode(modeId) {
  if (modeId === "career") {
    step.value = "career";
    fadeOutMusic();
    return;
  }
  settings.mode = modeId;
  if (modeId === "solo" && !SOLO_LEVELS.some((l) => l.id === settings.level)) {
    applyLevel(CUSTOM_LEVEL);
  }
  step.value = "setup";
  fadeOutMusic();
}

function selectLevel(levelId) {
  applyLevel(levelId);
  if (levelId === CUSTOM_LEVEL) {
    emit("open-settings");
  }
}

function addPlayer() {
  if (settings.players.length < MAX_PLAYERS) {
    settings.players.push(`Joueur ${settings.players.length + 1}`);
  }
}

function removePlayer(index) {
  if (settings.players.length > MIN_PLAYERS) {
    settings.players.splice(index, 1);
  }
}
</script>

<template>
  <!-- step 1: pick a mode, nothing else -->
  <section v-if="step === 'mode'" class="start rise-in">
    <div class="start__logo">
      <img class="start__logo-mark" src="/img/blade-skater-silhouette.png" alt="" aria-hidden="true" />
      <h1 class="start__logo-text sticker-text">BLADE</h1>
    </div>

    <div class="start__modes">
      <button
        v-for="mode in MODES"
        :key="mode.id"
        class="mode-card panel"
        @click="chooseMode(mode.id)"
      >
        <span class="mode-card__name">{{ mode.name }}</span>
        <span class="mode-card__go"><AppIcon name="play" :size="16" /></span>
      </button>
    </div>

    <div v-if="needsBackupReminder" class="backup-reminder panel">
      <span>Ça fait un moment — tu sauvegardes ta progression ?</span>
      <button class="btn" @click="exportBackup">Sauvegarder maintenant</button>
    </div>
  </section>

  <!-- step 1b: Carrière chosen — Normal vs Switch, each own progress -->
  <section v-else-if="step === 'career'" class="start setup rise-in">
    <div class="setup__top">
      <button class="btn btn--ghost setup__back" @click="step = 'mode'">
        &lsaquo; Retour
      </button>
    </div>
    <h2 class="setup__title sticker-text">Carrière</h2>
    <p class="setup__hint setup__hint--standalone">
      Deux progressions totalement indépendantes — chacune avance à son
      propre rythme.
    </p>

    <div class="career-tracks">
      <button
        v-for="track in ['normal', 'switch']"
        :key="track"
        class="career-track panel"
        @click="chooseCareerTrack(track)"
      >
        <span class="career-track__name">{{ track === "normal" ? "Normal" : "Switch" }}</span>
        <span class="career-track__percent">{{ careerProgress(track).percent }}%</span>
        <div class="career-track__bar">
          <div
            class="career-track__bar-fill"
            :style="{ width: careerProgress(track).percent + '%' }"
          />
        </div>
        <span class="career-track__count">
          {{ careerProgress(track).landed }}/{{ careerProgress(track).total }} tricks
        </span>
      </button>
    </div>

    <div class="actions">
      <button
        class="btn btn--ghost reset-btn"
        :class="{ 'reset-btn--confirm': confirmingCareerReset }"
        @click="onCareerReset"
        @blur="confirmingCareerReset = false"
      >
        {{
          confirmingCareerReset
            ? "Retape pour tout effacer"
            : "Réinitialiser la Carrière"
        }}
      </button>
    </div>
  </section>

  <!-- step 1c: one Career track — a path of steps, each unlocking the
       next once landed; tap an unlocked one to train it -->
  <section v-else-if="step === 'career-track'" class="start setup rise-in">
    <div class="setup__top">
      <button class="btn btn--ghost setup__back" @click="step = 'career'">
        &lsaquo; Retour
      </button>
    </div>
    <h2 class="setup__title sticker-text">
      Carrière — {{ careerTrack === "normal" ? "Normal" : "Switch" }}
    </h2>

    <div class="career-path" :style="{ height: zigzagPathHeight + 'px' }">
      <svg
        class="career-path__line"
        :viewBox="`0 0 100 ${zigzagPathHeight}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path :d="zigzagPath" />
      </svg>

      <div
        v-for="(careerStep, i) in careerSteps"
        :key="careerStep.family.id"
        class="career-step"
        :class="{
          'career-step--done': careerStep.done,
          'career-step--locked': !careerStep.unlocked,
        }"
        :style="{ top: zigzagY(i) + 'px', left: zigzagX(i) + '%' }"
      >
        <button
          class="career-step__row"
          :disabled="!careerStep.unlocked"
          @click="startCareerFamily(careerStep)"
        >
          <span class="career-step__node">
            <AppIcon v-if="careerStep.done" name="check" :size="24" />
            <AppIcon v-else-if="!careerStep.unlocked" name="lock" :size="22" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="career-step__info">
            <span class="career-step__name">{{ familyBaseName(careerStep.family.name) }}</span>
            <span class="career-step__progress">
              <template v-if="careerStep.done">Terminée ✓</template>
              <template v-else-if="careerStep.unlocked">
                {{ careerStepPercent(careerStep.family) }}%
              </template>
              <template v-else>Verrouillée</template>
            </span>
          </span>
        </button>
      </div>
    </div>
  </section>

  <!-- step 2: difficulty + mode specifics + start -->
  <section v-else class="start setup rise-in">
    <div class="setup__top">
      <button class="btn btn--ghost setup__back" @click="step = 'mode'">
        &lsaquo; Retour
      </button>
    </div>
    <h2 class="setup__title sticker-text">
      {{ settings.mode === "solo" ? "Session Solo" : "Partie de groupe" }}
    </h2>

    <div class="setup__section">
      <span class="setup__label">{{ presetTitle }}</span>
      <div class="pills">
        <template v-if="settings.mode === 'solo'">
          <button
            class="pill"
            :class="{ 'pill--active': soloSection === 'custom' }"
            @click="chooseSoloSection('custom')"
          >
            Custom
          </button>
          <button
            class="pill"
            :class="{ 'pill--active': soloSection === 'family' }"
            @click="chooseSoloSection('family')"
          >
            Famille de tricks
          </button>
        </template>
        <template v-else>
          <button
            v-for="level in presetLevels"
            :key="level.id"
            class="pill"
            :class="{ 'pill--active': settings.level === level.id }"
            :title="level.tagline"
            @click="selectLevel(level.id)"
          >
            {{ level.name }}
          </button>
        </template>
      </div>
      <p v-if="settings.mode !== 'solo'" class="setup__hint">
        {{ presetLevels.find((l) => l.id === settings.level)?.tagline }}
      </p>
      <p v-else-if="soloSection === 'custom'" class="setup__hint">Tes propres règles</p>
    </div>

    <div v-if="settings.mode === 'solo' && soloSection === 'family'" class="setup__section">
      <span class="setup__label">Choisis une famille</span>
      <div class="family-picker">
        <select class="select" v-model="selectedFamilyId">
          <option v-for="family in soloFamilyOptions" :key="family.id" :value="family.id">
            {{ family.name }}
          </option>
        </select>
        <span v-if="selectedFamily" class="family-picker__progress">
          <template v-if="selectedFamilyDone">Terminée ✓</template>
          <template v-else>{{ selectedFamilyStep }}/{{ selectedFamily.entries.length }}</template>
        </span>
      </div>
      <p class="setup__hint">
        Un trick précis à la fois, dans l'ordre — il faut le réussir pour
        passer au suivant.
      </p>
    </div>

    <p v-if="settings.mode === 'solo'" class="setup__hint setup__hint--standalone">
      Pas de fin de partie — tourne aussi longtemps que tu veux.
      <template v-if="soloSection === 'custom'">
        Les roues favorisent les tricks que tu n'as pas encore réussis.
      </template>
    </p>

    <template v-else>
      <div class="setup__section">
        <span class="setup__label">Joueurs</span>
        <div class="players">
          <div
            v-for="(name, i) in settings.players"
            :key="i"
            class="player-row"
          >
            <input
              v-model="settings.players[i]"
              class="player-input"
              type="text"
              maxlength="14"
              :placeholder="`Joueur ${i + 1}`"
            />
            <button
              class="stepper__btn"
              :disabled="settings.players.length <= MIN_PLAYERS"
              :aria-label="`Retirer le joueur ${i + 1}`"
              @click="removePlayer(i)"
            >
              &times;
            </button>
          </div>
          <button
            class="btn btn--ghost players__add"
            :disabled="settings.players.length >= MAX_PLAYERS"
            @click="addPlayer()"
          >
            + Ajouter un joueur
          </button>
        </div>
      </div>

      <div class="setup__section">
        <p class="setup__hint">
          Comme un S.K.A.T.E. — tout le monde tente le même trick. Loupe et tu
          récoltes une lettre de B&middot;L&middot;A&middot;D&middot;E ;
          cinq lettres et t'es éliminé. Le dernier debout gagne.
        </p>
      </div>
    </template>

    <button class="btn btn--go setup__go" @click="settings.mode === 'solo' ? startSoloSession() : startGame(settings)">
      <AppIcon name="play" :size="20" />
      {{ settings.mode === "solo" ? "Démarrer la session" : "Démarrer la partie" }}
    </button>
  </section>
</template>

<style scoped>
.start {
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 34px 16px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}

/* full-width banner like the original start screen */
.start__logo {
  width: min(500px, 95%);
  padding-bottom: 16px;
  border-bottom: 1px solid #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.start__logo-mark {
  width: min(280px, 60%);
  height: auto;
  filter: drop-shadow(0 6px 20px rgba(var(--fg-rgb), 0.25));
}

.start__logo-text {
  font-family: var(--font-display);
  font-size: clamp(64px, 18vw, 108px);
  font-weight: 900;
  letter-spacing: 0.06em;
  line-height: 1;
  filter: drop-shadow(0 8px 34px rgba(var(--fg-rgb), 0.35));
}

.start__modes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-top: 14px;
}

.backup-reminder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  margin-top: 12px;
  padding: 12px 14px;
  font-size: 13px;
  color: var(--text-dim);
}

.mode-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 24px 20px;
  text-align: left;
  transition: transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.mode-card:hover {
  transform: translateY(-2px);
  border-color: var(--red);
  box-shadow: var(--glow-red);
}

.mode-card__name {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 24px;
  text-transform: uppercase;
  color: var(--text);
}

.mode-card:hover .mode-card__name {
  color: var(--red);
  text-shadow: var(--glow-red);
}

.mode-card__go {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--red-hi);
}

/* ---------- setup step ---------- */

.setup {
  align-items: stretch;
  text-align: left;
  gap: 18px;
}

.setup__top {
  display: flex;
}

.setup__back {
  font-size: 12px;
  padding: 7px 12px;
}

.setup__title {
  font-size: clamp(24px, 6vw, 32px);
  text-transform: uppercase;
  text-align: center;
}

.setup__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setup__label {
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pill {
  flex: 1;
  min-width: 72px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 11px 10px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: var(--panel-strong);
  color: var(--text-dim);
  transition: color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.pill:hover {
  color: var(--text);
  border-color: var(--red-hi);
}

.pill--active {
  color: var(--cta-text);
  border-color: var(--red);
  background: linear-gradient(135deg, var(--red-hi), var(--red));
  box-shadow: var(--glow-red);
}

.setup__hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-dim);
}

.family-picker {
  display: flex;
  align-items: center;
  gap: 10px;
}

.family-picker .select {
  flex: 1;
  font-family: var(--font-body);
  font-size: 15px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--bg-1);
  color: var(--text);
}

/* Native <option> elements don't always inherit the select's own
   background/color on some mobile browsers, leaving unselected rows
   looking transparent until hovered — set them explicitly. */
.family-picker .select option {
  background: var(--bg-1);
  color: var(--text);
}

.family-picker__progress {
  flex: none;
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--red-hi);
  white-space: nowrap;
}

.setup__hint--standalone {
  margin-top: -6px;
  margin-bottom: 6px;
}

/* ---------- career screens ---------- */

.career-tracks {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-top: 4px;
}

.career-track {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 4px 10px;
  padding: 18px 20px;
  text-align: left;
  transition: transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.career-track:hover {
  transform: translateY(-2px);
  border-color: var(--red);
  box-shadow: var(--glow-red);
}

.career-track__name {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 20px;
  text-transform: uppercase;
  color: var(--text);
}

.career-track__percent {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--red-hi);
}

.career-track__bar {
  grid-column: 1 / -1;
  height: 6px;
  border-radius: 999px;
  background: var(--bg-1);
  overflow: hidden;
}

.career-track__bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--red-hi), var(--red));
  transition: width 0.3s ease;
}

.career-track__count {
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--text-dim);
}

.career-path {
  position: relative;
  width: 100%;
}

.career-path__line {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.career-path__line path {
  fill: none;
  stroke: var(--line-strong);
  stroke-width: 2;
  stroke-dasharray: 6 7;
  vector-effect: non-scaling-stroke;
}

.career-step {
  position: absolute;
  transform: translate(-50%, -50%);
}

.career-step__row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 12px;
  transition: background 0.15s ease;
}

.career-step__row:not(:disabled):hover {
  background: var(--panel-strong);
}

.career-step__row:disabled {
  cursor: default;
}

.career-step__node {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 20px;
  border: 2px solid var(--line-strong);
  background: var(--bg-1);
  color: var(--text-dim);
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease,
    box-shadow 0.15s ease;
}

.career-step:not(.career-step--locked):not(.career-step--done) .career-step__node {
  border-color: var(--red);
  color: var(--red-hi);
  box-shadow: var(--glow-red);
}

.career-step--done .career-step__node {
  border-color: var(--red);
  background: linear-gradient(135deg, var(--red-hi), var(--red));
  color: var(--cta-text);
}

.career-step--locked .career-step__node {
  opacity: 0.55;
}

.career-step__info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  max-width: 128px;
  text-align: center;
}

.career-step__name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--text);
}

.career-step--locked .career-step__name {
  color: var(--text-dim);
}

.career-step__progress {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--text-dim);
  white-space: nowrap;
}

.career-step--done .career-step__progress {
  color: var(--red-hi);
}

.actions {
  display: flex;
  justify-content: center;
  margin-top: 18px;
}

.reset-btn {
  font-size: 13px;
}

.reset-btn--confirm {
  color: var(--red-hi);
  border-color: rgba(var(--fg-rgb), 0.6);
  box-shadow: 0 0 10px rgba(var(--fg-rgb), 0.2);
}

.players {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-row {
  display: flex;
  gap: 8px;
}

.player-input {
  flex: 1;
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  background: var(--bg-2);
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  padding: 9px 12px;
}

.player-input:focus {
  outline: none;
  border-color: var(--red-hi);
  box-shadow: var(--glow-red-hi);
}

.players__add {
  align-self: flex-start;
  font-size: 12px;
  padding: 8px 14px;
}

.spins-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stepper__btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--line-strong);
  background: var(--panel-strong);
  font-size: 20px;
  color: var(--text);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.stepper__btn:hover {
  border-color: var(--red-hi);
  box-shadow: var(--glow-red-hi);
}

.stepper__btn:disabled {
  opacity: 0.35;
  pointer-events: none;
}

.stepper__value {
  min-width: 44px;
  text-align: center;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 20px;
}

.setup__go {
  margin-top: 8px;
  font-size: 18px;
  padding: 16px 34px;
}
</style>