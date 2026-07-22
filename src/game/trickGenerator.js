import {
  APPROACHES,
  GRINDS,
  SPINS_OFF_GROOVE,
  SPINS_OFF_SOUL,
  SPINS_TO_GROOVE_BS,
  SPINS_TO_GROOVE_FS,
  SPINS_TO_GROOVE_FS_FAKIE,
  SPINS_TO_SOUL,
  SPINS_TO_SOUL_FAKIE,
  variationByName,
} from "./trickData.js";
import { nameTrick } from "./trickNamer.js";

const NONE = { name: "None", score: 0 };

export function generateSpin(
  settings,
  usedGrinds = [],
  grindBias = null,
  grindToggles = null,
  switchUpGrindToggles = null,
  lockedPairs = null
) {
  const grindPool = grindCandidates(settings, usedGrinds, grindBias, grindToggles);

  // "Review neglected grinds" mode: grind + variation come straight
  // from a fixed list (e.g. combos not landed in 30+ days) instead of
  // the usual weighted pools/toggles. Everything else (approach, spin
  // degrees, switch up) still follows the current settings as normal —
  // the pool above is only used for the reel's visual spin, the winner
  // is forced.
  let grind;
  let lockedVariationName = null;
  if (lockedPairs && lockedPairs.length > 0) {
    const pair = lockedPairs[Math.floor(Math.random() * lockedPairs.length)];
    grind = GRINDS.find((g) => g.name === pair.grindName) || pickWeighted(grindPool);
    lockedVariationName = pair.variationName;
  } else {
    grind = pickWeighted(grindPool);
  }

  const variationPool = variationCandidates(grind, settings);
  const variation =
    lockedVariationName !== null
      ? lockedVariationName === "None"
        ? null
        : variationByName(lockedVariationName)
      : hasVariationReel(settings)
      ? pickWeighted(variationPool)
      : null;

  let switchUpPool = [];
  let switchUp = null;
  let switchSpinPool = [];
  let switchSpin = null;
  let switchUpVariationPool = [];
  let switchUpVariation = null;
  if (hasSwitchUpReel(settings)) {
    switchUpPool = grindCandidates(
      settings,
      usedGrinds,
      grindBias,
      switchUpGrindToggles !== null ? switchUpGrindToggles : grindToggles
    ).filter((candidate) => candidate.name !== grind.name);

    if (switchUpPool.length === 0) {
      switchUpPool = grindCandidates(
        settings,
        usedGrinds,
        grindBias,
        switchUpGrindToggles !== null ? switchUpGrindToggles : grindToggles
      );
    }
    switchUp = pickWeighted(switchUpPool);

    if (hasSwitchSpinReel(settings)) {
      switchSpinPool = switchSpinCandidates(grind, switchUp, settings);
      switchSpin = pickWeighted(switchSpinPool);
    }

    switchUpVariationPool = variationCandidates(switchUp, settings, true);
    switchUpVariation = hasVariationReel(settings)
      ? pickWeighted(switchUpVariationPool)
      : null;
  }

  const approachPool = approachCandidates(grind, settings);
  const approach = hasApproachReel(settings) ? pickWeighted(approachPool) : null;

  const spinToPool = spinToCandidates(grind, approach, settings);
  const spinTo = pickWeighted(spinToPool);

  const spinOffPool = spinOffCandidates(grind, settings);
  const spinOff = pickWeighted(spinOffPool);

  const reels = [
    reel("Approach", "Approach", approachPool, approach),
    reel("SpinTo", "Spin in", spinToPool, spinTo),
    reel("Grind", "Grind", grindPool, grind),
    reel("GrindVariation", "Variation", variationPool, variation),
    reel("SwitchSpin", "Spin", switchSpinPool, switchSpin),
    reel("SwitchUp", "To", switchUpPool, switchUp),
    reel("SwitchUpVariation", "Variation", switchUpVariationPool, switchUpVariation),
    reel("SpinOff", "Spin out", spinOffPool, spinOff),
  ];

  const { parsed, orig } = nameTrick(
    reels.map(({ name, winner }) => ({ name, winner }))
  );

  return { reels, name: parsed, orig, score: scoreSpin(reels) };
}

function reel(name, label, pool, winner) {
  return { name, label, pool, winner, hidden: winner === null };
}

export function hasApproachReel(settings) {
  return settings.fakie || settings.switch;
}

export function hasVariationReel(settings) {
  return (
    settings.negative ||
    settings.topside ||
    settings.rough ||
    settings.tough ||
    settings.channel ||
    settings.christ ||
    settings.grabs ||
    settings.rocket ||
    settings.crossgrab
  );
}

export function hasSwitchUpReel(settings) {
  return !!settings.switchUp;
}

// The spin between the two grinds only shows once switch up is active
// — it has no separate on/off toggle any more, since unchecking all 3
// of its degree checkboxes already collapses it down to "None" only.
export function hasSwitchSpinReel(settings) {
  return !!settings.switchUp;
}

function pickWeighted(pool) {
  const total = pool.reduce((sum, entry) => sum + (entry.weight || 1), 0);
  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.weight || 1;
    if (roll < 0) {
      return entry;
    }
  }
  return pool[pool.length - 1];
}

function grindCandidates(settings, usedGrinds, grindBias, grindToggles) {
  let pool = GRINDS;
  if (grindToggles) {
    const picked = pool.filter((grind) => grindToggles[grind.name] !== false);
    if (picked.length > 0) {
      pool = picked;
    }
  }

  const windowSize = Math.min(usedGrinds.length, pool.length - 1);
  const recent = windowSize > 0 ? usedGrinds.slice(-windowSize) : [];
  const unused = pool.filter((grind) => !recent.includes(grind.name));
  if (unused.length > 0) {
    pool = unused;
  }

  return pool.map((grind) => {
    const soulFactor = grind.isGroove || grind.isSoulGroove ? 1 : 2;
    const biasFactor = (grindBias && grindBias[grind.name]) || 1;
    return { ...grind, weight: grind.weight * soulFactor * biasFactor };
  });
}

function variationCandidates(grind, settings, forSwitchUp = false) {
  // Topside can be set independently for the 2nd grind (switch up) so
  // combos like "Top Soul to True Top Soul" are trainable — every
  // other variation type stays shared between both grinds, since only
  // Topside/Alley-oop/True were asked to be split out.
  const topsideEnabled = forSwitchUp ? settings.switchUpTopside : settings.topside;
  const excludedParts = [
    [settings.negative, "Negative"],
    [topsideEnabled, "Topside"],
    [settings.rough, "Rough"],
    [settings.tough, "Tough"],
    [settings.channel, "Channel"],
    [settings.christ, "Christ"],
    [settings.grabs, "Grab"],
    [settings.rocket, "Rocket"],
    [settings.crossgrab, "Cross-Grab"],
  ]
    .filter(([enabled]) => !enabled)
    .map(([, part]) => part);

  const allowed = grind.variations
    .filter((name) => !excludedParts.some((part) => name.includes(part)))
    .map(variationByName);

  // Training focus: normally "None" (plain grind, no variation) is
  // always a candidate alongside whatever's enabled, so enabling e.g.
  // Topside only makes topside *possible*, not guaranteed. Locking it
  // removes that plain option, so every spin lands on one of the
  // enabled variations — falling back to "None" only if the grind has
  // no matching variation at all, so the reel never comes up empty.
  if (settings.trainingFocus && allowed.length > 0) {
    return allowed;
  }
  return [...allowed, variationByName("None")];
}

function approachCandidates(grind, settings) {
  const allowed = APPROACHES.filter(
    (approach) =>
      (settings.switch || !approach.isSwitch) &&
      (settings.fakie || !approach.isFakie) &&
      !(grind.noSwitch && approach.isSwitch)
  );
  // Training focus: pin the approach to exactly the checked combination
  // instead of merely allowing it — Fakie checked alone means every
  // trick is fakie; Fakie + Switch both checked means every trick is
  // Fakie & Switch, rather than leaving Forwards / Fakie-only /
  // Switch-only still possible alongside it.
  if (settings.trainingFocus) {
    const locked = allowed.filter(
      (approach) =>
        approach.isFakie === !!settings.fakie &&
        approach.isSwitch === !!settings.switch
    );
    if (locked.length > 0) {
      return locked;
    }
  }
  return allowed;
}

// Direction filter for the Spin in reel only — this is the reel whose
// Inspin/Outspin result gets named "Alley-oop"/"True" (and "True Top",
// etc. once a variation is added on top). Runs in parallel to the
// random Inspin/Outspin weighting already in the pool data: leaving
// both settings on reproduces the original odds untouched, unchecking
// one forces every spin-in result to the other direction.
function filterSpinDirection(pool, settings) {
  return pool.filter((entry) => {
    if (entry.name === "None") {
      return true;
    }
    if (entry.name.includes("Inspin")) {
      return settings.spinInAlleyOop !== false;
    }
    if (entry.name.includes("Outspin")) {
      return settings.spinInTrue !== false;
    }
    return true;
  });
}

// True if at least one degree checkbox for this reel prefix is on —
// used by training focus to know a reel was actually narrowed, on top
// of (or instead of) a direction narrowing.
function hasAnyDegreeChecked(settings, prefix) {
  return ["180", "270", "360", "450", "540"].some(
    (degree) => settings[`${prefix}${degree}`]
  );
}

function spinToCandidates(grind, approach, settings) {
  const isFakie = approach ? approach.isFakie : false;
  let pool;
  if (!grind.isGroove) {
    pool = isFakie ? SPINS_TO_SOUL_FAKIE : SPINS_TO_SOUL;
  } else if (grind.name.includes("FS ")) {
    pool = isFakie ? SPINS_TO_GROOVE_FS_FAKIE : SPINS_TO_GROOVE_FS;
  } else {
    pool = SPINS_TO_GROOVE_BS;
  }
  pool = filterSpinDirection(pool, settings);
  // Training focus: with only Alley-oop (or only True) checked — or a
  // specific degree checked with both directions still on — "None"
  // still slips through for grinds that support a plain forward entry.
  // Locking it removes that plain option, so every spin actually uses
  // what was narrowed. Only kicks in when something was actually
  // narrowed (direction and/or degree), not the unrestricted baseline.
  if (
    settings.trainingFocus &&
    (!(settings.spinInAlleyOop && settings.spinInTrue) ||
      hasAnyDegreeChecked(settings, "spinIn"))
  ) {
    const withoutNone = pool.filter((entry) => entry.name !== "None");
    if (withoutNone.length > 0) {
      pool = withoutNone;
    }
  }
  // Fall back to the unfiltered pool only when filtering left nothing
  // at all — happens on fakie-to-soul and groove-entry pools, which
  // have no "None" option, so unchecking both directions would
  // otherwise empty the Spin in reel entirely. When a "None" entry
  // does survive (plain forward tricks: Soul, Makio, ...), that's a
  // perfectly valid single-candidate pool — no fallback needed, since
  // unchecking both directions is meant to still allow the no-spin
  // version of the trick, just not Alley-oop/True specifically.
  if (pool.length === 0) {
    pool =
      !grind.isGroove
        ? isFakie
          ? SPINS_TO_SOUL_FAKIE
          : SPINS_TO_SOUL
        : grind.name.includes("FS ")
        ? isFakie
          ? SPINS_TO_GROOVE_FS_FAKIE
          : SPINS_TO_GROOVE_FS
        : SPINS_TO_GROOVE_BS;
  }
  return filterSpinDegrees(pool, settings, "spinIn");
}

function spinOffCandidates(grind, settings) {
  let pool = grind.isGroove ? SPINS_OFF_GROOVE : SPINS_OFF_SOUL;
  // Same idea as Spin in: "None" (soul) / "Forwards" & "Fakie" (groove)
  // are the no-rotation outcomes for this reel. With training focus on
  // and at least one Spin out degree checked, drop them so a spin out
  // is actually guaranteed instead of sometimes just not happening.
  if (settings.trainingFocus && hasAnyDegreeChecked(settings, "spinOut")) {
    const withoutDefault = pool.filter(
      (entry) => entry.name !== "None" && entry.name !== "Forwards" && entry.name !== "Fakie"
    );
    if (withoutDefault.length > 0) {
      pool = withoutDefault;
    }
  }
  return filterSpinDegrees(pool, settings, "spinOut");
}

// Same idea as filterSpinDirection, but for the rotation between the
// two switch-up grinds — independent checkboxes, so a combo like "Top
// Soul to True Top Soul" (True specifically on the 2nd grind's
// rotation) is trainable without also forcing the 1st grind's
// direction.
function filterSwitchSpinDirection(pool, settings) {
  return pool.filter((entry) => {
    if (entry.name === "None") {
      return true;
    }
    if (entry.name.includes("Inspin")) {
      return settings.spinBetweenAlleyOop !== false;
    }
    if (entry.name.includes("Outspin")) {
      return settings.spinBetweenTrue !== false;
    }
    return true;
  });
}

// Rotation between the first and second grind of a switch up. The
// valid degrees depend on whether the two grinds are the same type or
// not: same type (soul→soul or groove→groove) rotates like a normal
// soul spin (180/360/540); different type (soul→groove or
// groove→soul) uses the groove-equivalent cadence (270/450) instead.
function switchSpinCandidates(grind, switchUpGrind, settings) {
  const sameType = grind.isGroove === switchUpGrind.isGroove;
  let pool = sameType
    ? [
        { name: "None", weight: 4, score: 0 },
        { name: "Inspin 180", weight: 4, score: 1 },
        { name: "Outspin 180", weight: 1, score: 1 },
        { name: "Inspin 360", weight: 1, score: 2 },
        { name: "Outspin 360", weight: 1, score: 2 },
        { name: "Inspin 540", weight: 1, score: 3 },
        { name: "Outspin 540", weight: 1, score: 3 },
      ]
    : [
        { name: "None", weight: 4, score: 0 },
        { name: "Inspin 270", weight: 1, score: 2 },
        { name: "Outspin 270", weight: 1, score: 2 },
        { name: "Inspin 450", weight: 1, score: 3 },
        { name: "Outspin 450", weight: 1, score: 3 },
      ];
  pool = filterSwitchSpinDirection(pool, settings);
  // If both directions got switched off at once, fall back to the
  // unfiltered pool rather than leaving nothing to spin (mirrors the
  // Spin in reel's own safety net).
  if (pool.length === 0) {
    pool = sameType
      ? [
          { name: "None", weight: 4, score: 0 },
          { name: "Inspin 180", weight: 4, score: 1 },
          { name: "Outspin 180", weight: 1, score: 1 },
          { name: "Inspin 360", weight: 1, score: 2 },
          { name: "Outspin 360", weight: 1, score: 2 },
          { name: "Inspin 540", weight: 1, score: 3 },
          { name: "Outspin 540", weight: 1, score: 3 },
        ]
      : [
          { name: "None", weight: 4, score: 0 },
          { name: "Inspin 270", weight: 1, score: 2 },
          { name: "Outspin 270", weight: 1, score: 2 },
          { name: "Inspin 450", weight: 1, score: 3 },
          { name: "Outspin 450", weight: 1, score: 3 },
        ];
  }
  // Same idea again: with training focus on and the direction and/or a
  // degree narrowed, force an actual rotation between the two grinds
  // instead of sometimes landing on "no rotation between them".
  if (
    settings.trainingFocus &&
    (!(settings.spinBetweenAlleyOop && settings.spinBetweenTrue) ||
      hasAnyDegreeChecked(settings, "spinBetween"))
  ) {
    const withoutNone = pool.filter((entry) => entry.name !== "None");
    if (withoutNone.length > 0) {
      pool = withoutNone;
    }
  }
  return filterSpinDegrees(pool, settings, "spinBetween");
}

// 720/900 no longer exist anywhere in the game — dropped structurally
// regardless of settings, since no toggle covers them any more.
const MAX_DEGREE_EXCLUDED = /720|630|900|810/;

// Each of the 3 reel groups (spin in / spin between / spin out) now has
// its own independent set of 5 checkboxes — 180, 270, 360, 450, 540 —
// so a groove trick's 270 can be enabled without dragging 360 along
// with it (and vice versa).
function filterSpinDegrees(pool, settings, prefix) {
  const excludedDegrees = [
    [settings[`${prefix}180`], ["180"]],
    [settings[`${prefix}270`], ["270"]],
    [settings[`${prefix}360`], ["360"]],
    [settings[`${prefix}450`], ["450"]],
    [settings[`${prefix}540`], ["540"]],
  ]
    .filter(([enabled]) => !enabled)
    .flatMap(([, degrees]) => degrees);

  const capped = pool.filter((spin) => !MAX_DEGREE_EXCLUDED.test(spin.name));

  const byDegree = capped.filter(
    (spin) => !excludedDegrees.some((degree) => spin.name.includes(degree))
  );
  // If every degree checkbox for this reel ended up off (or otherwise
  // excludes everything left in the pool — e.g. direction + training
  // focus already narrowed it to Alley-oop only, and no degree box was
  // checked), degree-filtering would empty the reel entirely. Fall
  // back to the pre-degree-filter pool rather than leaving nothing to
  // spin.
  return byDegree.length > 0 ? byDegree : capped;
}

function scoreSpin(reels) {
  return reels.reduce(
    (total, { winner }) => total + ((winner || NONE).score || 0),
    0
  );
}