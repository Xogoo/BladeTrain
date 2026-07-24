// Each family is an ordered list of specific tricks — grind + variation
// + approach all fixed (variationName "None" means no variation, i.e.
// a plain grind; approach one of "Forwards" | "Fakie" | "Switch" |
// "Fakie & Switch"). Training a family draws only the CURRENT entry,
// never randomly among the rest — you have to land it before the next
// one shows up. Rotation in/out stay random as usual, following
// whatever the player's own settings allow — UNLESS an entry also sets
// `spinToName` (e.g. "Inspin 180" for Alley-oop), which pins the
// spin-in exactly like variation/approach, regardless of the player's
// own Alley-oop/True/degree settings.
//
// Every family comes in two independent halves — `track: "normal"` and
// `track: "switch"` — meant to feed two separate Career progressions
// (a Normal career and a Switch career) rather than one combined list.
// Each half only ever contains one entry per grind (either the plain
// approach or its switch counterpart), never both.

// Every soul-plate grind in the game (isGroove: false) — kept as an
// explicit list so a family's contents are easy to read/edit here,
// rather than importing GRINDS and filtering live.
const SOUL_GRIND_NAMES = [
  "Soul",
  "Acid",
  "Makio",
  "PStar",
  "Torque Soul",
  "Mistrial",
  "Mizou",
  "X-Grind",
];

// Every groove grind in the game (isGroove: true).
const GROOVE_GRIND_NAMES = [
  "FS Royale",
  "BS Royale",
  "FS Unity",
  "BS Unity",
  "FS Torque",
  "BS Torque",
  "FS Cab driver",
  "BS Cab driver",
  "FS Backslide",
  "BS Backslide",
  "FS Pudslide",
  "BS Pudslide",
  "FS Full Torque",
  "BS Full Torque",
  "FS Fastslide",
  "BS Fastslide",
  "Frontside",
  "Backside",
  "FS Savannah",
  "BS Savannah",
];

// Every grind that has a plain "Topside" entry in its variations list
// (checked against trickData.js — Topside doesn't exist on groove
// grinds, only soul-plate ones). Kept explicit, same convention as the
// soul/groove lists above.
const TOPSIDE_GRIND_NAMES = [
  "Soul",
  "Acid",
  "Makio",
  "PStar",
  "Torque Soul",
  "Mistrial",
  "Mizou",
  "X-Grind",
];

// The one shared approach-picking rule, so every generator below stays
// in sync: plain tricks alternate Forwards/Switch, Fakie-based ones
// (Zerospin, the cab family, groove's fakie-270) alternate Fakie/Fakie
// & Switch. `switchMode` selects which half of the pair to build.
function approachName(switchMode, fakie = false) {
  if (fakie) {
    return switchMode ? "Fakie & Switch" : "Fakie";
  }
  return switchMode ? "Switch" : "Forwards";
}

// Plain grind, one approach per grind. `variationName` defaults to
// "None"; pass e.g. "Topside" to build around that variation instead.
function plainEntries(grindNames, switchMode, variationName = "None") {
  const approach = approachName(switchMode);
  return grindNames.map((grindName) => ({ grindName, variationName, approach }));
}

// Alley-oop (Inspin 180) and True (Outspin 180) only exist as named
// spin-ins on soul-plate grinds — groove grinds have no alley-oop/true
// naming (an alley-oop Royale is just a Full Torque). `variationName`
// defaults to "None" (plain grind); pass "Topside" to combine the spin
// with the Topside variation instead (Alley-oop Top / True Top).
function spinEntries(grindNames, spinToName, switchMode, variationName = "None") {
  const approach = approachName(switchMode);
  return grindNames.map((grindName) => ({ grindName, variationName, approach, spinToName }));
}

// Same idea as spinEntries, but covering several spin-ins at once (e.g.
// both directions of a 360) instead of just one — currently unused
// (360/Hurricane and their Topside versions were split apart into
// separate families, one direction each), kept here in case a future
// family wants to combine directions again.
function bothSpinEntries(grindNames, spinToNames, switchMode, variationName = "None") {
  const approach = approachName(switchMode);
  return grindNames.flatMap((grindName) =>
    spinToNames.map((spinToName) => ({ grindName, variationName, approach, spinToName }))
  );
}

// Groove grinds have no Alley-oop/True naming of their own — their
// closest equivalent is entering on the shortest non-flat spin, 270°.
// Frontside-type grinds (FS ... and plain "Frontside") spin in Outspin
// 270; backside-type ones (BS ... and plain "Backside") spin in Inspin
// 270 — same FS/BS split trickGenerator.js uses for the real pool.
// Pass `{ fakie: true }` for the fakie-entered version (groove's
// closest thing to a "cab").
function isFrontsideGroove(grindName) {
  return grindName === "Frontside" || grindName.startsWith("FS ");
}

function groove270Entries(grindNames, switchMode, { fakie = false } = {}) {
  const approach = approachName(switchMode, fakie);
  return grindNames.map((grindName) => {
    const spinToName = isFrontsideGroove(grindName) ? "Outspin 270" : "Inspin 270";
    return { grindName, variationName: "None", approach, spinToName };
  });
}

// Every Fakie-approach trick with a forced spin-in: Zerospin (no spin
// at all — the namer only prints "Zerospin" for soul grinds, groove
// ones just read as e.g. "Fakie Frontside", same trick either way) and
// the "cab" family (Halfcab/True Halfcab/Fullcab/True Fullcab), which
// ARE soul-only in the namer since groove spins never use 180°/360° at
// all (grooves only ever spin 270/450/630/810). `spinToName` defaults
// to "None" (Zerospin); `variationName` defaults to "None" (pass
// "Topside" for Topside Zerospin).
function fakieSpinEntries(grindNames, spinToName, switchMode, variationName = "None") {
  const approach = approachName(switchMode, true);
  return grindNames.map((grindName) => ({ grindName, variationName, approach, spinToName }));
}

// Builds the Normal/Switch pair for one family group in one go, so
// FAMILIES below only has to describe each group once. `buildEntries`
// receives `switchMode` (false = normal half, true = switch half).
function trackPair({ id, name, badgeName, tier, buildEntries }) {
  return [
    {
      id: `${id}-normal`,
      name: `${name} (Normal)`,
      badgeName,
      tier,
      track: "normal",
      entries: buildEntries(false),
    },
    {
      id: `${id}-switch`,
      name: `${name} (Switch)`,
      badgeName: `${badgeName} (Switch)`,
      tier,
      track: "switch",
      entries: buildEntries(true),
    },
  ];
}

export const FAMILIES = [
  ...trackPair({
    id: "soul",
    name: "Soul",
    badgeName: "Soul Mates",
    tier: 1,
    buildEntries: (switchMode) => plainEntries(SOUL_GRIND_NAMES, switchMode),
  }),
  ...trackPair({
    id: "groove",
    name: "Groove",
    badgeName: "Groove Mates",
    tier: 2,
    buildEntries: (switchMode) => plainEntries(GROOVE_GRIND_NAMES, switchMode),
  }),
  ...trackPair({
    id: "topside",
    name: "Topside",
    badgeName: "Topside Story",
    tier: 3,
    buildEntries: (switchMode) => plainEntries(TOPSIDE_GRIND_NAMES, switchMode, "Topside"),
  }),
  ...trackPair({
    id: "alleyoop",
    name: "Alley-oop",
    badgeName: "Alley-Oop Troop",
    tier: 4,
    buildEntries: (switchMode) => spinEntries(SOUL_GRIND_NAMES, "Inspin 180", switchMode),
  }),
  ...trackPair({
    id: "true",
    name: "True",
    badgeName: "True Story",
    tier: 5,
    buildEntries: (switchMode) => spinEntries(SOUL_GRIND_NAMES, "Outspin 180", switchMode),
  }),
  ...trackPair({
    id: "groove-270",
    name: "Groove 270",
    badgeName: "Groove-Oop",
    tier: 8,
    buildEntries: (switchMode) => groove270Entries(GROOVE_GRIND_NAMES, switchMode),
  }),
  ...trackPair({
    id: "alleyoop-top",
    name: "Alley-oop Top",
    badgeName: "Top Gun",
    tier: 6,
    buildEntries: (switchMode) =>
      spinEntries(TOPSIDE_GRIND_NAMES, "Inspin 180", switchMode, "Topside"),
  }),
  ...trackPair({
    id: "true-top",
    name: "True Top",
    badgeName: "True Grit",
    tier: 7,
    buildEntries: (switchMode) =>
      spinEntries(TOPSIDE_GRIND_NAMES, "Outspin 180", switchMode, "Topside"),
  }),
  ...trackPair({
    id: "360",
    name: "360",
    badgeName: "360 No Scope",
    tier: 14,
    buildEntries: (switchMode) => spinEntries(SOUL_GRIND_NAMES, "Inspin 360", switchMode),
  }),
  ...trackPair({
    id: "hurricane",
    name: "Hurricane",
    badgeName: "Eye of the Storm",
    tier: 16,
    buildEntries: (switchMode) => spinEntries(SOUL_GRIND_NAMES, "Outspin 360", switchMode),
  }),
  ...trackPair({
    id: "360-top",
    name: "360 Top",
    badgeName: "Top Spin",
    tier: 15,
    buildEntries: (switchMode) =>
      spinEntries(TOPSIDE_GRIND_NAMES, "Inspin 360", switchMode, "Topside"),
  }),
  ...trackPair({
    id: "hurricane-top",
    name: "Hurricane Top",
    badgeName: "Hurricane Season",
    tier: 17,
    buildEntries: (switchMode) =>
      spinEntries(TOPSIDE_GRIND_NAMES, "Outspin 360", switchMode, "Topside"),
  }),
  ...trackPair({
    id: "zerospin",
    name: "Zerospin",
    badgeName: "Zero Hour",
    tier: 9,
    buildEntries: (switchMode) =>
      fakieSpinEntries([...SOUL_GRIND_NAMES, ...GROOVE_GRIND_NAMES], "None", switchMode),
  }),
  ...trackPair({
    id: "zerospin-top",
    name: "Topside Zerospin",
    badgeName: "Absolute Zero",
    tier: 10,
    buildEntries: (switchMode) =>
      fakieSpinEntries(TOPSIDE_GRIND_NAMES, "None", switchMode, "Topside"),
  }),
  ...trackPair({
    id: "halfcab",
    name: "Halfcab",
    badgeName: "Taxi Driver",
    tier: 11,
    buildEntries: (switchMode) => fakieSpinEntries(SOUL_GRIND_NAMES, "Inspin 180", switchMode),
  }),
  ...trackPair({
    id: "true-halfcab",
    name: "True Halfcab",
    badgeName: "Cabin Fever",
    tier: 12,
    buildEntries: (switchMode) => fakieSpinEntries(SOUL_GRIND_NAMES, "Outspin 180", switchMode),
  }),
  ...trackPair({
    id: "fullcab",
    name: "Fullcab",
    badgeName: "Cab Calloway",
    tier: 19,
    buildEntries: (switchMode) => fakieSpinEntries(SOUL_GRIND_NAMES, "Inspin 360", switchMode),
  }),
  ...trackPair({
    id: "true-fullcab",
    name: "True Fullcab",
    badgeName: "Yellow Cab",
    tier: 18,
    buildEntries: (switchMode) => fakieSpinEntries(SOUL_GRIND_NAMES, "Outspin 360", switchMode),
  }),
  ...trackPair({
    id: "groove-fakie-270",
    name: "Groove Fakie 270",
    badgeName: "Reverse Gear",
    tier: 13,
    buildEntries: (switchMode) =>
      groove270Entries(GROOVE_GRIND_NAMES, switchMode, { fakie: true }),
  }),
];

export function familyById(id) {
  return FAMILIES.find((family) => family.id === id) || null;
}