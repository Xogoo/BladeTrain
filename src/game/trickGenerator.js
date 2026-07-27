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
  lockedPairs = null,
  forcedTrick = null
) {
  const grindPool = grindCandidates(settings, usedGrinds, grindBias, grindToggles);

  // "Review neglected grinds" mode: grind + variation come straight
  // from a fixed list (e.g. combos not landed in 30+ days) instead of
  // the usual weighted pools/toggles. Everything else (approach, spin
  // degrees, switch up) still follows the current settings as normal —
  // the pool above is only used for the reel's visual spin, the winner
  // is forced.
  //
  // "Family training" (forcedTrick) goes one step further: grind,
  // variation AND approach are all pinned to one exact trick — the
  // current step in an ordered family — regardless of lockedPairs or
  // the player's own Approach settings. Only used one entry at a time,
  // never picked randomly among a list.
  let grind;
  let lockedVariationName = null;
  if (forcedTrick) {
    grind = GRINDS.find((g) => g.name === forcedTrick.grindName) || pickWeighted(grindPool);
    lockedVariationName = forcedTrick.variationName ?? "None";
  } else if (lockedPairs && lockedPairs.length > 0) {
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
  if (forcedTrick && forcedTrick.switchUpGrindName) {
    // A personal family built from "Aperçu des tricks possibles" can
    // include a switch-up as part of the exact trick it's training —
    // pin it precisely, same philosophy as the rest of a forced trick.
    switchUp = GRINDS.find((g) => g.name === forcedTrick.switchUpGrindName) || null;
    switchUpPool = switchUp ? [switchUp] : [];
    if (switchUp) {
      switchSpin =
        baseSwitchSpinPool(grind, switchUp).find(
          (s) => s.name === (forcedTrick.switchSpinName || "None")
        ) || null;
      switchSpinPool = switchSpin ? [switchSpin] : [];
      switchUpVariation =
        forcedTrick.switchUpVariationName && forcedTrick.switchUpVariationName !== "None"
          ? variationByName(forcedTrick.switchUpVariationName)
          : null;
      // Bug fixed here: this pool was never set in the forced branch,
      // staying at its default empty array — harmless when the winner
      // is null (reel stays hidden either way), but whenever a personal
      // family entry DID pin a real switch-up variation, the reel
      // became visible with an empty pool. SlotReel's filler-building
      // then tried to read .name off a random pick from that empty
      // array, threw, and never reached its own settle timers — which
      // is exactly why that one reel showed blank forever and the
      // whole result screen (score, Blade!/Passer, even the bottom
      // nav) never came back without the failsafe timeout kicking in.
      switchUpVariationPool = switchUpVariation ? [switchUpVariation] : [];
    }
  } else if (hasSwitchUpReel(settings) && !forcedTrick) {
    // Family training only ever pins grind/variation/approach/spin-in/
    // spin-out — a switch-up (2nd grind) is a whole extra trick bolted
    // on that has nothing to do with what the family is training
    // (unless the entry explicitly specifies one — see above), so it's
    // suppressed entirely here regardless of the player's own Switch
    // up setting.
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
    switchUpVariation = hasVariationReel(settings, true)
      ? pickWeighted(switchUpVariationPool)
      : null;
  }

  const approachPool = approachCandidates(grind, settings);
  const approach = forcedTrick
    ? APPROACHES.find((a) => a.name === forcedTrick.approach) || pickWeighted(approachPool)
    : hasApproachReel(settings)
    ? pickWeighted(approachPool)
    : null;

  const spinToPool = spinToCandidates(grind, approach, settings);
  const spinTo =
    forcedTrick && forcedTrick.spinToName
      ? baseSpinToPool(grind, approach ? approach.isFakie : false).find(
          (s) => s.name === forcedTrick.spinToName
        ) || pickWeighted(spinToPool)
      : pickWeighted(spinToPool);

  const spinOffPool = spinOffCandidates(grind, settings);
  // Family training only ever pins grind/variation/approach/spin-IN —
  // spin-OUT was left fully random, which meant a plain "Groove"
  // family entry could still land you on a Fakie (or degree) exit that
  // has nothing to do with what the family is actually training.
  // Forced tricks now default the exit to its neutral, no-rotation
  // outcome ("None" for soul, "Forwards" for groove) unless the entry
  // explicitly asks for a specific one via `spinOffName` (for a future
  // spin-out-focused family).
  const spinOff = forcedTrick
    ? baseSpinOffPool(grind).find(
        (s) => s.name === (forcedTrick.spinOffName || neutralSpinOffName(grind))
      ) || pickWeighted(spinOffPool)
    : pickWeighted(spinOffPool);

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

export function hasVariationReel(settings, forSwitchUp = false) {
  const topsideEnabled = forSwitchUp ? settings.switchUpTopside : settings.topside;
  return (
    settings.negative ||
    topsideEnabled ||
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

// Which base spin-in table a grind uses, before any settings-based
// filtering. Shared by spinToCandidates (normal random play) and the
// forced-spin lookup below (family training), so both always agree.
//
// "FS "/"BS " prefixed grinds are easy to detect by substring, but the
// two plain base grinds — "Frontside" and "Backside" themselves — have
// no such prefix and used to fall through to the Backside table by
// accident; checked explicitly here so Frontside gets its own (mirror
// image) spin table like every other FS grind.
function baseSpinToPool(grind, isFakie) {
  if (!grind.isGroove) {
    return isFakie ? SPINS_TO_SOUL_FAKIE : SPINS_TO_SOUL;
  }
  const isFrontside = grind.name === "Frontside" || grind.name.includes("FS ");
  if (isFrontside) {
    return isFakie ? SPINS_TO_GROOVE_FS_FAKIE : SPINS_TO_GROOVE_FS;
  }
  return SPINS_TO_GROOVE_BS;
}

function spinToCandidates(grind, approach, settings) {
  const isFakie = approach ? approach.isFakie : false;
  let pool = baseSpinToPool(grind, isFakie);
  pool = filterSpinDirection(pool, settings);
  // Degree checkboxes are applied before training focus tries to force
  // a real rotation (see spinOffCandidates for the full story on why —
  // same bug, same fix: doing it the other way around let training
  // focus's "strip None" step get baked into the degree filter's own
  // fallback pool, so an unchecked degree could come back anyway once
  // it was the only thing left to fall back to).
  pool = filterSpinDegrees(pool, settings, "spinIn");
  // Fall back to the unfiltered pool only when filtering left nothing
  // at all — happens on fakie-to-soul and groove-entry pools, which
  // have no "None" option, so unchecking both directions (or checking
  // only a degree this grind type doesn't have) would otherwise empty
  // the Spin in reel entirely. When a "None" entry does survive (plain
  // forward tricks: Soul, Makio, ...), that's a perfectly valid
  // single-candidate pool — no fallback needed.
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
  // Training focus: with only Alley-oop (or only True) checked — or a
  // specific degree checked with both directions still on — "None"
  // still slips through for grinds that support a plain forward entry.
  // Locking it removes that plain option, so every spin actually uses
  // what was narrowed. Only kicks in when something was actually
  // narrowed (direction and/or degree), not the unrestricted baseline,
  // and only if something real is actually left afterwards.
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
  return pool;
}

// Raw (unfiltered by settings) spin-out pool for a grind, and the
// no-rotation exit name within it — used to resolve a family's forced
// spin-out regardless of the player's own spin-out settings, same
// philosophy as baseSpinToPool above.
function baseSpinOffPool(grind) {
  return grind.isGroove ? SPINS_OFF_GROOVE : SPINS_OFF_SOUL;
}

function neutralSpinOffName(grind) {
  return grind.isGroove ? "Forwards" : "None";
}

function spinOffCandidates(grind, settings) {
  const basePool = grind.isGroove ? SPINS_OFF_GROOVE : SPINS_OFF_SOUL;
  // Degree checkboxes are applied FIRST, against the full pool (which
  // always includes the no-rotation defaults) — only once that's
  // settled does training focus try to force a real rotation. Doing it
  // the other way around (used to) meant: strip the defaults, THEN
  // filter degrees, THEN fall back to "whatever was left before the
  // degree filter" if that emptied out — and that fallback pool had
  // already lost the defaults, so an unchecked degree (e.g. checking
  // only 180 for a groove grind, which has no 180 at all) could come
  // back anyway once 270/450 were the only things left to fall back
  // to. Filtering degrees first means the safety net is always the
  // full pool, defaults included.
  let pool = filterSpinDegrees(basePool, settings, "spinOut");
  // With training focus on and at least one Spin out degree checked,
  // drop the no-rotation defaults so a spin out is actually guaranteed
  // instead of sometimes just not happening — but only if something
  // real is actually left; a grind whose only matching degree got
  // excluded by the checkboxes should fall back to the plain default,
  // not an emptied-out or wrong pool.
  if (settings.trainingFocus && hasAnyDegreeChecked(settings, "spinOut")) {
    const withoutDefault = pool.filter(
      (entry) => entry.name !== "None" && entry.name !== "Forwards" && entry.name !== "Fakie"
    );
    if (withoutDefault.length > 0) {
      pool = withoutDefault;
    }
  }
  return pool;
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
// Raw (unfiltered by settings) switch-spin pool for a (grind,
// switchUpGrind) pair — used to resolve a forced/personal-family
// switch-up's rotation by name, regardless of the player's own
// direction/degree settings. Same shape as switchSpinCandidates'
// internal pools, just without any of the settings-based narrowing.
function baseSwitchSpinPool(grind, switchUpGrind) {
  const sameType = grind.isGroove === switchUpGrind.isGroove;
  return sameType
    ? [
        { name: "None", weight: 4, score: 0 },
        { name: "Inspin 180", weight: 1, score: 1 },
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

function switchSpinCandidates(grind, switchUpGrind, settings) {
  const sameType = grind.isGroove === switchUpGrind.isGroove;
  let pool = sameType
    ? [
        { name: "None", weight: 4, score: 0 },
        { name: "Inspin 180", weight: 1, score: 1 },
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
          { name: "Inspin 180", weight: 1, score: 1 },
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
  // Degree checkboxes are applied before training focus tries to force
  // a real rotation — same bug/fix as spinOffCandidates and
  // spinToCandidates above: doing it the other way around let training
  // focus's "strip None" step get baked into the degree filter's own
  // fallback pool.
  pool = filterSpinDegrees(pool, settings, "spinBetween");
  // Same idea again: with training focus on and the direction and/or a
  // degree narrowed, force an actual rotation between the two grinds
  // instead of sometimes landing on "no rotation between them" — only
  // if something real is actually left afterwards.
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
  return pool;
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
// Exact count of every distinct trick name these settings can produce
// — same candidate-building logic as generateSpin above, just walked
// exhaustively instead of picking one weighted winner. Used by the
// Réglages "Aperçu des tricks possibles" preview, so it always shows
// the real number instead of a sample that varies run to run.
//
// Some setting combinations (esp. with Switch up on and many grinds
// enabled) can multiply out to a huge space — `cap` bails out of exact
// enumeration once it's clearly not worth finishing, and the caller
// falls back to sampling (see enumeratePossibleTricksSample below).
const ENUMERATE_CAP = 6000;

export function enumeratePossibleTricks(
  settings,
  grindToggles,
  switchUpGrindToggles,
  { cap = ENUMERATE_CAP } = {}
) {
  const grindPool = grindCandidates(settings, [], null, grindToggles);
  const byName = new Map(); // name -> full descriptor, for turning this into a personal family's entries later
  let truncated = false;
  let count = 0;

  outer: for (const grind of grindPool) {
    const variationOutcomes = hasVariationReel(settings)
      ? variationCandidates(grind, settings)
      : [null];
    const approachOutcomes = hasApproachReel(settings)
      ? approachCandidates(grind, settings)
      : [null];
    const spinOffOutcomes = spinOffCandidates(grind, settings);

    let switchUpPool = [];
    if (hasSwitchUpReel(settings)) {
      switchUpPool = grindCandidates(
        settings,
        [],
        null,
        switchUpGrindToggles !== null ? switchUpGrindToggles : grindToggles
      ).filter((candidate) => candidate.name !== grind.name);
      if (switchUpPool.length === 0) {
        switchUpPool = grindCandidates(
          settings,
          [],
          null,
          switchUpGrindToggles !== null ? switchUpGrindToggles : grindToggles
        );
      }
    }
    // [{ switchUp, switchSpin, switchUpVariation }], or a single
    // all-null entry when Switch up is off entirely.
    const switchUpBranches = hasSwitchUpReel(settings)
      ? switchUpPool.flatMap((switchUp) => {
          const switchSpinOutcomes = hasSwitchSpinReel(settings)
            ? switchSpinCandidates(grind, switchUp, settings)
            : [null];
          const switchUpVariationOutcomes = hasVariationReel(settings, true)
            ? variationCandidates(switchUp, settings, true)
            : [null];
          const branches = [];
          for (const switchSpin of switchSpinOutcomes) {
            for (const switchUpVariation of switchUpVariationOutcomes) {
              branches.push({ switchUp, switchSpin, switchUpVariation });
            }
          }
          return branches;
        })
      : [{ switchUp: null, switchSpin: null, switchUpVariation: null }];

    for (const variation of variationOutcomes) {
      for (const approach of approachOutcomes) {
        const spinToOutcomes = spinToCandidates(grind, approach, settings);
        for (const spinTo of spinToOutcomes) {
          for (const spinOff of spinOffOutcomes) {
            for (const branch of switchUpBranches) {
              count += 1;
              if (count > cap) {
                truncated = true;
                break outer;
              }
              const reels = [
                { name: "Approach", winner: approach },
                { name: "SpinTo", winner: spinTo },
                { name: "Grind", winner: grind },
                { name: "GrindVariation", winner: variation },
                { name: "SwitchSpin", winner: branch.switchSpin },
                { name: "SwitchUp", winner: branch.switchUp },
                { name: "SwitchUpVariation", winner: branch.switchUpVariation },
                { name: "SpinOff", winner: spinOff },
              ];
              const name = nameTrick(reels).parsed;
              if (!byName.has(name)) {
                byName.set(name, {
                  grindName: grind.name,
                  variationName: variation ? variation.name : "None",
                  approach: approach ? approach.name : "Forwards",
                  spinToName: spinTo.name,
                  spinOffName: spinOff.name,
                  switchUpGrindName: branch.switchUp ? branch.switchUp.name : null,
                  switchUpVariationName: branch.switchUpVariation
                    ? branch.switchUpVariation.name
                    : null,
                  switchSpinName: branch.switchSpin ? branch.switchSpin.name : null,
                });
              }
            }
          }
        }
      }
    }
  }

  const names = [...byName.keys()].sort((a, b) => a.localeCompare(b));
  return {
    names,
    entries: names.map((name) => byName.get(name)),
    exact: !truncated,
  };
}

// Names a family entry directly, without generating a real spin — used
// by the family history screen to label tricks that haven't been
// landed yet (so there's no real land record with the actual name).
// For entries that don't pin a spin-in (the base Soul/Groove/Zerospin-
// style families, which leave the rotation up to the player's own
// settings), this shows the plain "no rotation" version as a best
// effort — the real trained trick may vary, this is just a label.
export function nameEntry(entry) {
  const grind = GRINDS.find((g) => g.name === entry.grindName);
  if (!grind) {
    return entry.grindName;
  }
  const switchUpGrind = entry.switchUpGrindName
    ? GRINDS.find((g) => g.name === entry.switchUpGrindName)
    : null;
  const approach = APPROACHES.find((a) => a.name === entry.approach) || {
    name: entry.approach || "Forwards",
    isFakie: false,
  };
  const variation =
    entry.variationName && entry.variationName !== "None"
      ? variationByName(entry.variationName)
      : null;
  const switchUpVariation =
    entry.switchUpVariationName && entry.switchUpVariationName !== "None"
      ? variationByName(entry.switchUpVariationName)
      : null;
  const reels = [
    { name: "Approach", winner: approach },
    { name: "SpinTo", winner: { name: entry.spinToName || "None" } },
    { name: "Grind", winner: grind },
    { name: "GrindVariation", winner: variation },
    { name: "SwitchSpin", winner: entry.switchSpinName ? { name: entry.switchSpinName } : null },
    { name: "SwitchUp", winner: switchUpGrind },
    { name: "SwitchUpVariation", winner: switchUpGrind ? switchUpVariation : null },
    {
      name: "SpinOff",
      winner: { name: entry.spinOffName || (grind.isGroove ? "Forwards" : "None") },
    },
  ];
  return nameTrick(reels).parsed;
}