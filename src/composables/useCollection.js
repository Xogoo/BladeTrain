import { computed, reactive, watch } from "vue";
import { GRINDS, RARE_GRIND_NAME_PARTS } from "../game/trickData.js";
import { GRIND_SYNONYMS } from "../game/trickData.js";
import { FAMILIES, resolveFamily, familyEntryKey } from "../game/families.js";
import { useSettings } from "./useSettings.js";

const STORAGE_KEY = "aight-collection-v1";

const settingsApi = useSettings();

// Resolves either a built-in family (families.js) or a player-built one
// (settings.customFamilies) by id — see resolveFamily in families.js.
function resolveFamilyById(familyId) {
  return familyId ? resolveFamily(familyId, settingsApi.settings.customFamilies) : null;
}

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
  // The big one: every family of a whole Career track, in order.
  { id: "career-normal", name: "Blade Runner", desc: "Termine les 19 familles de la Carrière Normal" },
  { id: "career-switch", name: "Switchblade", desc: "Termine les 19 familles de la Carrière Switch" },
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
    // "YYYY-MM" of the last time the end-of-session backup prompt was
    // shown — once per calendar month, regardless of whether the
    // player actually exported when it appeared. null means "never".
    lastMonthlyPromptMonth: null,
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

// One-time migration: the old combined "Zerospin" family (soul +
// groove grinds together) was split into "zerospin-soul" and
// "zerospin-groove" (two separate Career tiers). Existing progress
// under the old ids would otherwise be silently orphaned — instead,
// split its landedKeys between the two new ids by looking up whether
// each entry's grind is soul or groove, then drop the old ids. Safe to
// run every load: it's a no-op once the old ids are gone. Exported so
// useBackup.js's restoreBackup can run an OLDER backup through the
// same migration instead of dropping it straight into the live
// collection unmigrated (a restore mid-session doesn't go through
// loadCollection() at all otherwise).
export function migrateZerospinSplit(data) {
  const isGrooveGrindName = (grindName) =>
    GRINDS.find((g) => g.name === grindName)?.isGroove ?? false;

  for (const suffix of ["normal", "switch"]) {
    const oldId = `zerospin-${suffix}`;
    const old = data.familyProgress?.[oldId];
    if (!old) {
      continue;
    }
    const soulId = `zerospin-soul-${suffix}`;
    const grooveId = `zerospin-groove-${suffix}`;
    const soulKeys = [];
    const grooveKeys = [];
    for (const key of old.landedKeys || []) {
      const grindName = key.split("|")[0];
      (isGrooveGrindName(grindName) ? grooveKeys : soulKeys).push(key);
    }
    const soul = data.familyProgress[soulId] || { landedKeys: [], completedAt: null };
    const groove = data.familyProgress[grooveId] || { landedKeys: [], completedAt: null };
    soul.landedKeys = [...new Set([...soul.landedKeys, ...soulKeys])];
    groove.landedKeys = [...new Set([...groove.landedKeys, ...grooveKeys])];
    data.familyProgress[soulId] = soul;
    data.familyProgress[grooveId] = groove;
    delete data.familyProgress[oldId];
  }
  return data;
}

const collection = reactive(migrateZerospinSplit(loadCollection()));

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
// Family progress is keyed by each entry's actual content (grind +
// variation + approach + forced spin — see families.js's
// familyEntryKey), not by its position in family.entries. That way,
// adding or removing a grind from a family later never silently
// misaligns which tricks already count as landed — a position-index
// stayed "correct" only as long as the array never changed shape,
// which turned out not to be a safe assumption.
//
// Old saves used a plain position index (`landedIndices`, and before
// that a sequential `index`) — neither recorded WHICH trick was
// landed, only a count/slot, so there's no reliable way to migrate
// partial progress across to real content keys. `completedAt` (a
// family already fully finished, badge earned) is preserved either
// way; partial progress is not carried over and restarts at 0 rather
// than risk misattributing it to the wrong tricks.
function familyProgressEntry(familyId) {
  const existing = collection.familyProgress[familyId];
  if (!existing || !Array.isArray(existing.landedKeys)) {
    collection.familyProgress[familyId] = {
      landedKeys: [],
      completedAt: existing?.completedAt || null,
    };
  }
  const progress = collection.familyProgress[familyId];
  // Self-heal: `completedAt` was trusted forever once set, but a
  // family's `entries` can change after the fact (a naming/content
  // fix, a family getting split into two like Zerospin did) — if the
  // CURRENT entries aren't all covered by what's actually in
  // landedKeys anymore, the family isn't really done, no matter what
  // completedAt says. Clearing it here means the family correctly
  // shows as incomplete again, and actually finishing it re-triggers
  // the completion badge/toast normally instead of staying silently
  // stuck on a stale "done".
  if (progress.completedAt) {
    const family = resolveFamilyById(familyId);
    if (family) {
      const keys = new Set(progress.landedKeys);
      const stillComplete = family.entries.every((entry) => keys.has(familyEntryKey(entry)));
      if (!stillComplete) {
        progress.completedAt = null;
      }
    }
  }
  return progress;
}

function familyLandedKeySet(familyId) {
  return new Set(familyProgressEntry(familyId).landedKeys);
}

/** How many of the family's CURRENT entries have been landed so far. */
function familyIndex(familyId) {
  const family = resolveFamilyById(familyId);
  if (!family) {
    return 0;
  }
  const keys = familyLandedKeySet(familyId);
  return family.entries.filter((entry) => keys.has(familyEntryKey(entry))).length;
}

function isFamilyComplete(familyId) {
  return Boolean(familyProgressEntry(familyId).completedAt);
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

/** Every family of that track finished — the whole Career track. */
function isCareerComplete(track) {
  const families = FAMILIES.filter((family) => family.track === track);
  return families.length > 0 && families.every((family) => isFamilyComplete(family.id));
}

/**
 * Call right after a family completes. If that was the LAST family
 * needed to finish the whole track, awards the career badge (once) and
 * returns it — else returns null, same "newly earned or not" shape as
 * advanceFamilyProgress's own return value, so useGame.js can treat
 * both the same way.
 */
function awardCareerBadgeIfComplete(track) {
  if (!isCareerComplete(track)) {
    return null;
  }
  const badgeId = `career-${track}`;
  if (collection.badges[badgeId]) {
    return null;
  }
  collection.badges[badgeId] = new Date().toISOString();
  return BADGES.find((b) => b.id === badgeId) || null;
}

/**
 * Indices (into `entries`) not yet landed — the pool the next random
 * draw picks from. Empty once every current entry is covered.
 */
function familyRemainingIndices(familyId, entries) {
  const keys = familyLandedKeySet(familyId);
  const remaining = [];
  for (let i = 0; i < entries.length; i += 1) {
    if (!keys.has(familyEntryKey(entries[i]))) {
      remaining.push(i);
    }
  }
  return remaining;
}

/**
 * Call once a family's drawn entry has been landed. Marks its content
 * key done; if every one of the family's CURRENT entries is now
 * covered, marks the family complete and awards its badge (once).
 * Returns the badge object if newly earned this call, else null — same
 * "newly earned" shape as recordLand, so the game screen's badge toast
 * can handle both the same way.
 */
function advanceFamilyProgress(family, entry) {
  const progress = familyProgressEntry(family.id);
  const key = familyEntryKey(entry);
  if (!progress.landedKeys.includes(key)) {
    progress.landedKeys.push(key);
  }
  const keys = new Set(progress.landedKeys);
  const nowComplete = family.entries.every((e) => keys.has(familyEntryKey(e)));
  if (nowComplete && !progress.completedAt) {
    progress.completedAt = new Date().toISOString();
    const badgeId = `family-${family.id}`;
    if (!collection.badges[badgeId]) {
      collection.badges[badgeId] = new Date().toISOString();
      // Built-in families always have a matching entry in BADGES (see
      // the auto-generated block at the top of this file). Personal
      // families never do — they're not known ahead of time — so this
      // builds an equivalent badge object on the fly from the family's
      // own name instead of coming back empty-handed.
      return (
        BADGES.find((b) => b.id === badgeId) || {
          id: badgeId,
          name: family.badgeName || family.name,
          desc: `Termine la famille "${family.name}"`,
        }
      );
    }
  }
  return null;
}

/** Restart a family from scratch (keeps any badge already earned). */
function resetFamilyProgress(familyId) {
  collection.familyProgress[familyId] = { landedKeys: [], completedAt: null };
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
   * Every badge earned during a session's time window — a session's
   * own `endedAt` isn't set yet while it's still the active one, so
   * "now" is used as the upper bound in that case.
   */
  const sessionBadges = (sessionId) => {
    const session = sessionById(sessionId);
    if (!session) {
      return [];
    }
    const start = new Date(session.startedAt).getTime();
    const end = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
    return BADGES.filter((badge) => {
      const earnedAt = collection.badges[badge.id];
      if (!earnedAt) {
        return false;
      }
      const t = new Date(earnedAt).getTime();
      return t >= start && t <= end;
    });
  };

  /**
   * How much each family trained during a session actually advanced —
   * e.g. "Soul +3" if 3 of its tricks were landed this session, however
   * many attempts that took. Only families actually touched appear.
   */
  const sessionFamilyProgress = (sessionId) => {
    const counts = {};
    for (const land of sessionLands(sessionId)) {
      if (!land.familyId) {
        continue;
      }
      counts[land.familyId] = (counts[land.familyId] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([familyId, count]) => ({ family: resolveFamilyById(familyId), count }))
      .filter((entry) => entry.family);
  };

  /** Every land ever recorded while this family was the active one,
   * across all sessions — oldest first. */
  function familyLands(familyId) {
    return collection.lands
      .filter((land) => land.familyId === familyId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Every entry of a family, split into landed/not-yet-landed — each
   * landed one paired with its actual land record (real name, date,
   * tries), so the history screen can show exactly what happened
   * rather than a generic label.
   */
  function familyEntryStatuses(family) {
    const keys = familyLandedKeySet(family.id);
    // Landed entries are matched back to their actual land record via
    // the exact key stored on it at landing time (see recordLand) —
    // the most recent one if it was somehow landed more than once
    // (shouldn't normally happen, a family stops drawing an entry once
    // it's done).
    const landsByKey = {};
    for (const land of familyLands(family.id)) {
      if (land.familyEntryKey) {
        landsByKey[land.familyEntryKey] = land;
      }
    }
    const skipCounts = {};
    for (const skip of collection.skips) {
      if (skip.familyId === family.id && skip.familyEntryKey) {
        skipCounts[skip.familyEntryKey] =
          (skipCounts[skip.familyEntryKey] || 0) + (skip.tries || 1);
      }
    }
    return family.entries.map((entry) => {
      const key = familyEntryKey(entry);
      return {
        entry,
        landed: keys.has(key),
        land: landsByKey[key] || null,
        skipCount: skipCounts[key] || 0,
      };
    });
  }

  /** Tries needed for each trick landed in this family, in the order
   * they were landed — feeds the same AttemptsChart used elsewhere
   * (Historique), just for one family instead of one repeated trick. */
  function familyTriesSeries(familyId) {
    return familyLands(familyId).map((land) => land.tries);
  }

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
   * The full list of "tricks" an Entraînement ciblé config can produce,
   * the way they actually get drawn — a switch-up is ONE trick (e.g.
   * "FS Backslide to AO Top PStar"), never split into its two grinds.
   * Accepts anything shaped like { tricks, grinds, switchUpGrinds } —
   * the live `settings` object, or a saved history entry — plus the
   * sessionId to scope "landed" checks to. Unlike a family's permanent
   * progress, this resets every session: landing a combo last week
   * doesn't check it off today, only lands from THIS specific session
   * count. Pass the live session's id (state.sessionId) for the
   * ScoreBoard/current-session view, or a saved entry's own sessionId
   * to preview how that particular session went.
   *
   * Each item: { key, name, landed, attempts }. `name` is the exact
   * recorded trickName if that specific combo has been landed this
   * session (so it shows real rotation/synonym naming, e.g.
   * "Kindgrind" rather than a generic "X to Mizou"); otherwise a
   * best-guess placeholder that still applies the grind-level synonym
   * (e.g. "Fishbrain" for an Alley-oop Topside Makio switch-up) based
   * on what the config actually enables (switchUpTopside,
   * spinBetweenAlleyOop/True) — the exact rotation that will come up
   * isn't knowable ahead of the real draw, but the synonym usually is.
   * `attempts` is how many times this session drew this exact combo
   * and it wasn't landed (skipped, however many Raté taps came first)
   * — 0 if landed or never drawn at all.
   *
   * Standalone primary-grind entries (landed = drawn without a
   * switch-up attached) are only included when that's actually
   * possible — i.e. NOT when trainingFocus + switchUp are both locked,
   * since a switch-up is then guaranteed on every draw and the primary
   * grind alone can never come up.
   *
   * Includes every (primary × switch-up) combination when switch-up is
   * enabled — every one is a genuinely possible outcome. This can get
   * long for a config with many grinds enabled on both sides; the
   * panel showing it scrolls.
   */
  // Best-guess synonym-aware display name for a grind, given whether
  // it's (about to be) entered topside and/or via a reverse rotation —
  // not exact (the real generator also factors in the specific
  // rotation degree, Rough/Negative/Tough, etc.), but covers the
  // common Topside/Alley-oop case that most grind synonyms key off.
  // Shared between the 1st grind's own settings and the switch-up
  // target's, so neither gets left out of the guess.
  function guessGrindPlaceholderName(grindName, guessIsTopside, guessIsReverse) {
    const synonym = GRIND_SYNONYMS.find(
      (syn) =>
        syn.name === grindName &&
        !syn.isRough &&
        !syn.isNegative &&
        !(syn.isReverse && !guessIsReverse) &&
        !(syn.isTopside && !guessIsTopside)
    );
    if (synonym) {
      // A synonym like "AO Top Mistrial" already bakes Topside into its
      // own name, so nothing more to add there — but one like "Soyale"
      // doesn't, so a topside guess needs its own explicit "Top" (the
      // real name is "Top Soyale", never just "Soyale").
      const prefix = [
        guessIsReverse && !synonym.isReverse && "AO",
        guessIsTopside && !synonym.isTopside && "Top",
      ]
        .filter(Boolean)
        .join(" ");
      return prefix ? `${prefix} ${synonym.newName}` : synonym.newName;
    }
    const prefix = [guessIsReverse && "AO", guessIsTopside && "Top"]
      .filter(Boolean)
      .join(" ");
    return prefix ? `${prefix} ${grindName}` : grindName;
  }

  function targetedTrainingItems(config, sessionId) {
    const sessionLands = collection.lands.filter((l) => l.sessionId === sessionId);
    const sessionSkips = collection.skips.filter((s) => s.sessionId === sessionId);
    const primaryGrinds = GRINDS.filter((g) => config.grinds[g.name] !== false);
    const switchUpGuaranteed = !!(config.tricks.switchUp && config.tricks.trainingFocus);

    // 1st grind's own guess conditions — same idea as the switch-up
    // ones below, but from topside/spinInAlleyOop/spinInTrue instead of
    // their switchUp* counterparts.
    const primaryGuessIsTopside = !!config.tricks.topside;
    const primaryGuessIsReverse = !!(
      config.tricks.spinInAlleyOop || config.tricks.spinInTrue
    );

    const items = switchUpGuaranteed
      ? []
      : primaryGrinds.map((grind) => {
          const land = sessionLands.find(
            (l) => l.grindName === grind.name && !l.switchUpGrindName
          );
          const attempts = sessionSkips
            .filter((s) => s.grindName === grind.name && !s.switchUpGrindName)
            .reduce((sum, s) => sum + (s.tries || 1), 0);
          return {
            key: `plain-${grind.name}`,
            name: land
              ? land.trickName
              : guessGrindPlaceholderName(
                  grind.name,
                  primaryGuessIsTopside,
                  primaryGuessIsReverse
                ),
            landed: !!land,
            tries: land ? land.tries : 0,
            attempts,
          };
        });

    if (config.tricks.switchUp) {
      const switchUpGuessIsTopside = !!config.tricks.switchUpTopside;
      const switchUpGuessIsReverse = !!(
        config.tricks.spinBetweenAlleyOop || config.tricks.spinBetweenTrue
      );
      // The whole 2nd-grind portion gets a "Switch " prefix when that
      // setting is on — see switchUpSwitch in trickNamer.js, which this
      // mirrors for the not-yet-landed placeholder case.
      const switchUpSwitchPrefix = config.tricks.switchUpSwitch ? "Switch " : "";

      const switchUpGrinds = GRINDS.filter(
        (g) => config.switchUpGrinds[g.name] !== false
      );
      for (const primary of primaryGrinds) {
        const primaryName = guessGrindPlaceholderName(
          primary.name,
          primaryGuessIsTopside,
          primaryGuessIsReverse
        );
        // Switching up to the same grind is a normal, always-available
        // option now (see switchUpPool in trickGenerator.js) — treated
        // exactly like every other target, not a special case.
        for (const su of switchUpGrinds) {
          const land = sessionLands.find(
            (l) => l.grindName === primary.name && l.switchUpGrindName === su.name
          );
          const attempts = sessionSkips
            .filter((s) => s.grindName === primary.name && s.switchUpGrindName === su.name)
            .reduce((sum, s) => sum + (s.tries || 1), 0);
          const suName = guessGrindPlaceholderName(
            su.name,
            switchUpGuessIsTopside,
            switchUpGuessIsReverse
          );
          const placeholderName = `${primaryName} to ${switchUpSwitchPrefix}${suName}`;
          items.push({
            key: `combo-${primary.name}-${su.name}`,
            name: land ? land.trickName : placeholderName,
            landed: !!land,
            tries: land ? land.tries : 0,
            attempts,
          });
        }
      }
    }

    return items;
  }


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
   * (Grind, variation) pairs landed at least once but not landed again
   * in the last `days` days — genuinely "learned it, haven't kept it
   * up". Pairs never landed at all are excluded even if they've been
   * drawn or skipped many times: not having cracked it yet isn't the
   * same as neglecting it, and this list is about staying sharp on
   * what you already know, not a to-do list of what you don't.
   */
  function staleCombos(days) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return allGrindVariationPairs()
      .map((pair) => {
        let lastLandedAt = null;
        for (const land of collection.lands) {
          if (
            land.grindName === pair.grindName &&
            land.variationName === pair.variationName
          ) {
            if (!lastLandedAt || new Date(land.date) > new Date(lastLandedAt)) {
              lastLandedAt = land.date;
            }
          }
        }
        return { ...pair, lastLandedAt };
      })
      .filter(
        (entry) => entry.lastLandedAt && new Date(entry.lastLandedAt).getTime() < cutoff
      );
  }

  /** Records a landed spin and returns any newly earned badges. */
  const recordLand = (spin, tries = 1, sessionId = null, familyId = null, familyEntry = null) => {
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
      // Full descriptor of what was actually rolled — approach/spin-in/
      // spin-out/switch-up, mainly kept for reference (e.g. showing
      // full trick details later).
      approach: winners.Approach,
      spinToName: winners.SpinTo,
      spinOffName: winners.SpinOff,
      // Switch-up (2nd grind) info, only set when this land actually
      // had one — null otherwise. Feeds the Historique panel's
      // Switch-ups list (see switchUpLands below).
      switchUpGrindName: winners.SwitchUp !== "None" ? winners.SwitchUp : null,
      switchUpVariationName:
        winners.SwitchUp !== "None" ? winners.SwitchUpVariation : null,
      switchSpinName: winners.SwitchUp !== "None" ? winners.SwitchSpin : null,
      // Which family (if any) was being trained when this was landed —
      // feeds the end-of-session recap's "families progressed" list.
      familyId,
      // The EXACT family entry this land completed, keyed the same way
      // progress-tracking is (familyEntryKey) — some family entries
      // don't pin every reel (e.g. a plain "Soul" entry leaves spin-in
      // up to the player's own settings), so what actually got rolled
      // can't always be reconstructed backwards from the land's own
      // fields alone. Stored directly instead, straight from the
      // entry that was actually active — always exact.
      familyEntryKey: familyEntry ? familyEntryKey(familyEntry) : null,
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

  // The Career screen's own reset: wipes every BUILT-IN family's
  // progress (both Normal and Switch tracks) and their completion
  // badges — personal families have nothing to do with Career and are
  // deliberately left untouched, along with the rest of the collection
  // (stats, badges, session history).
  const resetCareerProgress = () => {
    const builtinIds = new Set(FAMILIES.map((family) => family.id));
    for (const id of Object.keys(collection.familyProgress)) {
      if (builtinIds.has(id)) {
        delete collection.familyProgress[id];
      }
    }
    for (const id of Object.keys(collection.badges)) {
      if (id.startsWith("family-") && builtinIds.has(id.slice("family-".length))) {
        delete collection.badges[id];
      }
    }
  };

  const recordSkip = (
    spin,
    tries = 1,
    sessionId = null,
    familyId = null,
    familyEntry = null
  ) => {
    const winners = spinWinners(spin);
    statsIn(collection.tricks, spin.name).skipped += 1;
    statsIn(collection.grinds, winners.Grind).skipped += 1;
    collection.skips.push({
      sessionId,
      date: new Date().toISOString(),
      trickName: spin.name,
      grindName: winners.Grind,
      variationName: winners.GrindVariation,
      // How many Raté taps happened before this skip — a trick can be
      // attempted several times and still end up skipped rather than
      // landed; that shouldn't just collapse into "1 attempt".
      tries,
      // So a skip can be matched back to a specific (grind, switch-up
      // grind) combo — e.g. targetedTrainingItems' attempt counts —
      // not just the 1st grind. null when this draw had no switch-up.
      switchUpGrindName: winners.SwitchUp !== "None" ? winners.SwitchUp : null,
      familyId,
      familyEntryKey: familyEntry ? familyEntryKey(familyEntry) : null,
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
  // BADGES only ever knows about built-in families (fixed at build
  // time) — personal families are created by the player, so their
  // badges are stitched in here dynamically from whichever ones
  // currently exist, rather than being missing from every gallery/count
  // that walks the badge list.
  const allBadges = computed(() => [
    ...BADGES,
    ...settingsApi.settings.customFamilies.map((family) => ({
      id: `family-${family.id}`,
      name: family.name,
      desc: `Termine la famille perso "${family.name}"`,
    })),
  ]);

  const earnedBadges = computed(() =>
    allBadges.value.filter((badge) => collection.badges[badge.id])
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
    allBadges,
    earnedBadges,
    hasBadge,
    familyIndex,
    isFamilyComplete,
    familyRemainingIndices,
    careerProgress,
    isCareerComplete,
    awardCareerBadgeIfComplete,
    advanceFamilyProgress,
    resetFamilyProgress,
    grindLandedCount,
    startSession,
    endSession,
    sessionById,
    sessionHistory,
    sessionLands,
    sessionBadges,
    sessionFamilyProgress,
    familyEntryStatuses,
    familyTriesSeries,
    repeatedTrickSeries,
    switchUpLands,
    staleCombos,
    targetedTrainingItems,
  };
}