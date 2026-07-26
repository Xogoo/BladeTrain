import { reactive, watch } from "vue";
import { GRINDS, RARE_GRIND_NAME_PARTS } from "../game/trickData.js";

const STORAGE_KEY = "aight-settings-v3";

export const CUSTOM_LEVEL = 5;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const LEVELS = [
  { id: 1, name: "Chill", tagline: "Grinds de base, pas de rotations" },
  { id: 2, name: "Juicy", tagline: "Topsides, negatives et 360" },
  { id: 3, name: "Nuts", tagline: "Tout, jusqu'aux 540" },
  { id: 4, name: "Switch up", tagline: "Nuts, plus un second grind" },
  { id: CUSTOM_LEVEL, name: "Custom", tagline: "Tes propres règles" },
];

// Solo mostly means Custom (train exactly what you want) or Switch up
// (Nuts + a second grind) — Chill/Juicy/Nuts as separate steps don't
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
// stay neutral either way, see body.accent-* in base.css. "mono" is
// the original black & white look and needs no body class at all.
export const ACCENT_COLORS = [
  { id: "mono", name: "Monochrome", swatch: "#f2f2f2" },
  { id: "red", name: "Rouge", swatch: "#ff5252" },
  { id: "orange", name: "Orange", swatch: "#ffab5b" },
  { id: "yellow", name: "Jaune", swatch: "#ffe14d" },
  { id: "green", name: "Vert", swatch: "#7cff8a" },
  { id: "teal", name: "Turquoise", swatch: "#2dd4bf" },
  { id: "blue", name: "Bleu", swatch: "#4d8dff" },
  { id: "indigo", name: "Indigo", swatch: "#6366f1" },
  { id: "purple", name: "Violet", swatch: "#a970ff" },
  { id: "pink", name: "Rose", swatch: "#ff6fa5" },
];

// Overall text/UI size (Réglages > Taille du texte) — applied as a
// zoom on <body> (see body.text-* in base.css), not individual
// font-sizes, since the whole app is built in fixed px rather than a
// relative unit like rem.
export const FONT_SIZES = [
  { id: "normal", name: "Normale" },
  { id: "large", name: "Grande" },
  { id: "xlarge", name: "Très grande" },
];

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
  // for exactly what "locked" means per section.
  trainingFocus: false,
  switchUp: false,
  // Independent 2nd-grind counterparts, so combos like "Top Soul to
  // True Top Soul" are trainable: switchUpTopside mirrors "topside" but
  // only for the 2nd grind's variation (every other variation type
  // stays shared between both grinds). spinBetweenAlleyOop/True mirror
  // spinInAlleyOop/True but for the rotation between the two grinds.
  switchUpTopside: false,
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
};

const LEVEL_PRESETS = {
  1: {
    ...ALL_TRICKS_OFF,
    spinIn180: true,
    spinIn270: true,
    spinOut180: true,
    spinOut270: true,
  },
  2: {
    ...ALL_TRICKS_OFF,
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
    switchUp: false,
    spinBetween180: false,
    spinBetween270: false,
    spinBetween360: false,
    spinBetween450: false,
    spinBetween540: false,
    trainingFocus: false,
  },
  4: {
    ...Object.fromEntries(Object.keys(ALL_TRICKS_OFF).map((k) => [k, true])),
    switchUp: true,
    trainingFocus: false,
  },
  // Clicking "Custom" itself (not just touching a single checkbox, which
  // silently flips the level without resetting anything) starts from a
  // blank slate — every trick/spin toggle off, including the direction
  // filters (Alley-oop/True), and every grind off too.
  [CUSTOM_LEVEL]: {
    ...ALL_TRICKS_OFF,
    spinInAlleyOop: false,
    spinInTrue: false,
    spinBetweenAlleyOop: false,
    spinBetweenTrue: false,
  },
};

// Grinds each difficulty preset switches off, matched by substring so
// FS/BS variants are covered. Nuts (3), Switch up (4) and Custom allow
// everything.
const LEVEL_EXCLUDED_GRINDS = {
  1: [...RARE_GRIND_NAME_PARTS, "Pudslide", "Fastslide"],
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
    mode: "solo", // solo | group
    level: 1,
    players: ["Joueur 1", "Joueur 2"],
    reelSpeed: "fast",
    introMusic: false,
    // Quick test toggle: swaps to a real light palette — see
    // .theme-inverted in base.css.
    invertedTheme: false,
    // Which hue the app's highlights use — see ACCENT_COLORS above and
    // body.accent-* in base.css. "mono" needs no body class.
    accentColor: "mono",
    // Overall text/UI size — the whole app is built in fixed px, not
    // rem, so this scales via a CSS zoom on <body> (see body.text-* in
    // base.css) rather than trying to touch every font-size individually.
    fontSize: "normal", // "normal" | "large" | "xlarge"
    // Stripped-down display for handling the phone mid-session (on the
    // ground, one-handed, riding gloves...) — just the trick name, big,
    // and the two main action buttons, everything else hidden. See
    // .game--focus in GameScreen.vue and the header/nav toggle in
    // App.vue.
    focusMode: false,
    // Only used to pre-fill the "to" field when sharing/emailing a
    // backup export — never sent anywhere on its own, see
    // useBackup.js.
    backupEmail: "",
    tricks: { ...ALL_TRICKS_OFF },
    // Per-grind training filter for the first grind: name -> false when
    // switched off. Missing entries mean "on", so new grinds default to
    // enabled.
    grinds: presetGrinds(1),
    // Same idea but for the second grind (switch up) — fully
    // independent, so the two reels can be trained separately.
    switchUpGrinds: presetGrinds(1),
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
    customFamilies: [], // { id, name, entries: [{ grindName, variationName, approach, spinToName, spinOffName, switchUpGrindName, switchUpVariationName, switchSpinName }] }
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
    if (
      !Array.isArray(merged.players) ||
      merged.players.length < MIN_PLAYERS ||
      merged.players.some((name) => typeof name !== "string")
    ) {
      merged.players = [...defaults.players];
    }
    merged.players = merged.players.slice(0, MAX_PLAYERS);
    if (merged.mode !== "solo" && merged.mode !== "group") {
      merged.mode = "solo";
    }
    merged.introMusic = false;
    if (!merged.grinds || typeof merged.grinds !== "object") {
      merged.grinds = {};
    }
    if (!merged.switchUpGrinds || typeof merged.switchUpGrinds !== "object") {
      merged.switchUpGrinds = {};
    }
    if (!merged.modeConfigs || typeof merged.modeConfigs !== "object") {
      merged.modeConfigs = {};
    }
    if (!Array.isArray(merged.customFamilies)) {
      merged.customFamilies = [];
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
      })
    );
    const parked = settings.modeConfigs[mode];
    if (parked) {
      settings.level = parked.level;
      Object.assign(settings.tricks, ALL_TRICKS_OFF, parked.tricks);
      settings.grinds = { ...parked.grinds };
      settings.switchUpGrinds = { ...(parked.switchUpGrinds || {}) };
    }
  }
);

export function useSettings() {
  const applyLevel = (levelId) => {
    settings.level = levelId;
    if (LEVEL_PRESETS[levelId]) {
      Object.assign(settings.tricks, LEVEL_PRESETS[levelId]);
      settings.grinds =
        levelId === CUSTOM_LEVEL ? allGrindsOff() : presetGrinds(levelId);
      settings.switchUpGrinds =
        levelId === CUSTOM_LEVEL ? allGrindsOff() : presetGrinds(levelId);
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
    if (
      value &&
      (key === "spinBetweenAlleyOop" || key === "spinBetweenTrue") &&
      !SPIN_BETWEEN_DEGREE_KEYS.some((k) => settings.tricks[k])
    ) {
      settings.tricks.spinBetween180 = true;
      settings.tricks.spinBetween270 = true;
    }
    settings.level = CUSTOM_LEVEL;
  };

  const reset = () => {
    Object.assign(settings, defaultSettings());
    Object.assign(settings.tricks, ALL_TRICKS_OFF);
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

  return {
    settings,
    applyLevel,
    setTrick,
    reset,
    levelName,
    reelSpeedMs,
    saveCustomFamily,
    deleteCustomFamily,
    grindEnabled,
    setGrind,
    setAllGrinds,
    setGrindsByType,
    switchUpGrindEnabled,
    setSwitchUpGrind,
    setAllSwitchUpGrinds,
    setSwitchUpGrindsByType,
  };
}