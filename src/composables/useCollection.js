import { computed, reactive, watch } from "vue";
import { GRINDS, RARE_GRIND_NAME_PARTS } from "../game/trickData.js";
import { FAMILIES } from "../game/families.js";

const STORAGE_KEY = "aight-collection-v1";

/**
 * Lifetime trick collection for solo mode: every exact trick name you
 * have landed or skipped (ever, across sessions), the per-grind stats
 * derived from them, milestone badges, and now a session history log.
 * Persisted on the device.
 */

export const BADGES = [
  { id: "first-trick", name: "First Blood", desc: "Réussis ton premier trick" },
  { id: "first-topside", name: "Top Mission", desc: "Réussis ton premier topside" },
  { id: "first-negative", name: "Negative Creep", desc: "Réussis ton premier negative" },
  { id: "switch-hitter", name: "Switch Hitter", desc: "Réussis ton premier trick en switch" },
  { id: "rewind", name: "Rewind", desc: "Réussis ton premier spin out en rewind" },
  { id: "first-540", name: "Five Forty", desc: "Réussis ton premier 540 / 450" },
  { id: "first-720", name: "Seven Twenty", desc: "Réussis ton premier 720 / 630" },
  { id: "first-900", name: "Niner", desc: "Réussis ton premier 900 / 810" },
  { id: "true-1", name: "True Believer", desc: "Réussis un grind en truespin" },
  { id: "true-3", name: "True Romance", desc: "Réussis des truespins sur 3 grinds différents" },
  { id: "true-5", name: "True Legend", desc: "Réussis des truespins sur 5 grinds différents" },
  { id: "true-10", name: "True Devotion", desc: "Réussis des truespins sur 10 grinds différents" },
  { id: "ao-1", name: "Alley Cat", desc: "Réussis un grind en alley-oop" },
  { id: "ao-3", name: "Oop Troop", desc: "Réussis des alley-oops sur 3 grinds différents" },
  { id: "ao-5", name: "King of the Alley", desc: "Réussis des alley-oops sur 5 grinds différents" },
  { id: "ao-10", name: "Oop Dynasty", desc: "Réussis des alley-oops sur 10 grinds différents" },
  { id: "cab-company", name: "Cab Company", desc: "Réussis un Halfcab et un Fullcab" },
  { id: "grab-bag", name: "Grab Bag", desc: "Réussis un grab normal, un rocket et un cross grab" },
  { id: "grinds-5", name: "Grind Rookie", desc: "Réussis 5 grinds différents" },
  { id: "grinds-10", name: "Grind Worker", desc: "Réussis 10 grinds différents" },
  { id: "grinds-20", name: "Grind Boss", desc: "Réussis 20 grinds différents" },
  { id: "grinds-30", name: "Grind Veteran", desc: "Réussis 30 grinds différents" },
  { id: "half-collection", name: "Halfway There", desc: "Réussis la moitié de tous les grinds" },
  { id: "soul-plate", name: "Soul Searcher", desc: "Réussis tous les grinds soul-plate" },
  { id: "groove", name: "Groove Master", desc: "Réussis tous les grinds groove" },
  { id: "rare-breed", name: "Rare Breed", desc: "Réussis tous les grinds rares" },
  { id: "full-collection", name: "Tricktionary Complete", desc: "Réussis tous les grinds" },
  { id: "tricks-10", name: "Bag of Tricks", desc: "Réussis 10 tricks différents" },
  { id: "tricks-20", name: "Trick Collector", desc: "Réussis 20 tricks différents" },
  { id: "tricks-30", name: "Dirty Thirty", desc: "Réussis 30 tricks différents" },
  { id: "tricks-40", name: "Top 40", desc: "Réussis 40 tricks différents" },
  { id: "tricks-50", name: "Half Century", desc: "Réussis 50 tricks différents" },
  { id: "tricks-100", name: "Trickipedia", desc: "Réussis 100 tricks différents" },
  { id: "tricks-250", name: "Trick Vault", desc: "Réussis 250 tricks différents" },
  { id: "tricks-500", name: "Half Grand", desc: "Réussis 500 tricks différents" },
  { id: "tricks-1000", name: "Trick Machine", desc: "Réussis 1 000 tricks différents" },
  { id: "tricks-2500", name: "Trick Cosmos", desc: "Réussis 2 500 tricks différents" },
  { id: "tricks-10000", name: "10,000 Hours", desc: "Réussis 10 000 tricks différents" },
  { id: "century", name: "Century Club", desc: "Réussis 100 tricks au total" },
  { id: "lands-500", name: "Five Hundred Club", desc: "Réussis 500 tricks au total" },
  { id: "lands-1000", name: "Thousand Club", desc: "Réussis 1 000 tricks au total" },
  { id: "lands-5000", name: "Grind Immortal", desc: "Réussis 5 000 tricks au total" },
  { id: "hot-streak", name: "Hot Streak", desc: "Réussis 5 tricks d'affilée sans en passer un" },
  { id: "streak-25", name: "Unstoppable", desc: "Réussis 25 tricks d'affilée sans en passer un" },
  { id: "streak-50", name: "Perfect Session", desc: "Réussis 50 tricks d'affilée sans en passer un" },
  { id: "comeback-kid", name: "Comeback Kid", desc: "Réussis un trick que tu avais passé 3 fois ou plus" },
  { id: "daily-grind", name: "Daily Grind", desc: "Réussis des tricks sur 7 jours différents" },
  { id: "days-30", name: "Monthly Grind", desc: "Réussis des tricks sur 30 jours différents" },
  { id: "days-365", name: "Year of the Grind", desc: "Réussis des tricks sur 365 jours différents" },
  { id: "hammer", name: "Hammer Time", desc: "Réussis un trick valant 10 points ou plus" },
  { id: "nukes", name: "Nukes", desc: "Réussis un trick valant 15 points ou plus" },
  // One badge per family, generated automatically — never needs a
  // manual entry when a new family is added to families.js.
  ...FAMILIES.map((family) => ({
    id: `family-${family.id}`,
    name: family.badgeName || family.name,
    desc: `Termine la famille "${family.name}"`,
  })),
];

const SOUL_PLATE_GRINDS = GRINDS.filter((g) => !g.isGroove && !g.isSoulGroove);
const GROOVE_GRINDS = GRINDS.filter((g) => g.isGroove);
const RARE_GRINDS = GRINDS.filter((g) =>
  RARE_GRIND_NAME_PARTS.some((part) => g.name.includes(part))
);

// How many past sessions to keep in the history list, so the storage
// doesn't grow forever on a device used every day for years.
const MAX_SESSIONS = 200;

function defaultCollection() {
  return {
    tricks: {}, // { [exact trick name]: { landed, skipped } }
    grinds: {}, // { [grindName]: { landed, skipped } }
    trueGrinds: {}, // { [grindName]: land count } for truespin tricks
    aoGrinds: {}, // { [grindName]: land count } for alley-oop tricks
    variationsLanded: {}, // { [raw variation reel name]: true }
    days: {}, // { [YYYY-MM-DD]: true } days with at least one land
    streak: 0, // lands in a row without a skip
    landedTotal: 0,
    badges: {}, // { [badgeId]: ISO date earned }
    // Session history: one summary entry per solo session.
    sessions: [], // { id, startedAt, endedAt, landed, skipped, totalTries }
    // Flat chronological log of every landed trick, across all
    // sessions — feeds both the session report (filter by sessionId)
    // and the "same trick over time" progress chart (group by name).
    lands: [], // { sessionId, date, trickName, grindName, tries, score }
    // Same idea but for skips — only used to know which grind+variation
    // combos have actually come up (see staleCombos in useCollection.js),
    // not for any chart.
    skips: [], // { sessionId, date, trickName, grindName, variationName }
    // ISO date of the last successful export/backup — everything here
    // only lives in this device's localStorage otherwise, see
    // useBackup.js. null means "never backed up".
    lastBackupAt: null,
    // Family training progress: which entries (by index into
    // family.entries) have been landed so far — drawn at random among
    // whatever's left, not in a fixed order (see useGame.js). completedAt
    // = ISO date once every entry has been landed.
    familyProgress: {}, // { [familyId]: { landedIndices: number[], completedAt } }
  };
}

function loadCollection() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultCollection(), ...stored };
  } catch {
    return defaultCollection();
  }
}

const collection = reactive(loadCollection());

watch(
  collection,
  () => localStorage.setItem(STORAGE_KEY, JSON.stringify(collection)),
  { deep: true }
);

function statsIn(map, name) {
  if (!map[name]) {
    map[name] = { landed: 0, skipped: 0 };
  }
  return map[name];
}

function landedGrindNames() {
  return Object.keys(collection.grinds).filter(
    (name) => collection.grinds[name].landed > 0
  );
}

function spinWinners(spin) {
  const winners = {};
  for (const reel of spin.reels) {
    winners[reel.name] = reel.winner ? reel.winner.name : "None";
  }
  return winners;
}

function includesAny(text, parts) {
  return parts.some((part) => text.includes(part));
}

function landedTrickCount() {
  return Object.values(collection.tricks).filter((stats) => stats.landed > 0)
    .length;
}

function hasLandedMatching(pattern) {
  return Object.entries(collection.tricks).some(
    ([name, stats]) => stats.landed > 0 && pattern.test(name)
  );
}

function hasVariation(pattern) {
  return Object.keys(collection.variationsLanded).some((name) =>
    pattern.test(name)
  );
}

// Reads (and migrates) a family's progress entry. Old sessions stored a
// sequential `index` (how many entries landed, in fixed order) — since
// that's just as valid a "first N landed" set under the new random-draw
// model, it's migrated in place the first time this family is touched
// rather than losing that progress.
function familyProgressEntry(familyId) {
  const existing = collection.familyProgress[familyId];
  if (!existing || !Array.isArray(existing.landedIndices)) {
    const legacyCount = existing?.index || 0;
    collection.familyProgress[familyId] = {
      landedIndices: Array.from({ length: legacyCount }, (_, i) => i),
      completedAt: existing?.completedAt || null,
    };
  }
  return collection.familyProgress[familyId];
}

/** How many of the family's tricks have been landed so far. */
function familyIndex(familyId) {
  return familyProgressEntry(familyId).landedIndices.length;
}

function isFamilyComplete(familyId) {
  return Boolean(collection.familyProgress[familyId]?.completedAt);
}

/**
 * Overall progress for one Career track ("normal" or "switch"): every
 * family whose `track` matches, tricks landed vs total across all of
 * them, and the resulting percent (0 if the track has no families yet).
 * Used by the Carrière screen's Normal/Switch buttons.
 */
function careerProgress(track) {
  const families = FAMILIES.filter((family) => family.track === track);
  let landed = 0;
  let total = 0;
  for (const family of families) {
    landed += familyIndex(family.id);
    total += family.entries.length;
  }
  const percent = total ? Math.round((landed / total) * 100) : 0;
  return { landed, total, percent };
}

/**
 * Indices (into family.entries) not yet landed — the pool the next
 * random draw picks from. Empty once the family is complete.
 */
function familyRemainingIndices(familyId, totalEntries) {
  const done = new Set(familyProgressEntry(familyId).landedIndices);
  const remaining = [];
  for (let i = 0; i < totalEntries; i += 1) {
    if (!done.has(i)) {
      remaining.push(i);
    }
  }
  return remaining;
}

/**
 * Call once a family's drawn entry (by index) has been landed. Marks it
 * done; if that was the last one left, marks the family complete and
 * awards its badge (once). Returns the badge object if newly earned
 * this call, else null — same "newly earned" shape as recordLand, so
 * the game screen's badge toast can handle both the same way.
 */
function advanceFamilyProgress(familyId, entryIndex, totalEntries) {
  const entry = familyProgressEntry(familyId);
  if (!entry.landedIndices.includes(entryIndex)) {
    entry.landedIndices.push(entryIndex);
  }
  if (entry.landedIndices.length >= totalEntries && !entry.completedAt) {
    entry.completedAt = new Date().toISOString();
    const badgeId = `family-${familyId}`;
    if (!collection.badges[badgeId]) {
      collection.badges[badgeId] = new Date().toISOString();
      return BADGES.find((b) => b.id === badgeId) || null;
    }
  }
  return null;
}

/** Restart a family from scratch (keeps any badge already earned). */
function resetFamilyProgress(familyId) {
  collection.familyProgress[familyId] = { landedIndices: [], completedAt: null };
}

/** Badge conditions, evaluated against the just-landed spin. */
function badgeEarned(id, spin, winners) {
  const spins = `${winners.SpinTo} ${winners.SpinOff}`;
  const landed = landedGrindNames();

  // Threshold badges: "<kind>-<count>" ids share one rule per kind.
  const threshold = Number(id.slice(id.lastIndexOf("-") + 1));
  if (id.startsWith("true-")) {
    return Object.keys(collection.trueGrinds).length >= threshold;
  }
  if (id.startsWith("ao-")) {
    return Object.keys(collection.aoGrinds).length >= threshold;
  }
  if (id.startsWith("grinds-")) {
    return landed.length >= threshold;
  }
  if (id.startsWith("tricks-")) {
    return landedTrickCount() >= threshold;
  }
  if (id.startsWith("lands-")) {
    return collection.landedTotal >= threshold;
  }
  if (id.startsWith("streak-")) {
    return collection.streak >= threshold;
  }
  if (id.startsWith("days-")) {
    return Object.keys(collection.days).length >= threshold;
  }

  switch (id) {
    case "first-trick":
      return collection.landedTotal >= 1;
    case "first-topside":
      return winners.GrindVariation.includes("Topside");
    case "first-negative":
      return winners.GrindVariation.includes("Negative");
    case "first-540":
      return includesAny(spins, ["540", "450"]);
    case "first-720":
      return includesAny(spins, ["720", "630"]);
    case "first-900":
      return includesAny(spins, ["900", "810"]);
    case "soul-plate":
      return SOUL_PLATE_GRINDS.every((g) => landed.includes(g.name));
    case "groove":
      return GROOVE_GRINDS.every((g) => landed.includes(g.name));
    case "half-collection":
      return landed.length >= Math.ceil(GRINDS.length / 2);
    case "full-collection":
      return landed.length >= GRINDS.length;
    case "century":
      return collection.landedTotal >= 100;
    case "switch-hitter":
      return winners.Approach.includes("Switch");
    case "rewind":
      return spin.name.includes("rewind");
    case "cab-company":
      return (
        hasLandedMatching(/\bHalfcab\b/) && hasLandedMatching(/\bFullcab\b/)
      );
    case "grab-bag":
      return (
        hasVariation(/^Grab/) &&
        hasVariation(/^Rocket/) &&
        hasVariation(/^Cross-Grab/)
      );
    case "rare-breed":
      return RARE_GRINDS.every((g) => landed.includes(g.name));
    case "hot-streak":
      return collection.streak >= 5;
    case "comeback-kid":
      return collection.tricks[spin.name].skipped >= 3;
    case "daily-grind":
      return Object.keys(collection.days).length >= 7;
    case "hammer":
      return spin.score >= 10;
    case "nukes":
      return spin.score >= 15;
    default:
      return false;
  }
}

export function useCollection() {
  /** Starts a new solo session and returns its id. */
  const startSession = () => {
    const session = {
      id: Date.now(),
      startedAt: new Date().toISOString(),
      endedAt: null,
      landed: 0,
      skipped: 0,
      totalTries: 0,
    };
    collection.sessions.push(session);
    if (collection.sessions.length > MAX_SESSIONS) {
      collection.sessions.splice(0, collection.sessions.length - MAX_SESSIONS);
    }
    return session.id;
  };

  /** Marks a session as finished. */
  const endSession = (sessionId) => {
    const session = collection.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.endedAt = new Date().toISOString();
    }
  };

  const sessionById = (sessionId) =>
    collection.sessions.find((s) => s.id === sessionId) || null;

  // Most recent session first.
  const sessionHistory = computed(() =>
    [...collection.sessions].sort(
      (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
    )
  );

  const sessionLands = (sessionId) =>
    collection.lands.filter((l) => l.sessionId === sessionId);

  /**
   * Progress data for the chart: only exact tricks landed 2+ times
   * (across all sessions, lifetime), each as the chronological list of
   * how many tries it took, so a downward trend shows you improving on
   * that same trick.
   */
  const repeatedTrickSeries = computed(() => {
    const byName = {};
    for (const land of collection.lands) {
      (byName[land.trickName] ||= []).push(land);
    }
    return Object.entries(byName)
      .filter(([, entries]) => entries.length >= 2)
      .map(([name, entries]) => ({
        name,
        tries: [...entries]
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map((e) => e.tries),
      }));
  });

  /**
   * Every switch-up (2nd grind) ever landed, most recent first — the
   * Historique panel's own sort (by date, first grind, second grind,
   * ...) is applied on top of this in the component itself, same
   * pattern as rankedTricks/repeatedTrickSeries.
   */
  const switchUpLands = computed(() =>
    [...collection.lands]
      .filter((land) => land.switchUpGrindName)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  );


  /**
   * Every trainable (grind, variation) pair — each grind always
   * supports "None" (no variation) on top of its own variations list.
   * This is the universe staleCombos() checks against.
   */
  function allGrindVariationPairs() {
    const pairs = [];
    for (const grind of GRINDS) {
      pairs.push({ grindName: grind.name, variationName: "None" });
      for (const variationName of grind.variations) {
        pairs.push({ grindName: grind.name, variationName });
      }
    }
    return pairs;
  }

  /**
   * (Grind, variation) pairs that have actually come up before (landed
   * or skipped at least once) but weren't landed in the last `days`
   * days — including drawn-but-never-landed. Pairs that have simply
   * never been drawn at all are excluded: not having come up by chance
   * isn't the same as neglecting them.
   *
   * Note: variationName was only added to land/skip entries going
   * forward, so a pair only skipped or landed before this feature
   * existed won't be recognized as "drawn" until it comes up again.
   */
  function staleCombos(days) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return allGrindVariationPairs()
      .map((pair) => {
        let lastLandedAt = null;
        let everDrawn = false;
        for (const land of collection.lands) {
          if (
            land.grindName === pair.grindName &&
            land.variationName === pair.variationName
          ) {
            everDrawn = true;
            if (!lastLandedAt || new Date(land.date) > new Date(lastLandedAt)) {
              lastLandedAt = land.date;
            }
          }
        }
        if (!everDrawn) {
          for (const skip of collection.skips) {
            if (
              skip.grindName === pair.grindName &&
              skip.variationName === pair.variationName
            ) {
              everDrawn = true;
              break;
            }
          }
        }
        return { ...pair, lastLandedAt, everDrawn };
      })
      .filter(
        (entry) =>
          entry.everDrawn &&
          (!entry.lastLandedAt || new Date(entry.lastLandedAt).getTime() < cutoff)
      );
  }

  /** Records a landed spin and returns any newly earned badges. */
  const recordLand = (spin, tries = 1, sessionId = null) => {
    const winners = spinWinners(spin);
    statsIn(collection.tricks, spin.name).landed += 1;
    statsIn(collection.grinds, winners.Grind).landed += 1;
    collection.landedTotal += 1;

    collection.lands.push({
      sessionId,
      date: new Date().toISOString(),
      trickName: spin.name,
      grindName: winners.Grind,
      variationName: winners.GrindVariation,
      // Switch-up (2nd grind) info, only set when this land actually
      // had one — null otherwise. Feeds the Historique panel's
      // Switch-ups list (see switchUpLands below).
      switchUpGrindName: winners.SwitchUp !== "None" ? winners.SwitchUp : null,
      switchUpVariationName:
        winners.SwitchUp !== "None" ? winners.SwitchUpVariation : null,
      tries,
      score: spin.score,
    });
    if (sessionId) {
      const session = sessionById(sessionId);
      if (session) {
        session.landed += 1;
        session.totalTries += tries;
      }
    }

    // Truespin / alley-oop lands per grind, matched on the parsed name
    // (synonym tricks like Soyale absorb the AO and don't count).
    if (/\bTrue\b/.test(spin.name)) {
      collection.trueGrinds[winners.Grind] =
        (collection.trueGrinds[winners.Grind] || 0) + 1;
    }
    if (/\bAO\b/.test(spin.name)) {
      collection.aoGrinds[winners.Grind] =
        (collection.aoGrinds[winners.Grind] || 0) + 1;
    }
    if (winners.GrindVariation !== "None") {
      collection.variationsLanded[winners.GrindVariation] = true;
    }
    collection.days[new Date().toISOString().slice(0, 10)] = true;
    collection.streak += 1;

    const earned = [];
    for (const badge of BADGES) {
      if (!collection.badges[badge.id] && badgeEarned(badge.id, spin, winners)) {
        collection.badges[badge.id] = new Date().toISOString();
        earned.push(badge);
      }
    }
    return earned;
  };

  /** Wipes all lifetime progress: tricks, grinds, lands and badges. */
  // Wipes everything EXCEPT Career progress (familyProgress) and the
  // family-completion badges tied to it — those have their own
  // dedicated reset button on the Carrière screen (resetCareerProgress
  // below), precisely so the two stay independent of each other.
  const resetCollection = () => {
    const { familyProgress, badges } = collection;
    const preservedBadges = {};
    for (const [id, date] of Object.entries(badges)) {
      if (id.startsWith("family-")) {
        preservedBadges[id] = date;
      }
    }
    Object.assign(collection, defaultCollection(), {
      familyProgress,
      badges: preservedBadges,
    });
  };

  // The Career screen's own reset: wipes every family's progress (both
  // Normal and Switch tracks) and their completion badges, and nothing
  // else — the rest of the collection (stats, badges, session history)
  // is untouched.
  const resetCareerProgress = () => {
    collection.familyProgress = {};
    for (const id of Object.keys(collection.badges)) {
      if (id.startsWith("family-")) {
        delete collection.badges[id];
      }
    }
  };

  const recordSkip = (spin, sessionId = null) => {
    const winners = spinWinners(spin);
    statsIn(collection.tricks, spin.name).skipped += 1;
    statsIn(collection.grinds, winners.Grind).skipped += 1;
    collection.skips.push({
      sessionId,
      date: new Date().toISOString(),
      trickName: spin.name,
      grindName: winners.Grind,
      variationName: winners.GrindVariation,
    });
    collection.streak = 0;
    if (sessionId) {
      const session = sessionById(sessionId);
      if (session) {
        session.skipped += 1;
      }
    }
  };

  /**
   * Trainer bias: grinds you have never landed spin up more often, and
   * grinds you skip more than you land come up more often too.
   */
  const grindBias = () => {
    const bias = {};
    for (const grind of GRINDS) {
      const stats = collection.grinds[grind.name];
      if (!stats || stats.landed === 0) {
        bias[grind.name] = 2.5;
      } else if (stats.skipped > stats.landed) {
        bias[grind.name] = 2;
      }
    }
    return bias;
  };

  // The collection itself counts exact trick names (full combination of
  // approach, spins, grind and variation). The grind numbers only feed
  // the completable badges and the tricktionary checkmarks.
  const uniqueTrickCount = computed(landedTrickCount);
  const landedGrindCount = computed(() => landedGrindNames().length);
  const totalGrinds = GRINDS.length;
  const grindProgressPercent = computed(() =>
    Math.round((landedGrindCount.value / totalGrinds) * 100)
  );
  const earnedBadges = computed(() =>
    BADGES.filter((badge) => collection.badges[badge.id])
  );
  const hasBadge = (id) => Boolean(collection.badges[id]);
  const grindLandedCount = (name) => collection.grinds[name]?.landed || 0;

  return {
    collection,
    recordLand,
    recordSkip,
    resetCollection,
    resetCareerProgress,
    grindBias,
    uniqueTrickCount,
    landedGrindCount,
    totalGrinds,
    grindProgressPercent,
    earnedBadges,
    hasBadge,
    familyIndex,
    isFamilyComplete,
    familyRemainingIndices,
    careerProgress,
    advanceFamilyProgress,
    resetFamilyProgress,
    grindLandedCount,
    startSession,
    endSession,
    sessionById,
    sessionHistory,
    sessionLands,
    repeatedTrickSeries,
    switchUpLands,
    staleCombos,
  };
}