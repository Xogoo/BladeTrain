<script setup>
import { computed, ref, watch } from "vue";
import AppIcon from "./AppIcon.vue";
import FamilyHistoryPanel from "./FamilyHistoryPanel.vue";
import SettingsPanel from "./SettingsPanel.vue";
import TargetedTrainingHistoryPanel from "./TargetedTrainingHistoryPanel.vue";
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

const { settings, applyLevel, saveCustomFamily, deleteCustomFamily } = useSettings();
const { startGame, startFamilySession, startMixSession, startWeakPointsSession, WEAK_POINTS_FAMILY_ID, startComboCareer, startComboMix, startDrillSession, DRILL_FAMILY_ID, hasOpenSessionToday, endOpenSession, danglingSession, resumeDanglingSession, closeDanglingSession, state } =
  useGame();
const {
  familyIndex,
  isFamilyComplete,
  familyLifetimeLandedCount,
  careerProgress,
  resetCareerProgress,
  weakPointsEntries,
  drillList,
} = useCollection();
const { needsBackupReminder, exportBackup, exportFamilies, importFamilies } = useBackup();

function startSoloSession() {
  startGame(settings);
}

// This picker (and the Mix family-selection list further down) is a
// browsing/reference view, not an active session's own checklist —
// "how far along am I on this family overall" reads best as lifetime
// achievement (see familyLifetimeLandedCount's own comment), same
// idea as CollectionPanel's summary. Only Career persists a progress
// bucket at all now (see progressFamilyId in useGame.js) — everything
// else resets to 0 each session, so there's nothing else to read here
// besides "have I ever landed this, in any mode/session".
function familyLifetimeDone(family) {
  return familyLifetimeLandedCount(family) === family.entries.length;
}

function familyPercent(family) {
  return family.entries.length
    ? Math.round((familyLifetimeLandedCount(family) / family.entries.length) * 100)
    : 0;
}

// What each <select> option actually shows — native <option> elements
// can't hold rich markup, so the done/not-done color and the percent
// both have to live in this one plain-text label.
function familyOptionLabel(family) {
  return familyLifetimeDone(family)
    ? `${familyBaseName(family.name)} — Terminée ✓`
    : `${familyBaseName(family.name)} — ${familyPercent(family)}%`;
}
function familyOptionColor(family) {
  return familyLifetimeDone(family)
    ? "var(--green-hi)"
    : "var(--danger-hi)";
}

// Famille mode: built-in ("Familles de tricks") or personal
// ("Familles perso") — same picker pattern, same training mechanism
// (startFamilySession), just two different lists.
const familySection = ref("builtin"); // 'builtin' | 'personal'
function chooseFamilySection(section) {
  familySection.value = section;
}

// Which sub-view the Famille step shows: training one family at a
// time, or Mix (several families drawn from together at once). Both
// live under the same step ('family') and back button. Defaults to
// "mix" when returning here via the session report's "Retour" button
// after a Mix session specifically (see pendingReturnStep below).
const familyView = ref(state.pendingReturnStep === "mix" ? "mix" : "family"); // 'family' | 'mix'

// FAMILIES is defined in an arbitrary creation order — sorted here by
// tier (career difficulty order) so this dropdown reads the same way
// as the Carrière path, instead of whatever order they were added in.
const builtinFamilyOptions = computed(() => [...FAMILIES].sort((a, b) => a.tier - b.tier));
const selectedBuiltinFamilyId = ref(FAMILIES[0]?.id ?? null);

const selectedCustomFamilyId = ref(null);
watch(
  () => settings.customFamilies,
  (list) => {
    const visible = list.filter((f) => f.id !== "weak-points");
    if (!visible.some((f) => f.id === selectedCustomFamilyId.value)) {
      selectedCustomFamilyId.value = visible[0]?.id ?? null;
    }
  },
  { immediate: true, deep: true }
);

const confirmingFamilyDelete = ref(false);
const showFamilyHistory = ref(false);
const showTrainingHistory = ref(false);
function onDeleteCustomFamily() {
  if (!selectedCustomFamilyId.value) {
    return;
  }
  if (!confirmingFamilyDelete.value) {
    confirmingFamilyDelete.value = true;
    return;
  }
  deleteCustomFamily(selectedCustomFamilyId.value);
  confirmingFamilyDelete.value = false;
}

// Export/import just the personal families — separate from the full
// progress backup in Réglages, for sharing a family with someone else
// or moving it between devices without dragging everything else along.
const familyImportStatus = ref("");
const familyImportInput = ref(null);

async function onExportFamiliesClick() {
  familyImportStatus.value = "";
  const result = await exportFamilies();
  if (result.method === "share") {
    familyImportStatus.value = "Partagé — choisis où l'envoyer.";
  } else if (result.method === "download") {
    familyImportStatus.value = "Enregistré en fichier.";
  }
  // "cancelled" : le joueur a fermé le menu de partage sans rien choisir, on ne dit rien.
}

function onImportFamiliesFileChosen(event) {
  const file = event.target.files?.[0];
  event.target.value = ""; // permet de reprendre le même fichier plus tard
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const { imported, skipped } = importFamilies(payload);
      if (imported === 0) {
        familyImportStatus.value = skipped
          ? "Rien à importer — déjà toutes présentes."
          : "Aucune famille trouvée dans ce fichier.";
      } else {
        familyImportStatus.value = `${imported} famille${imported > 1 ? "s" : ""} importée${imported > 1 ? "s" : ""}${
          skipped ? ` (${skipped} déjà présente${skipped > 1 ? "s" : ""}, ignorée${skipped > 1 ? "s" : ""})` : ""
        }.`;
      }
    } catch (err) {
      familyImportStatus.value = `Impossible d'importer ce fichier : ${err.message}`;
    }
  };
  reader.readAsText(file);
}

const selectedFamilyId = computed(() =>
  familySection.value === "builtin" ? selectedBuiltinFamilyId.value : selectedCustomFamilyId.value
);
const selectedFamilyObject = computed(() =>
  familySection.value === "builtin"
    ? builtinFamilyOptions.value.find((f) => f.id === selectedFamilyId.value)
    : visibleCustomFamilies.value.find((f) => f.id === selectedFamilyId.value)
);

// Recomputed live off the same data the training itself uses, so the
// button disables/enables in step with whether there's actually
// enough attempt history yet — no separate "enough data" flag to keep
// in sync.
const hasWeakPoints = computed(() => weakPointsEntries(1).length > 0);
const hasDrillEntries = computed(() => drillList.value.length > 0);
const showDrillAddSettings = ref(false);

// How the dropdown ITSELF displays drillList — 'recent' just mirrors
// drillList's own default order (most recently added first); the
// other two are purely for browsing convenience here and don't affect
// drillList's own order used elsewhere (e.g. the Historique's Drill
// tab, which always stays most-recent-first regardless of this).
const drillSortOrder = ref("recent");
const sortedDrillOptions = computed(() => {
  const list = [...drillList.value];
  if (drillSortOrder.value === "alpha") {
    list.sort((a, b) => a.trickName.localeCompare(b.trickName));
  } else if (drillSortOrder.value === "occurrences") {
    list.sort((a, b) => b.totalLanded - a.totalLanded);
  }
  return list;
});

// Which entry the dropdown on the Drill step currently points at —
// defaults to the most recently added one, and stays in sync if the
// list changes (an entry gets mastered/removed) while this screen is
// open.
const selectedDrillTrick = ref(drillList.value[0]?.trickName ?? "");
watch(drillList, (list) => {
  if (!list.some((d) => d.trickName === selectedDrillTrick.value)) {
    selectedDrillTrick.value = list[0]?.trickName ?? "";
  }
});

function onStartWeakPoints() {
  startWeakPointsSession(settings);
}

// Reprendre: re-attaches state.sessionId (see resumeDanglingSession's
// own comment in useGame.js), then drops the player on the general
// Famille/Mix picker — whatever they pick next continues accumulating
// into the recovered session instead of starting a new one.
function onResumeDanglingSession() {
  resumeDanglingSession(danglingSession.value.id);
  step.value = "family";
  familyView.value = "family";
}

function onStartDrill() {
  if (selectedDrillTrick.value) {
    startDrillSession(settings, selectedDrillTrick.value);
  }
}

// "Points faibles" lives in settings.customFamilies (see
// startWeakPointsSession) purely as a convenient, already-working
// storage slot — it's rebuilt fresh each time from stats, not
// something the player made, so it's filtered back out of the picker
// here rather than showing up as if it were a real personal family.
// Drill (see startDrillSession) uses the same trick, for the same
// reason.
const visibleCustomFamilies = computed(() =>
  settings.customFamilies.filter(
    (family) => family.id !== WEAK_POINTS_FAMILY_ID && family.id !== DRILL_FAMILY_ID
  )
);

function startFamilyModeSession() {
  const id = selectedFamilyId.value;
  if (id) {
    startFamilySession(id, settings);
  }
}

// Mix: pick any number of families (built-in AND/OR personal at once)
// to draw from together — see startMixSession in useGame.js. Kept as
// a plain array (not a Set) since it's serialized nowhere and a
// simple includes()/splice() is plenty at this scale.
const selectedMixFamilyIds = ref([]);
function isMixFamilySelected(id) {
  return selectedMixFamilyIds.value.includes(id);
}
function toggleMixFamily(id) {
  const i = selectedMixFamilyIds.value.indexOf(id);
  if (i >= 0) {
    selectedMixFamilyIds.value.splice(i, 1);
  } else {
    selectedMixFamilyIds.value.push(id);
  }
}
function findMixFamily(id) {
  return (
    builtinFamilyOptions.value.find((f) => f.id === id) ||
    visibleCustomFamilies.value.find((f) => f.id === id) ||
    null
  );
}
// Total tricks across everything currently selected — just shown as
// context on the Démarrer button, doesn't gate anything: the draw now
// pulls from every entry (landed or not), so there's no "nothing left"
// state to guard against once at least one family is checked.
const mixEntryCount = computed(() =>
  selectedMixFamilyIds.value.reduce((total, id) => {
    const family = findMixFamily(id);
    return total + (family ? family.entries.length : 0);
  }, 0)
);
function startMixModeSession() {
  if (!selectedMixFamilyIds.value.length) {
    return;
  }
  startMixSession(selectedMixFamilyIds.value, settings);
}

// Combo via Mix: same selection, but drawn with the 2-tries/lose-it-
// all rule instead of Mix's usual per-family progress tracking — see
// startComboMix in useGame.js.
function startComboFromMix() {
  if (!selectedMixFamilyIds.value.length) {
    return;
  }
  startComboMix(selectedMixFamilyIds.value, settings);
}

// BLADE VS's "Familles" mode: same idea as Mix's family checkboxes,
// but backed by settings.vsFamilyIds (persisted) instead of a local
// ref — so the choice carries over to "Revanche" and the next time
// BLADE VS is opened, the way settings.players does for Groupe.
function isVsFamilySelected(id) {
  return settings.vsFamilyIds.includes(id);
}
function toggleVsFamily(id) {
  const i = settings.vsFamilyIds.indexOf(id);
  if (i >= 0) {
    settings.vsFamilyIds.splice(i, 1);
  } else {
    settings.vsFamilyIds.push(id);
  }
}

// Career: two fully independent progressions (Normal / Switch), each
// walking the same families.js order — see game/families.js `tier`,
// which is now a strict 1..N progression rather than a grouping (each
// tier has exactly one family). Step 1 is always unlocked; every next
// step unlocks once the previous one is fully complete — tapping a
// locked step does nothing. Tapping an unlocked one starts training it
// directly, same mechanism as Solo's "Famille de tricks".
const careerTrack = ref(state.pendingCareerTrack || null); // 'normal' | 'switch' | null

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

// Switch families carry their own leading "Switch " prefix (see
// families.js) — nothing to strip here anymore, kept as a pass-through
// in case a suffix-style annotation ever comes back. Personal family
// names never had this suffix in the first place, so this remains a
// harmless no-op for those.
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
    isCareer: true,
  });
}

// Combo via Carrière: walks the ENTIRE track end to end (every family
// back to back, no pause) instead of training one family at a time —
// see startComboCareer in useGame.js.
function startComboFromCareerTrack() {
  if (!careerTrack.value) {
    return;
  }
  startComboCareer(careerTrack.value, settings);
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
    id: "family",
    name: "Famille",
    tagline: "Entraîne une famille précise, ou mélange-en plusieurs",
  },
  {
    id: "career",
    name: "Carrière",
    tagline: "Deux progressions indépendantes — Normal et Switch",
  },
  {
    id: "vs",
    name: "BLADE VS",
    tagline: "Toi contre le robot — 3 essais chacun, un B·L·A·D·E qui compte",
  },
  {
    id: "drill",
    name: "Drill",
    tagline: "Un trick précis, en boucle, jusqu'à le dompter",
  },
  {
    id: "group",
    name: "Groupe",
    tagline: "S.K.A.T.E entre potes — loupe et récolte B·L·A·D·E",
  },
];

const step = ref(
  state.pendingCareerTrack
    ? "career-track"
    : state.pendingVsSetup
    ? "setup"
    : state.pendingDrillSetup
    ? "drill"
    : state.pendingReturnStep === "mix" || state.pendingReturnStep === "family"
    ? "family"
    : state.pendingReturnStep === "setup"
    ? "setup"
    : "mode"
); // 'mode' | 'family' | 'career' | 'career-track' | 'setup' | 'drill'
if (state.pendingCareerTrack) {
  state.pendingCareerTrack = null;
}
if (state.pendingVsSetup) {
  state.pendingVsSetup = false;
}
if (state.pendingDrillSetup) {
  state.pendingDrillSetup = false;
}
if (state.pendingReturnStep) {
  state.pendingReturnStep = null;
}

const presetTitle = computed(() =>
  settings.mode === "solo" ? "Mode" : "Difficulté"
);
// BLADE VS's own "Familles" tab already covers "I want to pick exactly
// what comes up" — Entraînement ciblé (Custom) doesn't add anything
// there anymore, so it's left out of VS's level list. Group mode keeps
// the full LEVELS list (including Custom) unchanged.
const presetLevels = computed(() => {
  if (settings.mode === "solo") {
    return SOLO_LEVELS;
  }
  if (settings.mode === "vs") {
    return LEVELS.filter((level) => level.id !== CUSTOM_LEVEL);
  }
  return LEVELS;
});

// BLADE VS: settings.vsRobotChance is the robot's GLOBAL chance of
// landing within its 3 tries (see rollRobot in useGame.js) — shown as
// the main number since it's what actually matters to the person
// setting it up. This derives the per-attempt chance just to show
// alongside it in parentheses, for anyone curious about the mechanic.
const vsRobotPerAttemptChance = computed(() => {
  const global = Math.min(100, Math.max(0, settings.vsRobotChance)) / 100;
  return Math.round((1 - Math.pow(1 - global, 1 / 3)) * 100);
});

const { fadeOutMusic } = useSpeech();

// Committing to a mode ends the intro: the title music fades out here
// (and only here — it keeps playing through the toolbar panels).
function chooseMode(modeId) {
  if (modeId === "career") {
    step.value = "career";
    fadeOutMusic();
    return;
  }
  if (modeId === "family") {
    step.value = "family";
    familyView.value = "family";
    fadeOutMusic();
    return;
  }
  if (modeId === "drill") {
    step.value = "drill";
    fadeOutMusic();
    return;
  }
  settings.mode = modeId;
  if (modeId === "solo" && !SOLO_LEVELS.some((l) => l.id === settings.level)) {
    applyLevel(CUSTOM_LEVEL);
  }
  if (modeId === "vs" && settings.level === CUSTOM_LEVEL) {
    applyLevel(1);
  } else if (
    modeId === "vs" &&
    settings.level === 1 &&
    settings.tricks.fakieChance == null
  ) {
    // First time Classique is ever reached in BLADE VS — populate the
    // tuning sliders' starting values (see LEVEL_PRESETS[1]) without
    // touching them again on later visits, so any tuning done since
    // sticks around instead of resetting every time.
    applyLevel(1);
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
      <div class="start__logo-mark" aria-hidden="true" />
      <h1 class="start__logo-text sticker-text">BLADE</h1>
    </div>

    <div v-if="danglingSession" class="backup-reminder panel dangling-session dangling-session--top">
      <span>
        Session non clôturée ({{ danglingSession.label || "Solo" }} &mdash;
        {{ danglingSession.landed }} réussis) &mdash; l'app a dû se fermer en
        plein milieu.
      </span>
      <div class="dangling-session__actions">
        <button class="btn btn--ghost" @click="closeDanglingSession(danglingSession.id)">
          Clôturer
        </button>
        <button
          v-if="danglingSession.resumable"
          class="btn btn--go"
          @click="onResumeDanglingSession"
        >
          Reprendre
        </button>
      </div>
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

    <div v-if="hasOpenSessionToday" class="backup-reminder panel">
      <span>Une session est encore en cours.</span>
      <button class="btn" @click="endOpenSession">Terminer la session</button>
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
            ? "Confirmer"
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

    <button class="btn btn--go combo-launch-btn" @click="startComboFromCareerTrack()">
      <AppIcon name="zap" :size="18" /> Lancer un Combo sur toute la track
    </button>

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

  <!-- step 1c-bis: Drill — pick one trick from the list, train it alone -->
  <section v-else-if="step === 'drill'" class="start setup rise-in">
    <div class="setup__top">
      <button class="btn btn--ghost setup__back" @click="step = 'mode'">
        &lsaquo; Retour
      </button>
    </div>
    <h2 class="setup__title sticker-text">Drill</h2>
    <p class="setup__hint setup__hint--standalone">
      Un trick précis, en boucle, jusqu'à le réussir 20 fois au total et
      5 fois d'affilée.
    </p>

    <div v-if="hasDrillEntries" class="setup__section">
      <select class="select" v-model="drillSortOrder">
        <option value="recent">Trier : ajout récent</option>
        <option value="occurrences">Trier : nombre de réussites</option>
        <option value="alpha">Trier : alphabétique</option>
      </select>

      <select class="select" v-model="selectedDrillTrick">
        <option v-for="d in sortedDrillOptions" :key="d.id" :value="d.trickName">
          {{ d.trickName }} ({{ Math.min(d.totalLanded, d.targetTotal) }}/{{ d.targetTotal }}
          &middot; série {{ Math.min(d.bestStreak, d.targetStreak) }}/{{ d.targetStreak }})
        </option>
      </select>

      <button class="btn btn--go setup__go" @click="onStartDrill">
        <AppIcon name="play" :size="20" /> Lancer
      </button>
    </div>
    <p v-else class="setup__hint">
      Ta liste Drill est vide — ajoute un trick ci-dessous, depuis le bouton
      "+ Drill" sur l'écran de tirage (n'importe quel mode), ou depuis
      l'onglet Drill de l'Historique (suggestions automatiques).
    </p>

    <button class="btn btn--ghost setup__go" @click="showDrillAddSettings = true">
      <AppIcon name="target" :size="18" /> Ajouter un drill
    </button>

    <SettingsPanel
      v-if="showDrillAddSettings"
      mode="addDrill"
      @close="showDrillAddSettings = false"
    />
  </section>

  <!-- step 1d: Famille — a builtin or personal family, straight into training -->
  <section v-else-if="step === 'family'" class="start setup rise-in">
    <div class="setup__top">
      <button class="btn btn--ghost setup__back" @click="step = 'mode'">
        &lsaquo; Retour
      </button>
    </div>
    <h2 class="setup__title sticker-text">
      {{ familyView === "mix" ? "Mix" : "Famille" }}
    </h2>

    <div class="setup__section">
      <div class="pills">
        <button
          class="pill"
          :class="{ 'pill--active': familyView === 'family' }"
          @click="familyView = 'family'"
        >
          Famille
        </button>
        <button
          class="pill"
          :class="{ 'pill--active': familyView === 'mix' }"
          @click="familyView = 'mix'"
        >
          Mix
        </button>
      </div>
    </div>

    <template v-if="familyView === 'family'">
      <div class="setup__section">
        <button
          class="btn btn--go weak-points-btn"
          :disabled="!hasWeakPoints"
          @click="onStartWeakPoints"
        >
          <AppIcon name="zap" :size="16" />
          Travailler mes points faibles
        </button>
        <p v-if="!hasWeakPoints" class="setup__hint">
          Pas encore assez de données — reviens après avoir réussi et passé
          quelques tricks plusieurs fois.
        </p>
      </div>

      <div class="setup__section">
        <div class="pills">
          <button
            class="pill"
            :class="{ 'pill--active': familySection === 'builtin' }"
            @click="chooseFamilySection('builtin')"
          >
            Familles de tricks
          </button>
          <button
            class="pill"
            :class="{ 'pill--active': familySection === 'personal' }"
            @click="chooseFamilySection('personal')"
          >
            Familles perso
          </button>
        </div>
      </div>

      <div v-if="familySection === 'builtin'" class="setup__section">
        <span class="setup__label">Choisis une famille</span>
        <div class="family-picker">
          <select class="select" v-model="selectedBuiltinFamilyId">
            <option
              v-for="family in builtinFamilyOptions"
              :key="family.id"
              :value="family.id"
              :style="{ color: familyOptionColor(family) }"
            >
              {{ familyOptionLabel(family) }}
            </option>
          </select>
          <button
            class="btn btn--ghost family-picker__delete"
            :disabled="!selectedBuiltinFamilyId"
            @click="showFamilyHistory = true"
          >
            Historique
          </button>
        </div>
        <p class="setup__hint">
          Un trick précis à la fois, tiré au hasard parmi ceux pas encore
          réussis — passer n'en tire juste un autre.
        </p>
      </div>

      <div v-else class="setup__section">
        <span class="setup__label">Choisis une famille perso</span>
        <div v-if="visibleCustomFamilies.length" class="family-picker">
          <select class="select" v-model="selectedCustomFamilyId">
            <option
              v-for="family in visibleCustomFamilies"
              :key="family.id"
              :value="family.id"
              :style="{ color: familyOptionColor(family) }"
            >
              {{ familyOptionLabel(family) }}
            </option>
          </select>
          <button
            class="btn btn--ghost family-picker__delete"
            :disabled="!selectedCustomFamilyId"
            @click="showFamilyHistory = true"
          >
            Historique
          </button>
          <button
            class="btn btn--ghost family-picker__delete"
            :class="{ 'btn--confirm': confirmingFamilyDelete }"
            @click="onDeleteCustomFamily"
            @blur="confirmingFamilyDelete = false"
          >
            {{ confirmingFamilyDelete ? "Confirmer" : "Supprimer" }}
          </button>
        </div>
        <p v-else class="setup__hint">
          Aucune famille perso pour l'instant — crée-en une depuis l'aperçu des
          tricks possibles (Réglages &gt; Terminé).
        </p>
        <div class="family-import-actions">
          <button
            class="btn btn--ghost"
            :disabled="!visibleCustomFamilies.length"
            @click="onExportFamiliesClick"
          >
            Exporter
          </button>
          <button class="btn btn--ghost" @click="familyImportInput.click()">
            Importer
          </button>
          <input
            ref="familyImportInput"
            type="file"
            accept="application/json"
            class="family-import-actions__file-input"
            @change="onImportFamiliesFileChosen"
          />
        </div>
        <p v-if="familyImportStatus" class="setup__hint">{{ familyImportStatus }}</p>
      </div>

      <FamilyHistoryPanel
        v-if="showFamilyHistory"
        :family-id="familySection === 'builtin' ? selectedBuiltinFamilyId : selectedCustomFamilyId"
        @close="showFamilyHistory = false"
      />

      <button
        class="btn btn--go setup__go"
        :disabled="
          (familySection === 'builtin' && !selectedBuiltinFamilyId) ||
          (familySection === 'personal' && !selectedCustomFamilyId)
        "
        @click="startFamilyModeSession()"
      >
        <AppIcon name="play" :size="20" /> Démarrer la session
      </button>
    </template>

    <template v-else>
      <p class="setup__hint setup__hint--standalone">
        Coche les familles à mélanger — le tirage pioche au hasard dans
        tout ce qui est sélectionné, réussi ou pas. Chaque trick réussi
        fait quand même avancer sa propre famille, comme si tu
        l'entraînais seule.
      </p>

      <button
        class="btn btn--go setup__go"
        :disabled="!selectedMixFamilyIds.length"
        @click="startMixModeSession()"
      >
        <AppIcon name="play" :size="20" /> Démarrer le mix
        ({{ selectedMixFamilyIds.length }}
        famille{{ selectedMixFamilyIds.length > 1 ? "s" : "" }},
        {{ mixEntryCount }} trick{{ mixEntryCount > 1 ? "s" : "" }})
      </button>

      <button
        class="btn combo-launch-btn"
        :disabled="!selectedMixFamilyIds.length"
        @click="startComboFromMix()"
      >
        <AppIcon name="zap" :size="18" /> Lancer en Combo
      </button>

      <div class="setup__section">
        <span class="setup__label">Familles de tricks</span>
        <div class="mix-family-list">
          <label
            v-for="family in builtinFamilyOptions"
            :key="family.id"
            class="mix-family-row"
          >
            <input
              type="checkbox"
              :checked="isMixFamilySelected(family.id)"
              @change="toggleMixFamily(family.id)"
            />
            <span class="mix-family-row__name">{{ familyBaseName(family.name) }}</span>
            <span class="mix-family-row__pct" :style="{ color: familyOptionColor(family) }">
              {{
                familyLifetimeDone(family)
                  ? "Terminée ✓"
                  : `${familyPercent(family)}%`
              }}
            </span>
          </label>
        </div>
      </div>

      <div class="setup__section">
        <span class="setup__label">Familles perso</span>
        <div v-if="visibleCustomFamilies.length" class="mix-family-list">
          <label
            v-for="family in visibleCustomFamilies"
            :key="family.id"
            class="mix-family-row"
          >
            <input
              type="checkbox"
              :checked="isMixFamilySelected(family.id)"
              @change="toggleMixFamily(family.id)"
            />
            <span class="mix-family-row__name">{{ familyBaseName(family.name) }}</span>
            <span class="mix-family-row__pct" :style="{ color: familyOptionColor(family) }">
              {{
                familyLifetimeDone(family)
                  ? "Terminée ✓"
                  : `${familyPercent(family)}%`
              }}
            </span>
          </label>
        </div>
        <p v-else class="setup__hint">
          Aucune famille perso pour l'instant — crée-en une depuis l'aperçu des
          tricks possibles (Réglages &gt; Terminé).
        </p>
      </div>
    </template>
  </section>

  <!-- step 2: difficulty + mode specifics + start -->
  <section v-else class="start setup rise-in">
    <div class="setup__top">
      <button class="btn btn--ghost setup__back" @click="step = 'mode'">
        &lsaquo; Retour
      </button>
    </div>
    <h2 class="setup__title sticker-text">
      {{
        settings.mode === "solo"
          ? "Session Solo"
          : settings.mode === "vs"
          ? "BLADE VS"
          : "Partie de groupe"
      }}
    </h2>

    <div v-if="settings.mode === 'vs'" class="setup__section">
      <div class="pills">
        <button
          class="pill"
          :class="{ 'pill--active': settings.vsMode === 'level' }"
          @click="settings.vsMode = 'level'"
        >
          Niveau
        </button>
        <button
          class="pill"
          :class="{ 'pill--active': settings.vsMode === 'families' }"
          @click="settings.vsMode = 'families'"
        >
          Familles
        </button>
      </div>
    </div>

    <div v-if="settings.mode !== 'vs' || settings.vsMode === 'level'" class="setup__section">
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
      <button
        v-if="settings.mode === 'solo'"
        class="btn btn--ghost training-history-btn"
        @click="showTrainingHistory = true"
      >
        <AppIcon name="list" :size="14" /> Historique des entraînements ciblés
      </button>
    </div>

    <div
      v-if="settings.mode === 'vs' && settings.vsMode === 'level' && settings.level === 1"
      class="setup__section classique-tuning"
    >
      <span class="setup__label">Réglages fins de Classik</span>

      <div class="classique-slider">
        <span class="classique-slider__label">
          Fakie (approche) — {{ settings.tricks.fakieChance }}%
        </span>
        <input type="range" class="vs-chance-slider" min="0" max="100" step="5" v-model.number="settings.tricks.fakieChance" />
      </div>

      <div class="classique-slider">
        <span class="classique-slider__label">
          Switch (approche + switch-up) — {{ settings.tricks.switchChance }}%
        </span>
        <input type="range" class="vs-chance-slider" min="0" max="100" step="5" v-model.number="settings.tricks.switchChance" />
      </div>

      <div class="classique-slider">
        <span class="classique-slider__label">
          Switch up (2ème grind) — {{ settings.tricks.switchUpChance }}%
        </span>
        <input type="range" class="vs-chance-slider" min="0" max="100" step="5" v-model.number="settings.tricks.switchUpChance" />
      </div>

      <div class="classique-slider">
        <span class="classique-slider__label">
          Alley-oop (spin in) — {{ settings.tricks.alleyOopChance }}%
        </span>
        <input type="range" class="vs-chance-slider" min="0" max="100" step="5" v-model.number="settings.tricks.alleyOopChance" />
      </div>

      <div class="classique-slider">
        <span class="classique-slider__label">
          True (spin in) — {{ settings.tricks.trueChance }}%
        </span>
        <input type="range" class="vs-chance-slider" min="0" max="100" step="5" v-model.number="settings.tricks.trueChance" />
      </div>

      <p class="setup__hint">
        Alley-oop + True + aucune rotation se partagent 100% à eux trois —
        {{ Math.max(0, 100 - settings.tricks.alleyOopChance - settings.tricks.trueChance) }}%
        de chances qu'il n'y ait pas de rotation du tout.
      </p>

      <div class="classique-slider">
        <span class="classique-slider__label">
          Topside (variation) — {{ settings.tricks.topsideChance }}%
        </span>
        <input type="range" class="vs-chance-slider" min="0" max="100" step="5" v-model.number="settings.tricks.topsideChance" />
      </div>
      <p class="setup__hint">
        Sur les grinds groove (Royale, Unity, Torque, ...), seul "Channel"
        existe comme variation — jamais Topside. Ce curseur ne peut donc
        s'exprimer pleinement que sur les grinds soul.
      </p>
    </div>

    <p v-if="settings.mode === 'solo'" class="setup__hint setup__hint--standalone">
      Pas de fin de partie — tourne aussi longtemps que tu veux. Les roues
      favorisent les tricks que tu n'as pas encore réussis.
    </p>

    <template v-else-if="settings.mode === 'vs'">
      <div class="setup__section">
        <span class="setup__label">
          Niveau du robot — {{ settings.vsRobotChance }}% de réussite sur les 3
          essais ({{ vsRobotPerAttemptChance }}% par essai)
        </span>
        <input
          type="range"
          class="vs-chance-slider"
          min="0"
          max="100"
          step="5"
          v-model.number="settings.vsRobotChance"
        />
        <p class="setup__hint">
          Sa chance de réussir le trick sur l'ensemble de ses 3 essais — le
          chiffre entre parenthèses est la chance sur un seul essai pris à
          part.
        </p>
      </div>

      <div v-if="settings.vsMode === 'families'" class="setup__section">
        <span class="setup__label">Familles de tricks</span>
        <div class="mix-family-list">
          <label
            v-for="family in builtinFamilyOptions"
            :key="family.id"
            class="mix-family-row"
          >
            <input
              type="checkbox"
              :checked="isVsFamilySelected(family.id)"
              @change="toggleVsFamily(family.id)"
            />
            <span class="mix-family-row__name">{{ familyBaseName(family.name) }}</span>
            <span class="mix-family-row__pct" :style="{ color: familyOptionColor(family) }">
              {{
                familyLifetimeDone(family)
                  ? "Terminée ✓"
                  : `${familyPercent(family)}%`
              }}
            </span>
          </label>
        </div>
      </div>

      <div v-if="settings.vsMode === 'families'" class="setup__section">
        <span class="setup__label">Familles perso</span>
        <div v-if="visibleCustomFamilies.length" class="mix-family-list">
          <label
            v-for="family in visibleCustomFamilies"
            :key="family.id"
            class="mix-family-row"
          >
            <input
              type="checkbox"
              :checked="isVsFamilySelected(family.id)"
              @change="toggleVsFamily(family.id)"
            />
            <span class="mix-family-row__name">{{ familyBaseName(family.name) }}</span>
            <span class="mix-family-row__pct" :style="{ color: familyOptionColor(family) }">
              {{
                familyLifetimeDone(family)
                  ? "Terminée ✓"
                  : `${familyPercent(family)}%`
              }}
            </span>
          </label>
        </div>
        <p v-else class="setup__hint">
          Aucune famille perso pour l'instant — crée-en une depuis l'aperçu des
          tricks possibles (Réglages &gt; Terminé).
        </p>
        <p v-if="!settings.vsFamilyIds.length" class="setup__hint">
          Coche au moins une famille — sinon le tirage reste sur le niveau
          choisi.
        </p>
      </div>

      <div class="setup__section">
        <p class="setup__hint">
          La roue lance un trick. Toi et le robot avez chacun 3 essais.
          Personne ne l'a landé ? Vous prenez chacun une lettre de
          B&middot;L&middot;A&middot;D&middot;E. Cinq lettres et t'es
          éliminé — premier éliminé perd.
        </p>
      </div>
    </template>

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
              autocapitalize="words"
              autocomplete="off"
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

    <button
      class="btn btn--go setup__go"
      @click="settings.mode === 'solo' ? startSoloSession() : startGame(settings)"
    >
      <AppIcon name="play" :size="20" />
      {{ settings.mode === "solo" ? "Démarrer la session" : "Démarrer la partie" }}
    </button>

    <TargetedTrainingHistoryPanel
      v-if="showTrainingHistory"
      @close="showTrainingHistory = false"
      @redo="startSoloSession()"
    />
  </section>
</template>

<style scoped>
.start {
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 30px 16px 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  min-height: 100%;
}

/* full-width banner like the original start screen */
.start__logo {
  width: min(500px, 95%);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line-strong);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.start__logo-mark {
  width: min(210px, 48%);
  aspect-ratio: 700 / 656;
  -webkit-mask-image: url(/img/blade-skater-silhouette.png);
  mask-image: url(/img/blade-skater-silhouette.png);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  /* The source PNG is plain white — this used to be recolored with a
     CSS invert() filter for the inverted (light) theme instead. Now
     that it's a mask, the accent color takes over automatically
     whenever one's picked (--red-hi is only ever set on <body> when
     accentColor is "custom" — see App.vue), falling back to that same
     white/black split for Monochrome. */
  background-color: var(--red-hi, #ffffff);
  filter: drop-shadow(0 6px 20px rgba(var(--fg-rgb), 0.25));
}

body.theme-inverted .start__logo-mark {
  background-color: var(--red-hi, #000000);
}

.start__logo-text {
  font-family: var(--font-display);
  font-size: clamp(48px, 13vw, 82px);
  font-weight: 900;
  letter-spacing: 0.06em;
  line-height: 1;
  /* Same idea as the logo mark: picks up the custom accent when one's
     set, otherwise falls back to .sticker-text's own normal fill so
     Monochrome looks exactly as it always did. The outline stays
     .sticker-text's own (theme-contrasted) color either way — it's
     read against the page background, not the accent. */
  color: var(--red-hi, var(--sticker-fill));
  filter: drop-shadow(0 8px 34px rgba(var(--fg-rgb), 0.35));
}

.start__modes {
  display: flex;
  flex-direction: column;
  gap: 11px;
  width: 100%;
  margin-top: 4px;
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

.dangling-session {
  flex-direction: column;
  align-items: stretch;
  text-align: left;
}

.dangling-session--top {
  margin-top: 14px;
  border: 1px solid var(--danger-hi);
  background: rgba(var(--fg-rgb), 0.06);
}

.dangling-session__actions {
  display: flex;
  gap: 8px;
}
.dangling-session__actions .btn {
  flex: 1;
}

.mode-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 17px 20px;
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
  font-size: 19px;
  text-transform: uppercase;
  color: var(--text);
}

.mode-card:hover .mode-card__name {
  color: var(--red);
  text-shadow: var(--glow-red);
}

.mode-card__go {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--red-hi);
}

/* ---------- setup step ---------- */

.setup {
  align-items: stretch;
  text-align: left;
  gap: 18px;
  justify-content: flex-start;
  min-height: 0;
}

.setup__top {
  display: flex;
  margin-top: 14px;
}

.setup__back {
  font-size: 13px;
  padding: 10px 16px;
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

.weak-points-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.training-history-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 10px;
  font-size: 13px;
  padding: 9px 14px;
}

.family-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.family-import-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.family-import-actions .btn {
  flex: 1;
}
.family-import-actions__file-input {
  display: none;
}

/* ---------- Mix: checkbox family lists ---------- */

.mix-family-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
  padding-right: 2px;
}

.mix-family-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--panel);
  border: 1px solid var(--line);
  cursor: pointer;
}

.mix-family-row input[type="checkbox"] {
  flex: none;
  width: 18px;
  height: 18px;
  accent-color: var(--red-hi);
}

.mix-family-row__name {
  flex: 1;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text);
}

.mix-family-row__pct {
  flex: none;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
}

.family-picker .select {
  flex: 1 1 160px;
  min-width: 0;
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

/* ---------- BLADE VS: robot chance slider ---------- */

.vs-chance-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  margin: 10px 0 4px;
  border-radius: 999px;
  background: rgba(var(--fg-rgb), 0.14);
  outline: none;
}

.vs-chance-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--knob-fill);
  box-shadow: 0 0 8px rgba(var(--fg-rgb), 0.5);
  cursor: pointer;
}

.vs-chance-slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--knob-fill);
  box-shadow: 0 0 8px rgba(var(--fg-rgb), 0.5);
  cursor: pointer;
}

/* ---------- BLADE VS: Classique fine-tuning sliders ---------- */

.classique-tuning {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.classique-slider {
  margin-bottom: 6px;
}

.classique-slider__label {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--text);
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

.btn--confirm {
  color: var(--red-hi);
  border-color: rgba(var(--fg-rgb), 0.6);
  box-shadow: 0 0 10px rgba(var(--fg-rgb), 0.2);
}

.family-picker__delete {
  flex: none;
  font-size: 13px;
  white-space: nowrap;
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