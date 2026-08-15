import { reactive, watch } from "vue";
import { GRINDS } from "../game/trickData.js";
import { DEFAULT_CUSTOM_FAMILIES } from "../game/defaultCustomFamilies.js";

const STORAGE_KEY = "aight-settings-v3";

// Deep clone so every call gets its own independent copy — defaultSettings()
// is also used by reset()/applyLevel(CUSTOM_LEVEL) via Object.assign, which
// would otherwise share (and let one session's edits leak into) the same
// shipped array/entry objects across every family.
function defaultCustomFamilies() {
  return DEFAULT_CUSTOM_FAMILIES.map((family) => ({
    ...family,
    entries: family.entries.map((entry) => ({ ...entry })),
  }));
}

export const CUSTOM_LEVEL = 5;

export const LEVELS = [
  { id: 1, name: "Classik", tagline: "Grinds soul & groove, rotations jusqu'à 360" },
  { id: 2, name: "Juicy", tagline: "Topsides, negatives et 360" },
  { id: 3, name: "Nuts", tagline: "Tout, jusqu'aux 540" },
  { id: 4, name: "Switch up", tagline: "Nuts, plus un second grind" },
  { id: CUSTOM_LEVEL, name: "Entraînement ciblé", tagline: "Tes propres règles" },
];

// Solo mostly means Custom (train exactly what you want) or Switch up
// (Nuts + a second grind) — Classique/Juicy/Nuts as separate steps don't
// add much once you're picking your own grinds anyway. Group mode
// keeps the full LEVELS list above unchanged.
export const SOLO_LEVELS = LEVELS.filter((level) => level.id === CUSTOM_LEVEL);

export const REEL_SPEEDS = [
  { id: "verySlow", name: "Très lente", ms: 2300 },
  { id: "slow", name: "Lente", ms: 1400 },
  { id: "normal", name: "Normale", ms: 800 },
  { id: "fast", name: "Rapide", ms: 500 },
  { id: "veryFast", name: "Très rapide", ms: 300 },
  { id: "instant", name: "Instantanée", ms: 80 },
];

// Accent color: which hue the app's highlights (buttons, active states,
// scores, badges, career path) use — the ambient background/panels
// stay neutral either way. settings.accentColor is "mono" (the
// original black & white look, no hue at all) or "custom" (any hue,
// chosen on the color wheel in Réglages — see settings.accentHue and
// game/accentPalette.js, applied as inline CSS custom properties in
// App.vue rather than a fixed body.accent-* class, since any of the
// 360° is selectable, not just a preset list).
export const DEFAULT_ACCENT_HUE = 210; // a pleasant blue, first time "Personnalisé" is picked

const ALL_TRICKS_OFF = {
  fakie: false,
  switch: false,
  topside: false,
  negative: false,
  rough: false,
  tough: false,
  channel: false,
  christ: false,
  grabs: false,
  rocket: false,
  crossgrab: false,
  // Parallel to the automatic Inspin/Outspin weighting in the Spin in
  // pool (Alley-oop vs True): both default to true so nothing changes
  // out of the box. Unchecking one forces the other direction only.
  spinInAlleyOop: true,
  spinInTrue: true,
  // Training focus: locks every checked option below (Approach,
  // Grind variations, Spin in direction) so it's guaranteed instead of
  // merely possible — see the settings panel hint and trickGenerator.js
  // for exactly what "locked" means per section. Defaults to on, and
  // is normally independent of the level presets — applying 2/3/4
  // preserves whatever it already was, only the checkbox itself,
  // tapped manually, changes it. Two exceptions in applyLevel() below:
  // CUSTOM_LEVEL always turns it back on, and Classique (1) always
  // turns it off — Classique's whole point is that its criteria stay
  // merely possible, never guaranteed.
  trainingFocus: true,
  switchUp: false,
  // Independent 2nd-grind counterparts, so combos like "Top Soul to
  // True Top Soul" are trainable: switchUpTopside mirrors "topside" but
  // only for the 2nd grind's variation (every other variation type
  // stays shared between both grinds). spinBetweenAlleyOop/True mirror
  // spinInAlleyOop/True but for the rotation between the two grinds.
  // switchUpSwitch mirrors "switch" (stance) but only for the 2nd
  // grind — independent of whether the approach into the 1st grind is
  // itself switch stance.
  switchUpTopside: false,
  switchUpSwitch: false,
  spinBetweenAlleyOop: true,
  spinBetweenTrue: true,
  // 3 independent groups (spin in / rotation between the two grinds /
  // spin out), each with its own 180 / 270-360 / 450-540 checkboxes.
  spinIn180: false,
  spinIn270: false,
  spinIn360: false,
  spinIn450: false,
  spinIn540: false,
  spinBetween180: false,
  spinBetween270: false,
  spinBetween360: false,
  spinBetween450: false,
  spinBetween540: false,
  spinOut180: false,
  spinOut270: false,
  spinOut360: false,
  spinOut450: false,
  spinOut540: false,
  // Same idea one level further out — a switch-up of the switch-up
  // (3rd grind), only ever meaningful when switchUp itself is also on
  // (see trickGenerator.js's hasSwitchUp2Reel). Same mirrored set of
  // independent counterparts as switchUp's own above.
  switchUp2: false,
  switchUp2Topside: false,
  switchUp2Switch: false,
  spinBetween2AlleyOop: true,
  spinBetween2True: true,
  spinBetween2180: false,
  spinBetween2270: false,
  spinBetween2360: false,
  spinBetween2450: false,
  spinBetween2540: false,
};

// Classique's five tunable %s (see StartScreen.vue's sliders) live in
// settings.tricks like everything else, so applyLevel's Object.assign
// only overwrites keys a given preset actually mentions — without this,
// switching from Classique to any other level would silently leave its
// %s sitting in settings.tricks, still read by resolveApproachWinner/
// resolveDirectionWinner/resolveVariationWinner over there (e.g. Juicy
// also has topside on, so a leftover topsideChance would quietly cap
// it as if Classique's rules still applied).
const CLEAR_CLASSIQUE_CHANCES = {
  fakieChance: null,
  switchChance: null,
  alleyOopChance: null,
  trueChance: null,
  topsideChance: null,
};

const LEVEL_PRESETS = {
  // Classique: fakie approach is POSSIBLE (not the only approach —
  // trainingFocus is forced off for this level in applyLevel() below,
  // so every criterion here is a candidate the spin can land on, never
  // a guarantee); switch up (2nd grind) is possible too, but rare (10%
  // of spins — see switchUpChance, read in trickGenerator.js's
  // hasSwitchUpReel check, which IS a hard on/off per spin rather than
  // a weighted pool, hence its own dedicated chance). Variation, on
  // BOTH the 1st grind and the switch-up's 2nd grind, allows switch
  // stance, topside, and either spin-in direction (Alley-oop/True) —
  // nothing else. Rotations cap at 270 going in, 270 between the two
  // grinds, 360 coming out. Grinds (see classiqueGrinds() below) are
  // exactly the "Soul uniquement" + "Groove uniquement" selections
  // combined — no hybrids (Tabernacle, Darkslide, Byn Soul), no
  // oldschool/rare ones.
  1: {
    ...ALL_TRICKS_OFF,
    fakie: true,
    switchUp: true,
    switchUpChance: 10,
    // Starting points for the sliders in BLADE VS's Niveau → Classique
    // screen — freely adjustable there afterwards (see StartScreen.vue).
    fakieChance: 30,
    switchChance: 30,
    alleyOopChance: 25,
    trueChance: 25,
    topsideChance: 40,
    switch: true,
    topside: true,
    spinInAlleyOop: true,
    spinInTrue: true,
    switchUpSwitch: true,
    switchUpTopside: true,
    spinBetweenAlleyOop: true,
    spinBetweenTrue: true,
    spinIn180: true,
    spinIn270: true,
    spinBetween180: true,
    spinBetween270: true,
    spinOut180: true,
    spinOut270: true,
    spinOut360: true,
  },
  2: {
    ...ALL_TRICKS_OFF,
    ...CLEAR_CLASSIQUE_CHANCES,
    switchUpChance: 100,
    negative: true,
    topside: true,
    grabs: true,
    crossgrab: true,
    spinIn180: true,
    spinIn270: true,
    spinIn360: true,
    spinOut180: true,
    spinOut270: true,
    spinOut360: true,
  },
  3: {
    ...Object.fromEntries(Object.keys(ALL_TRICKS_OFF).map((k) => [k, true])),
    ...CLEAR_CLASSIQUE_CHANCES,
    switchUpChance: 100,
    switchUp: false,
    spinBetween180: false,
    spinBetween270: false,
    spinBetween360: false,
    spinBetween450: false,
    spinBetween540: false,
    // 3rd-grind training stays opt-in only, never turned on by a
    // preset — it's still new/experimental enough that a player should
    // reach it on purpose via Custom, not get it bundled in with
    // "everything on".
    switchUp2: false,
    spinBetween2180: false,
    spinBetween2270: false,
    spinBetween2360: false,
    spinBetween2450: false,
    spinBetween2540: false,
  },
  4: {
    ...Object.fromEntries(Object.keys(ALL_TRICKS_OFF).map((k) => [k, true])),
    ...CLEAR_CLASSIQUE_CHANCES,
    switchUpChance: 100,
    switchUp: true,
    switchUp2: false,
  },
  // Clicking "Custom" itself (not just touching a single checkbox, which
  // silently flips the level without resetting anything) starts from a
  // blank slate — every trick/spin toggle off, including the direction
  // filters (Alley-oop/True), and every grind off too.
  [CUSTOM_LEVEL]: {
    ...ALL_TRICKS_OFF,
    ...CLEAR_CLASSIQUE_CHANCES,
    switchUpChance: 100,
    spinInAlleyOop: false,
    spinInTrue: false,
    spinBetweenAlleyOop: false,
    spinBetweenTrue: false,
    spinBetween2AlleyOop: false,
    spinBetween2True: false,
  },
};

// Grinds each difficulty preset switches off, matched by substring so
// FS/BS variants are covered. Classique (1) uses classiqueGrinds()
// below instead (an inclusion list, not an exclusion one — see there
// for why). Nuts (3), Switch up (4) and Custom allow everything.
const LEVEL_EXCLUDED_GRINDS = {
  2: ["Darkslide"],
  3: [],
  4: [],
};

// "Soul tricks only" keeps just the common soul grinds — the oldschool/
// rare ones (Darkslide, Tabernacle, Byn Soul, ...) are pure soul too
// but deliberately left out here.
const SOUL_ONLY_NAMES = [
  "Acid",
  "Makio",
  "Mizou",
  "Soul",
  "X-Grind",
  "Mistrial",
  "PStar",
  "Torque Soul",
];

// "Groove tricks only" picks every groove grind except these — plain
// Frontside/Backside (no grind, just a spin) and the Pudslides aren't
// what you're after when training groove grinds specifically.
const GROOVE_ONLY_EXCLUDED_NAMES = [
  "Frontside",
  "Backside",
  "FS Pudslide",
  "BS Pudslide",
];

function presetGrinds(levelId) {
  const parts = LEVEL_EXCLUDED_GRINDS[levelId] || [];
  const grinds = {};
  for (const grind of GRINDS) {
    if (parts.some((part) => grind.name.includes(part))) {
      grinds[grind.name] = false;
    }
  }
  return grinds;
}

// Classique's grind selection is an INCLUSION list, unlike every other
// preset's exclusion-based presetGrinds() above: exactly the "Soul
// uniquement" (8 grinds) + "Groove uniquement" (16 grinds) selections
// combined, 24 total — no hybrids (Tabernacle, Darkslide, Byn Soul),
// no oldschool/rare grinds. Reuses the exact same rule setGrindsByType
// applies for each of those two buttons, just unioned into one map
// instead of writing it twice.
function classiqueGrinds() {
  const grinds = {};
  for (const grind of GRINDS) {
    grinds[grind.name] =
      SOUL_ONLY_NAMES.includes(grind.name) ||
      (grind.isGroove && !GROOVE_ONLY_EXCLUDED_NAMES.includes(grind.name));
  }
  return grinds;
}

// Custom's blank slate: every grind off, rather than the "nothing
// excluded" empty object presetGrinds() would give (which reads as
// everything ON, the opposite of what a blank slate means here).
function allGrindsOff() {
  const grinds = {};
  for (const grind of GRINDS) {
    grinds[grind.name] = false;
  }
  return grinds;
}

function defaultSettings() {
  return {
    mode: "solo", // solo | vs
    level: 1,
    // BLADE VS: the robot's GLOBAL chance (0-100) of landing the trick
    // within its 3 tries, not a per-attempt chance — see rollRobot in
    // useGame.js, which derives the per-attempt probability from this.
    // Adjustable on the mode's setup screen.
    vsRobotChance: 50,
    // BLADE VS: draws either from the usual level-based trick pool
    // ("level", using settings.level/tricks/grinds like Group does) or
    // from a hand-picked set of families ("families", same mechanism
    // as Mix's family-restricted draw — see startGame/nextSpin in
    // useGame.js). vsFamilyIds is that hand-picked set.
    vsMode: "level",
    vsFamilyIds: [],
    reelSpeed: "fast",
    introMusic: false,
    // Quick test toggle: swaps to a real light palette — see
    // .theme-inverted in base.css.
    invertedTheme: false,
    // "mono" (default black & white) or "custom" (a chosen hue — see
    // accentHue below and the color wheel in Réglages).
    accentColor: "mono",
    // The hue (0-359°) used when accentColor is "custom" — see
    // game/accentPalette.js and DEFAULT_ACCENT_HUE above.
    accentHue: DEFAULT_ACCENT_HUE,
    // How far from the wheel's center the hue was picked (0-1, 1 =
    // rim = fully vivid) — see game/accentPalette.js.
    accentSaturation: 1,
    // Stripped-down display for handling the phone mid-session (on the
    // ground, one-handed, riding gloves...) — just the trick name, big,
    // and the two main action buttons, everything else hidden. See
    // .game--focus in GameScreen.vue and the header/nav toggle in
    // App.vue.
    focusMode: false,
    // Hands-free "réussi"/"raté"/"passer" via speech recognition during
    // a solo session — off by default (experimental, browser support
    // varies a lot). See useVoiceControl.js.
    voiceControl: false,
    // Trick names are read aloud via the browser's own SpeechSynthesis.
    // speechVoiceURI is the chosen voice's own voiceURI (browser-
    // assigned, not something to hand-author), empty meaning "whatever
    // the browser defaults to". See useSpeech.js.
    speechVoiceURI: "",
    // Only used to pre-fill the "to" field when sharing/emailing a
    // backup export — never sent anywhere on its own, see
    // useBackup.js. Pre-filled with Pierre's own address so this is a
    // one-time thing, not something to type in every time.
    backupEmail: "raposo.pierre@hotmail.fr",
    tricks: { ...ALL_TRICKS_OFF },
    // Per-grind training filter for the first grind: name -> false when
    // switched off. Missing entries mean "on", so new grinds default to
    // enabled.
    grinds: presetGrinds(1),
    // Same idea but for the second grind (switch up) — fully
    // independent, so the two reels can be trained separately.
    switchUpGrinds: presetGrinds(1),
    // Same idea again, one level further out — the 3rd grind (switch-up
    // of the switch-up).
    switchUp2Grinds: presetGrinds(1),
    // Each mode's parked difficulty config ({ level, tricks, grinds }).
    // The top-level fields always hold the current mode's config; the
    // other mode's is stored here and swapped in on mode change, so solo
    // and group each keep their own custom setup.
    modeConfigs: {},
    // Player-built families — same shape as the built-in ones in
    // families.js ({ id, name, entries }), just created by the player
    // from a settings combo instead of shipped with the app (see
    // TrickPreviewPanel.vue, "Créer une famille perso" — the exact
    // trick list comes from enumeratePossibleTricks, so it only exists
    // as a real, trainable family once that combo's list is known to
    // be exact, not an estimate).
    customFamilies: defaultCustomFamilies(), // { id, name, entries: [{ grindName, variationName, approach, spinToName, spinOffName, switchUpGrindName, switchUpVariationName, switchSpinName }] }
    // History of past "Entraînement ciblé" (solo Custom) configs, most
    // recent first — lets the player revisit and instantly re-apply a
    // combo they'd set up before, rather than rebuilding it by hand.
    // { id, date, tricks, grinds, switchUpGrinds }. See
    // recordTargetedTraining/redoTargetedTraining below.
    targetedTrainingHistory: [],
  };
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const defaults = defaultSettings();
    const merged = {
      ...defaults,
      ...stored,
      tricks: { ...defaults.tricks, ...(stored && stored.tricks) },
    };
    if (merged.mode !== "solo" && merged.mode !== "vs") {
      merged.mode = "solo";
    }
    // Backfills the default even for someone who already has settings
    // saved from before this address existed — the stored value would
    // otherwise be "" forever (an explicit, if empty, string beats the
    // default in the merge above), never picking up the new default.
    // There's no real "I deliberately want this blank" case to
    // protect here — it's just a share-sheet prefill, not a toggle.
    if (!merged.backupEmail) {
      merged.backupEmail = defaults.backupEmail;
    }
    if (
      typeof merged.vsRobotChance !== "number" ||
      Number.isNaN(merged.vsRobotChance)
    ) {
      merged.vsRobotChance = defaults.vsRobotChance;
    }
    merged.vsRobotChance = Math.min(100, Math.max(0, merged.vsRobotChance));
    if (merged.vsMode !== "level" && merged.vsMode !== "families") {
      merged.vsMode = "level";
    }
    if (
      !Array.isArray(merged.vsFamilyIds) ||
      merged.vsFamilyIds.some((id) => typeof id !== "string")
    ) {
      merged.vsFamilyIds = [];
    }
    merged.introMusic = false;
    if (!merged.grinds || typeof merged.grinds !== "object") {
      merged.grinds = {};
    }
    if (!merged.switchUpGrinds || typeof merged.switchUpGrinds !== "object") {
      merged.switchUpGrinds = {};
    }
    if (!merged.switchUp2Grinds || typeof merged.switchUp2Grinds !== "object") {
      merged.switchUp2Grinds = {};
    }
    if (!merged.modeConfigs || typeof merged.modeConfigs !== "object") {
      merged.modeConfigs = {};
    }
    if (!Array.isArray(merged.customFamilies)) {
      merged.customFamilies = [];
    }
    if (!Array.isArray(merged.targetedTrainingHistory)) {
      merged.targetedTrainingHistory = [];
    }
    return merged;
  } catch {
    return defaultSettings();
  }
}

const settings = reactive(loadSettings());

watch(
  settings,
  () => localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)),
  { deep: true }
);

// Swap difficulty configs when the mode changes: park the previous
// mode's config and restore the new mode's (first switch ever keeps the
// current config, so both modes start out identical).
watch(
  () => settings.mode,
  (mode, prevMode) => {
    if (!prevMode || mode === prevMode) {
      return;
    }
    settings.modeConfigs[prevMode] = JSON.parse(
      JSON.stringify({
        level: settings.level,
        tricks: settings.tricks,
        grinds: settings.grinds,
        switchUpGrinds: settings.switchUpGrinds,
        switchUp2Grinds: settings.switchUp2Grinds,
      })
    );
    const parked = settings.modeConfigs[mode];
    if (parked) {
      settings.level = parked.level;
      Object.assign(settings.tricks, ALL_TRICKS_OFF, parked.tricks);
      settings.grinds = { ...parked.grinds };
      settings.switchUpGrinds = { ...(parked.switchUpGrinds || {}) };
      settings.switchUp2Grinds = { ...(parked.switchUp2Grinds || {}) };
    }
  }
);

export function useSettings() {
  const applyLevel = (levelId) => {
    settings.level = levelId;
    if (LEVEL_PRESETS[levelId]) {
      // Mode entraînement ciblé is independent of the level presets in
      // general (applying 2-4 must never flip it either way, so it's
      // preserved as-is) — with two exceptions: "Tout remettre à zéro"
      // (CUSTOM_LEVEL) always leaves it checked (the default starting
      // point every time that button is pressed), and Classique (1)
      // always leaves it UNCHECKED — every one of its criteria (fakie
      // approach, switch up, switch/topside/alley-oop/true variation,
      // spin degrees) is meant to be merely POSSIBLE per spin, not
      // locked in as guaranteed on every single one — trainingFocus is
      // exactly the toggle that decides which of those two a checked
      // option means (see variationCandidates/approachCandidates/
      // filterSpinDegrees in trickGenerator.js).
      const trainingFocus =
        levelId === CUSTOM_LEVEL
          ? true
          : levelId === 1
          ? false
          : settings.tricks.trainingFocus;
      Object.assign(settings.tricks, LEVEL_PRESETS[levelId]);
      settings.tricks.trainingFocus = trainingFocus;
      const grindsForLevel = () => {
        if (levelId === CUSTOM_LEVEL) {
          return allGrindsOff();
        }
        if (levelId === 1) {
          return classiqueGrinds();
        }
        return presetGrinds(levelId);
      };
      settings.grinds = grindsForLevel();
      settings.switchUpGrinds = grindsForLevel();
      settings.switchUp2Grinds = grindsForLevel();
    }
  };

  // Touching a single trick toggle turns the level into "Custom".
  // Alley-oop/True are themselves a rotation on the Spin in reel — with
  // every degree box off, checking one would silently produce nothing
  // (nothing left to spin). Bootstrap 180 + 270 (soul + groove base
  // rotation) the first time, but only when no degree is active yet —
  // if the player already picked a specific degree (say 540), that
  // already works and shouldn't get extras they didn't ask for.
  const SPIN_IN_DEGREE_KEYS = [
    "spinIn180",
    "spinIn270",
    "spinIn360",
    "spinIn450",
    "spinIn540",
  ];
  const SPIN_BETWEEN_DEGREE_KEYS = [
    "spinBetween180",
    "spinBetween270",
    "spinBetween360",
    "spinBetween450",
    "spinBetween540",
  ];
  const SPIN_BETWEEN2_DEGREE_KEYS = [
    "spinBetween2180",
    "spinBetween2270",
    "spinBetween2360",
    "spinBetween2450",
    "spinBetween2540",
  ];

  const setTrick = (key, value) => {
    settings.tricks[key] = value;
    if (
      value &&
      (key === "spinInAlleyOop" || key === "spinInTrue") &&
      !SPIN_IN_DEGREE_KEYS.some((k) => settings.tricks[k])
    ) {
      settings.tricks.spinIn180 = true;
      settings.tricks.spinIn270 = true;
    }
    // Mirror of the bootstrap above: once BOTH Alley-oop and True are
    // off, the 180/270 that got auto-checked for them no longer have
    // any direction to spin in, so they come back off too — otherwise
    // they'd silently stay checked but do nothing (or worse, still let
    // generateSpin pick a 180/270 spin with neither direction enabled,
    // which shouldn't be reachable). Only 180/270 are touched here —
    // any other degree (360/450/540) the player picked independently is
    // left exactly as they set it.
    if (
      !value &&
      (key === "spinInAlleyOop" || key === "spinInTrue") &&
      !settings.tricks.spinInAlleyOop &&
      !settings.tricks.spinInTrue
    ) {
      settings.tricks.spinIn180 = false;
      settings.tricks.spinIn270 = false;
    }
    if (
      value &&
      (key === "spinBetweenAlleyOop" || key === "spinBetweenTrue") &&
      !SPIN_BETWEEN_DEGREE_KEYS.some((k) => settings.tricks[k])
    ) {
      settings.tricks.spinBetween180 = true;
      settings.tricks.spinBetween270 = true;
    }
    if (
      !value &&
      (key === "spinBetweenAlleyOop" || key === "spinBetweenTrue") &&
      !settings.tricks.spinBetweenAlleyOop &&
      !settings.tricks.spinBetweenTrue
    ) {
      settings.tricks.spinBetween180 = false;
      settings.tricks.spinBetween270 = false;
    }
    if (
      value &&
      (key === "spinBetween2AlleyOop" || key === "spinBetween2True") &&
      !SPIN_BETWEEN2_DEGREE_KEYS.some((k) => settings.tricks[k])
    ) {
      settings.tricks.spinBetween2180 = true;
      settings.tricks.spinBetween2270 = true;
    }
    if (
      !value &&
      (key === "spinBetween2AlleyOop" || key === "spinBetween2True") &&
      !settings.tricks.spinBetween2AlleyOop &&
      !settings.tricks.spinBetween2True
    ) {
      settings.tricks.spinBetween2180 = false;
      settings.tricks.spinBetween2270 = false;
    }
    settings.level = CUSTOM_LEVEL;
  };

  const grindEnabled = (name) => settings.grinds[name] !== false;
  // Presets define a grind selection too, so custom picks flip the level.
  const setGrind = (name, value) => {
    settings.grinds[name] = value;
    settings.level = CUSTOM_LEVEL;
  };
  const setAllGrinds = (value) => {
    for (const grind of GRINDS) {
      settings.grinds[grind.name] = value;
    }
    settings.level = CUSTOM_LEVEL;
  };

  // "Soul only" / "Groove only" pick the pure family and switch
  // everything else off — hybrids (Tabernacle, Darkslide, Byn Soul:
  // isSoulGroove) are excluded from both.
  const setGrindsByType = (type) => {
    for (const grind of GRINDS) {
      settings.grinds[grind.name] =
        type === "soul"
          ? SOUL_ONLY_NAMES.includes(grind.name)
          : grind.isGroove && !GROOVE_ONLY_EXCLUDED_NAMES.includes(grind.name);
    }
    settings.level = CUSTOM_LEVEL;
  };

  // Same as above, but for the second grind (switch up) — a fully
  // independent selection.
  const switchUpGrindEnabled = (name) => settings.switchUpGrinds[name] !== false;
  const setSwitchUpGrind = (name, value) => {
    settings.switchUpGrinds[name] = value;
    settings.level = CUSTOM_LEVEL;
  };
  const setAllSwitchUpGrinds = (value) => {
    for (const grind of GRINDS) {
      settings.switchUpGrinds[grind.name] = value;
    }
    settings.level = CUSTOM_LEVEL;
  };

  const setSwitchUpGrindsByType = (type) => {
    for (const grind of GRINDS) {
      settings.switchUpGrinds[grind.name] =
        type === "soul"
          ? SOUL_ONLY_NAMES.includes(grind.name)
          : grind.isGroove && !GROOVE_ONLY_EXCLUDED_NAMES.includes(grind.name);
    }
    settings.level = CUSTOM_LEVEL;
  };

  const switchUp2GrindEnabled = (name) => settings.switchUp2Grinds[name] !== false;
  const setSwitchUp2Grind = (name, value) => {
    settings.switchUp2Grinds[name] = value;
    settings.level = CUSTOM_LEVEL;
  };
  const setAllSwitchUp2Grinds = (value) => {
    for (const grind of GRINDS) {
      settings.switchUp2Grinds[grind.name] = value;
    }
    settings.level = CUSTOM_LEVEL;
  };

  const setSwitchUp2GrindsByType = (type) => {
    for (const grind of GRINDS) {
      settings.switchUp2Grinds[grind.name] =
        type === "soul"
          ? SOUL_ONLY_NAMES.includes(grind.name)
          : grind.isGroove && !GROOVE_ONLY_EXCLUDED_NAMES.includes(grind.name);
    }
    settings.level = CUSTOM_LEVEL;
  };

  const levelName = (id = settings.level) =>
    LEVELS.find((l) => l.id === id)?.name ?? "";

  const reelSpeedMs = () =>
    (REEL_SPEEDS.find((s) => s.id === settings.reelSpeed) ?? REEL_SPEEDS[3]).ms;

  /** Turn a verified list of exact trick entries (see
   * enumeratePossibleTricks) into a real, trainable personal family. */
  function saveCustomFamily(name, entries) {
    const family = {
      id: `custom-${Date.now()}`,
      name: name.trim() || "Sans nom",
      entries: JSON.parse(JSON.stringify(entries)),
    };
    settings.customFamilies.push(family);
    return family;
  }

  function deleteCustomFamily(id) {
    const index = settings.customFamilies.findIndex((f) => f.id === id);
    if (index !== -1) {
      settings.customFamilies.splice(index, 1);
    }
  }

  const MAX_TARGETED_HISTORY = 20;

  /**
   * Snapshots the current "Entraînement ciblé" (solo Custom) config —
   * called right as a solo session starts (see startGame in
   * useGame.js), tagged with that session's id so its checklist (see
   * targetedTrainingItems in useCollection.js) only counts lands from
   * THIS session — starting fresh each time, not "have I ever landed
   * this in my life" like a family's permanent progress. Every session
   * gets its own entry, even a repeat of the exact same config via
   * Refaire — each is a separate training occurrence worth tracking on
   * its own. Capped at MAX_TARGETED_HISTORY, oldest dropped first.
   */
  function recordTargetedTraining(sessionId) {
    const snapshot = {
      tricks: JSON.parse(JSON.stringify(settings.tricks)),
      grinds: JSON.parse(JSON.stringify(settings.grinds)),
      switchUpGrinds: JSON.parse(JSON.stringify(settings.switchUpGrinds)),
      switchUp2Grinds: JSON.parse(JSON.stringify(settings.switchUp2Grinds)),
    };
    settings.targetedTrainingHistory.unshift({
      id: `training-${Date.now()}`,
      date: new Date().toISOString(),
      sessionId,
      ...snapshot,
    });
    if (settings.targetedTrainingHistory.length > MAX_TARGETED_HISTORY) {
      settings.targetedTrainingHistory.length = MAX_TARGETED_HISTORY;
    }
  }

  /**
   * Re-applies a past targeted-training config from history — switches
   * to Entraînement ciblé (Custom) and restores that exact
   * tricks/grinds/switchUpGrinds combo. Doesn't start the session
   * itself; the caller (the history panel) does that right after, same
   * as picking Entraînement ciblé fresh would.
   */
  function redoTargetedTraining(entry) {
    settings.level = CUSTOM_LEVEL;
    settings.tricks = JSON.parse(JSON.stringify(entry.tricks));
    settings.grinds = JSON.parse(JSON.stringify(entry.grinds));
    settings.switchUpGrinds = JSON.parse(JSON.stringify(entry.switchUpGrinds));
    settings.switchUp2Grinds = JSON.parse(
      JSON.stringify(entry.switchUp2Grinds || presetGrinds(1))
    );
  }

  function deleteTargetedTraining(id) {
    const index = settings.targetedTrainingHistory.findIndex((e) => e.id === id);
    if (index !== -1) {
      settings.targetedTrainingHistory.splice(index, 1);
    }
  }

  /**
   * Merges an imported list of families (see useBackup.js exportFamilies)
   * into settings.customFamilies. A family already present — same name
   * AND same exact trick list — is skipped rather than duplicated;
   * everything else is added with a fresh id (imported ids are never
   * reused as-is, so importing the same file on two devices, or twice
   * on the same one, can never collide). Malformed entries (not the
   * `{ name, entries: [...] }` shape) are silently skipped too, rather
   * than failing the whole import over one bad entry.
   */
  function importCustomFamilies(families) {
    let imported = 0;
    let skipped = 0;
    for (const incoming of families) {
      if (!incoming || typeof incoming.name !== "string" || !Array.isArray(incoming.entries)) {
        skipped += 1;
        continue;
      }
      const incomingEntriesJson = JSON.stringify(incoming.entries);
      const alreadyExists = settings.customFamilies.some(
        (f) => f.name === incoming.name && JSON.stringify(f.entries) === incomingEntriesJson
      );
      if (alreadyExists) {
        skipped += 1;
        continue;
      }
      settings.customFamilies.push({
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: incoming.name,
        entries: JSON.parse(incomingEntriesJson),
      });
      imported += 1;
    }
    return { imported, skipped };
  }

  return {
    settings,
    applyLevel,
    setTrick,
    levelName,
    reelSpeedMs,
    saveCustomFamily,
    deleteCustomFamily,
    importCustomFamilies,
    recordTargetedTraining,
    redoTargetedTraining,
    deleteTargetedTraining,
    grindEnabled,
    setGrind,
    setAllGrinds,
    setGrindsByType,
    switchUpGrindEnabled,
    setSwitchUpGrind,
    setAllSwitchUpGrinds,
    setSwitchUpGrindsByType,
    switchUp2GrindEnabled,
    setSwitchUp2Grind,
    setAllSwitchUp2Grinds,
    setSwitchUp2GrindsByType,
  };
}