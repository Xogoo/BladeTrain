// Each family is an ordered list of specific tricks — grind + variation
// + approach all fixed (variationName "None" means no variation, i.e.
// a plain grind; approach one of "Forwards" | "Fakie" | "Switch" |
// "Fakie & Switch"). Training a family draws only the CURRENT entry,
// never randomly among the rest — you have to land it before the next
// one shows up. Rotation in/out stay random as usual, following
// whatever the player's own settings allow.

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
  "Citric Acid",
  "Hot Dog",
  "Mizou",
  "Sidewalk",
  "X-Grind",
  "Training Wheel",
  "BS Tabernacle",
  "FS Tabernacle",
  "BS Darkslide",
  "FS Darkslide",
  "BS Wheelbarrow",
  "FS Wheelbarrow",
  "BS Byn Soul",
  "FS Byn Soul",
  "Closed Book",
  "Open Book",
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

// Every grind name in a list, each landed Forwards then Switch, in that
// order — used to build the "whole category, normal + switch" families.
function normalAndSwitchEntries(grindNames) {
  return grindNames.flatMap((grindName) => [
    { grindName, variationName: "None", approach: "Forwards" },
    { grindName, variationName: "None", approach: "Switch" },
  ]);
}

export const FAMILIES = [
  {
    id: "soul-normal-switch",
    name: "Soul (normal + switch)",
    badgeName: "Soul Mates",
    tier: 1,
    entries: normalAndSwitchEntries(SOUL_GRIND_NAMES),
  },
  {
    id: "groove-normal-switch",
    name: "Groove (normal + switch)",
    badgeName: "Groove Mates",
    tier: 1,
    entries: normalAndSwitchEntries(GROOVE_GRIND_NAMES),
  },
];

export function familyById(id) {
  return FAMILIES.find((family) => family.id === id) || null;
}