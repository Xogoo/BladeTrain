<script setup>
import { computed, ref } from "vue";
import AppIcon from "./AppIcon.vue";
import CollectionPanel from "./CollectionPanel.vue";
import {
  CUSTOM_LEVEL,
  LEVELS,
  SOLO_LEVELS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  useSettings,
} from "../composables/useSettings.js";
import { useGame } from "../composables/useGame.js";
import { BADGES, useCollection } from "../composables/useCollection.js";
import { useSpeech } from "../composables/useSpeech.js";
import { useBackup } from "../composables/useBackup.js";

const emit = defineEmits(["open-settings"]);

const { settings, applyLevel } = useSettings();
const { startGame } = useGame();
const { uniqueTrickCount, landedGrindCount, totalGrinds, earnedBadges } =
  useCollection();
const { needsBackupReminder, exportBackup } = useBackup();

const MODES = [
  {
    id: "solo",
    name: "Solo",
    tagline: "Session sans fin — construis ta collection de tricks",
  },
  {
    id: "group",
    name: "Groupe",
    tagline: "S.K.A.T.E entre potes — loupe et récolte B·L·A·D·E",
  },
];

const step = ref("mode"); // 'mode' | 'setup'
const showCollection = ref(false);

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
    <p class="start__tagline">
      Lance la machine à sous &middot; réussis le trick &middot; empile les points
    </p>

    <div class="start__modes">
      <button
        v-for="mode in MODES"
        :key="mode.id"
        class="mode-card panel"
        @click="chooseMode(mode.id)"
      >
        <span class="mode-card__name">{{ mode.name }}</span>
        <span class="mode-card__tagline">{{ mode.tagline }}</span>
        <span class="mode-card__go"><AppIcon name="play" :size="16" /></span>
      </button>
    </div>

    <div v-if="needsBackupReminder" class="backup-reminder panel">
      <span>Ça fait un moment — tu sauvegardes ta progression ?</span>
      <button class="btn" @click="exportBackup">Sauvegarder maintenant</button>
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
      </div>
      <p class="setup__hint">
        {{ presetLevels.find((l) => l.id === settings.level)?.tagline }}
      </p>
    </div>

    <div v-if="settings.mode === 'solo'" class="setup__section">
      <button class="collection-strip panel" @click="showCollection = true">
        <AppIcon name="trophy" :size="16" />
        <span>
          {{ uniqueTrickCount }} tricks &middot; {{ landedGrindCount }}/{{
            totalGrinds
          }}
          grinds &middot; {{ earnedBadges.length }}/{{ BADGES.length }} badges
        </span>
        <span class="collection-strip__arrow">&rsaquo;</span>
      </button>
      <p class="setup__hint">
        Pas de fin de partie — tourne aussi longtemps que tu veux. Les roues
        favorisent les tricks que tu n'as pas encore réussis.
      </p>
    </div>

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

    <button class="btn btn--go setup__go" @click="startGame(settings)">
      <AppIcon name="play" :size="20" />
      {{ settings.mode === "solo" ? "Démarrer la session" : "Démarrer la partie" }}
    </button>

    <CollectionPanel v-if="showCollection" @close="showCollection = false" />
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

.start__tagline {
  color: var(--text-dim);
  font-size: 17px;
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

.mode-card__tagline {
  font-size: 15px;
  color: var(--text-dim);
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

.collection-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  font-size: 15px;
  color: var(--text);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.collection-strip:hover {
  border-color: var(--red-hi);
  box-shadow: var(--glow-red-hi);
}

.collection-strip__arrow {
  margin-left: auto;
  font-size: 22px;
  line-height: 1;
  color: var(--red-hi);
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
