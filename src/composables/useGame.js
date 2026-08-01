import { computed, reactive, ref } from "vue";
import { generateSpin } from "../game/trickGenerator.js";
import { FAMILIES, resolveFamily } from "../game/families.js";
import { useCollection } from "./useCollection.js";
import { useSettings, CUSTOM_LEVEL } from "./useSettings.js";
import { useBackup } from "./useBackup.js";

// Group mode is S.K.A.T.E with the letters A.I.G.H.T: bail a trick and
// you collect the next letter; five letters and you are out.
export const LETTERS = "BLADE";

// The player who starts a turn may swap the trick this many times
// before attempting it; everyone after them plays the locked-in trick.
export const REROLLS_PER_TURN = 3;

// How many recent grinds solo mode avoids repeating (a sliding window,
// since an endless session cycles through the pool many times).
const SOLO_REPEAT_WINDOW = 15;

const state = reactive({
  screen: "start", // start | game | gameover | sessionReport
  phase: "idle", // idle | spinning | result
  mode: "group", // solo | group
  points: 0, // solo session score
  spinsUsed: 0,
  spinsTotal: 5,
  spin: null, // current generateSpin() result
  spinId: 0, // increments per spin, drives the reel animation
  tricks: [], // landed tricks: { name, orig, score } (solo)
  skipped: [],
  usedGrinds: [],
  newBadges: [], // badges earned by the last landed trick (solo)
  tries: 1, // attempt counter for the trick currently on screen (solo)
  sessionId: null, // current solo session id (see useCollection)
  lastSessionId: null, // shown by the session report screen after ending
  // Set when a session was started from "Grinds to review" (Collection
  // panel) — restricts the Grind/Variation reels to exactly this list
  // of { grindName, variationName } pairs. null in a normal session.
  lockedPairs: null,
  // Set when training a family (see game/families.js) — restricts the
  // draw to that family's entries only, until every one has been
  // landed at least once. Cleared as soon as the family is completed —
  // see familyJustCompleted below, which pauses the session right
  // there instead of silently rolling into something else.
  activeFamilyId: null,
  // Which entry (index into activeFamily.entries) the CURRENT spin drew
  // — a random pick among entries not yet landed, redrawn on every spin
  // (skip included). null when no family is active.
  activeFamilyEntryIndex: null,
  // Mix training: draws across several selected families at once
  // (built-in "Familles de tricks" and/or personal families) instead
  // of just one — see startMixSession/buildMixPool below. Empty array
  // when no Mix session is active. Mix always writes to each family's
  // plain "::practice" progress bucket (isCareer is never true here),
  // so it shares progress with training a family on its own, and this
  // can never touch Career progress.
  activeFamilyIds: [],
  // Which family the CURRENT spin's forced entry actually came from,
  // and its index within THAT family's own entries — { familyId,
  // index } | null. Mix's equivalent of activeFamilyEntryIndex.
  activeMixEntry: null,
  // The family object just finished by the last landTrick() call, or
  // null. While set, the game screen shows a completion pause instead
  // of drawing the next spin automatically — the player explicitly
  // picks "next family" or "keep going free" (see continueFreePlay /
  // nextCareerFamily below) rather than the switch happening unnoticed.
  familyJustCompleted: null,
  // Set when the player picks "Continuer en mode libre" after a family
  // completion pause — keeps drawing randomly from THAT family's own
  // entries, forever, instead of degrading into a fully unrestricted
  // draw across every grind (which is what silently happened before:
  // activeFamilyId gets cleared the instant the family completes, so
  // the old continueFreePlay had nothing left to loop on). Unlike
  // activeFamilyId, this never blocks on "remaining" entries — the
  // family is already 100% done, so every entry is fair game every
  // time. Cleared whenever a genuinely new session/family starts.
  freeLoopFamilyId: null,
  // Set instead of familyJustCompleted when the family that just
  // finished was the LAST one of its whole Career track — triggers the
  // full-screen CareerCompleteScreen (state.screen = "careerComplete")
  // rather than the regular pause panel. { track, badge } | null.
  careerJustCompleted: null,
  // Set right before navigating back to the Start screen from a
  // career family's spin screen, so StartScreen can reopen directly on
  // that track's path instead of the mode-picker (see backToCareer
  // below and StartScreen's own `step`/`careerTrack` init). Consumed
  // and cleared by StartScreen as soon as it reads it.
  pendingCareerTrack: null,
  // Whether the CURRENT solo family session was entered through the
  // Career flow specifically (StartScreen's startCareerFamily / the
  // "next family" continuation below) rather than the plain "Familles
  // de tricks" picker. Every built-in family has a `track` regardless
  // of which of the two ways it was started, so that alone can't tell
  // them apart — this can. Drives which menu "Retour" on the spin
  // screen goes back to (see GameScreen.vue's isCareerFamily).
  isCareerSession: false,

  // group (S.K.A.T.E) state
  players: [], // { name, letters }
  round: 0,
  turnOrder: [], // player indices attempting the current trick, in order
  turnPos: 0, // position within turnOrder
  rerollsLeft: 0, // trick swaps the turn's starting player has left

  // BLADE VS state — you against the robot, same trick generation and
  // BLADE-letters scoring as group mode, but each side gets up to 3
  // tries at the SAME trick instead of one shared attempt, and the
  // robot's outcome is rolled instead of tapped in. state.players is
  // reused here too: [{ name: "Toi", letters }, { name: "Robot", letters }]
  // — GameOverScreen's standings table works unmodified.
  vsTries: 1, // player's try count this round (1-3)
  // Set once the round is decided (player landed, or exhausted 3
  // tries) — { playerLanded, robotLanded, robotTries } | null. While
  // set, the game screen shows the round's outcome instead of the
  // Raté/Réussi buttons, until "Trick suivant" is tapped.
  vsRoundResult: null,
});

const collection = useCollection();
// Fire-and-forget: a solo session ending is a good, natural moment to
// check whether today's silent local auto-backup is still due (see
// useBackup.js's autoBackupIfDue) — never awaited here since it must
// never hold up or fail the actual session-ending flow it's called
// from.
const backupApi = useBackup();
const settingsApi = useSettings();

// Resolves either a built-in family (families.js) or a player-built one
// (settings.customFamilies) by id — see resolveFamily in families.js.
// Named settingsApi (not settings) so it never shadows the `settings`
// parameter most functions below already take from their own caller.
function resolveFamilyById(familyId) {
  return familyId ? resolveFamily(familyId, settingsApi.settings.customFamilies) : null;
}

// A built-in Career family (has a track) is reachable two ways — the
// Carrière flow itself, or the plain "Familles de tricks" picker — and
// those two are meant to be entirely independent: training a family
// outside Carrière must never advance Carrière's own progress, and
// vice versa. Personal/custom families (track === null) only have one
// way to reach them, so there's nothing to separate. This is the one
// place that decides which of the two a given landed trick actually
// counts towards — every progress read/write for a family goes
// through this rather than the family's own `.id` directly.
function progressFamilyId(family, isCareer) {
  if (!family) {
    return null;
  }
  return family.track !== null && !isCareer ? `${family.id}::practice` : family.id;
}

// Undo, for a mistapped Blade!/Passer/Loupé/Réussi — a full snapshot of
// both state and the collection right before the action mutates
// anything, restored wholesale rather than trying to surgically
// reverse each individual side effect (score, family progress, badges,
// session counts, streak...). Simpler and far less error-prone than
// hand-unwinding all of that, and cheap enough at this app's scale.
// Single-level only: taking a new snapshot overwrites the old one, and
// it's cleared outright whenever a session starts/ends, so there's
// never a stale snapshot from a different session to accidentally
// restore.
let undoSnapshot = ref(null);

function captureUndoSnapshot() {
  undoSnapshot.value = {
    state: JSON.parse(JSON.stringify(state)),
    collection: JSON.parse(JSON.stringify(collection.collection)),
  };
}

function clearUndoSnapshot() {
  undoSnapshot.value = null;
}

const canUndo = computed(() => undoSnapshot.value !== null);

function undoLastAction() {
  if (!undoSnapshot.value) {
    return;
  }
  Object.assign(state, undoSnapshot.value.state);
  Object.assign(collection.collection, undoSnapshot.value.collection);
  undoSnapshot.value = null;
}

const activeIndices = () =>
  state.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.letters < LETTERS.length)
    .map(({ index }) => index);

export function useGame() {
  const spinsLeft = computed(() => state.spinsTotal - state.spinsUsed);
  const isSolo = computed(() => state.mode === "solo");
  const isVs = computed(() => state.mode === "vs");
  const currentPlayer = computed(() =>
    state.mode === "group" && state.turnOrder.length > state.turnPos
      ? state.players[state.turnOrder[state.turnPos]]
      : null
  );
  // The current player bails out of the game with one more letter.
  const onLastLetter = computed(
    () => (currentPlayer.value?.letters ?? 0) === LETTERS.length - 1
  );
  const activeFamily = computed(() =>
    resolveFamilyById(state.activeFamilyId ?? state.freeLoopFamilyId)
  );

  // Switching what you're training (Custom, a family, review mode, a
  // different family...) used to always start a brand new session,
  // fragmenting Historique into lots of near-empty rows every time you
  // changed your mind mid-sitting. Now it only truly starts fresh if
  // there's no session already open — otherwise everything you do
  // before actually tapping "Terminer la session" keeps accumulating
  // into that same one. Returns true if this call started a fresh one.
  function beginOrContinueSoloSession() {
    const isFresh = !state.sessionId;
    if (isFresh) {
      state.points = 0;
      state.spinsUsed = 0;
      state.tricks = [];
      state.skipped = [];
      state.usedGrinds = [];
      state.newBadges = [];
      state.sessionId = collection.startSession();
      clearUndoSnapshot();
    }
    return isFresh;
  }

  const startGame = (settings, mode = settings.mode || "group") => {
    state.mode = mode;
    state.activeFamilyId = null;
    state.activeFamilyEntryIndex = null;
    state.activeFamilyIds = [];
    state.activeMixEntry = null;
    state.familyJustCompleted = null;
    state.careerJustCompleted = null;
    state.freeLoopFamilyId = null;
    state.lockedPairs = null;
    state.screen = "game";

    if (mode === "solo") {
      state.spinsTotal = Infinity;
      beginOrContinueSoloSession();
      if (settings.level === CUSTOM_LEVEL) {
        settingsApi.recordTargetedTraining(state.sessionId);
      }
      nextSpin(settings);
      return;
    }

    // Group/VS both always start a clean slate — and close out any
    // solo session left dangling open rather than abandoning it
    // silently.
    if (state.sessionId) {
      collection.endSession(state.sessionId);
      backupApi.autoBackupIfDue();
      state.sessionId = null;
    }
    state.points = 0;
    state.spinsUsed = 0;
    state.tricks = [];
    state.skipped = [];
    state.usedGrinds = [];
    state.newBadges = [];

    if (mode === "vs") {
      state.players = [
        { name: "Toi", letters: 0 },
        { name: "Robot", letters: 0 },
      ];
      state.round = 0;
      beginVsRound(settings);
      return;
    }

    state.players = settings.players.map((name, i) => ({
      name: String(name).trim() || `Joueur ${i + 1}`,
      letters: 0,
    }));
    state.round = 0;
    beginRound(settings);
  };

  /**
   * Solo only: same as startGame, but the Grind/Variation reels are
   * restricted to exactly the given { grindName, variationName } pairs
   * for the whole session — used by "Grinds to review" in the
   * Collection panel to deliberately drill neglected combos.
   */
  const startReviewSession = (pairs, settings) => {
    state.mode = "solo";
    state.lockedPairs = pairs;
    state.activeFamilyId = null;
    state.activeFamilyEntryIndex = null;
    state.activeFamilyIds = [];
    state.activeMixEntry = null;
    state.familyJustCompleted = null;
    state.careerJustCompleted = null;
    state.freeLoopFamilyId = null;
    state.screen = "game";
    state.spinsTotal = Infinity;
    beginOrContinueSoloSession();
    nextSpin(settings);
  };

  /**
   * Solo only: family training (see game/families.js). Each spin draws
   * a random entry among the family's tricks not yet landed — skipping
   * doesn't block anything, it just redraws; landing removes that entry
   * from the pool for good. Resumes where you left off unless `restart`
   * is set (or the family was already fully complete, in which case it
   * restarts anyway).
   */
  const startFamilySession = (familyId, settings, { restart = false, isCareer = false } = {}) => {
    state.mode = "solo";
    state.lockedPairs = null;
    state.activeFamilyId = familyId;
    state.activeFamilyEntryIndex = null;
    state.activeFamilyIds = [];
    state.activeMixEntry = null;
    state.familyJustCompleted = null;
    state.careerJustCompleted = null;
    state.freeLoopFamilyId = null;
    state.isCareerSession = isCareer;
    const resolvedFamily = resolveFamilyById(familyId);
    const progressId = progressFamilyId(resolvedFamily, isCareer);
    if (
      progressId &&
      (restart || collection.isFamilyComplete(progressId, resolvedFamily?.entries))
    ) {
      collection.resetFamilyProgress(progressId);
    }
    state.screen = "game";
    state.spinsTotal = Infinity;
    beginOrContinueSoloSession();
    nextSpin(settings);
  };

  /**
   * Solo only: Mix training — draws randomly across every entry of
   * several selected families (built-in and/or personal) at once,
   * landed or not (see buildMixPool/nextSpin) — landing still advances
   * that entry's OWN family's plain "::practice" progress, same bucket
   * the regular single-family picker uses, so Mix shares progress with
   * training a family alone and never touches Career (isCareerSession
   * is always false here). Returns false without starting anything if
   * the selection is empty or resolves to no real families.
   */
  const startMixSession = (familyIds, settings) => {
    const ids = [...new Set(familyIds)].filter((id) => resolveFamilyById(id));
    if (!ids.length || !buildMixPool(ids).length) {
      return false;
    }
    state.mode = "solo";
    state.lockedPairs = null;
    state.activeFamilyId = null;
    state.activeFamilyEntryIndex = null;
    state.activeFamilyIds = ids;
    state.activeMixEntry = null;
    state.familyJustCompleted = null;
    state.careerJustCompleted = null;
    state.freeLoopFamilyId = null;
    state.isCareerSession = false;
    state.screen = "game";
    state.spinsTotal = Infinity;
    beginOrContinueSoloSession();
    nextSpin(settings);
    return true;
  };

  // "Points faibles" isn't a real family the player built or unlocked —
  // it's rebuilt fresh every time from whichever landed tricks you
  // currently skip/fail the most (see collection.weakPointsEntries),
  // then run through the exact same family-training machinery as any
  // other family (forced draw, checklist, one at a time until landed).
  // Reusing settings.customFamilies as where it lives is just a
  // convenient, already-working storage/resolution slot — StartScreen
  // filters this specific id back out of the visible "Familles perso"
  // picker so it doesn't show up there as if the player made it.
  // Always restarts fresh: yesterday's weak list may not even be
  // today's, so carrying over old progress under the same id wouldn't
  // mean much.
  const WEAK_POINTS_FAMILY_ID = "weak-points";
  const startWeakPointsSession = (settings, { limit = 15 } = {}) => {
    const entries = collection.weakPointsEntries(limit);
    if (!entries.length) {
      return false;
    }
    const family = { id: WEAK_POINTS_FAMILY_ID, name: "Points faibles", entries };
    const existingIndex = settings.customFamilies.findIndex(
      (f) => f.id === WEAK_POINTS_FAMILY_ID
    );
    if (existingIndex >= 0) {
      settings.customFamilies.splice(existingIndex, 1, family);
    } else {
      settings.customFamilies.push(family);
    }
    startFamilySession(WEAK_POINTS_FAMILY_ID, settings, { restart: true });
    return true;
  };

  // One round = one trick that every player still in the game attempts.
  // The starting player rotates each round and gets fresh rerolls.
  const beginRound = (settings) => {
    state.round += 1;
    const active = activeIndices();
    const start = (state.round - 1) % active.length;
    state.turnOrder = [...active.slice(start), ...active.slice(0, start)];
    state.turnPos = 0;
    state.rerollsLeft = REROLLS_PER_TURN;
    nextSpin(settings);
  };

  /**
   * VS: one round = one trick both sides attempt independently, up to
   * 3 tries each (see vsAttempt/resolveVsRound below) — no turn order,
   * no rerolls, both go at once.
   */
  const beginVsRound = (settings) => {
    state.round += 1;
    state.vsTries = 1;
    state.vsRoundResult = null;
    nextSpin(settings);
  };

  /** VS: rolls the robot's 3 independent attempts at settings.vsRobotChance
   * each; lands on the first success, or fails all 3. */
  function rollRobot(settings) {
    const chance = Math.min(100, Math.max(0, settings.vsRobotChance ?? 50)) / 100;
    for (let i = 1; i <= 3; i++) {
      if (Math.random() < chance) {
        return { landed: true, tries: i };
      }
    }
    return { landed: false, tries: 3 };
  }

  /** VS: resolves the round once the player either lands it or has
   * exhausted their 3 tries — rolls the robot, applies a BLADE letter
   * to whichever side (or both) failed to land it, and ends the game
   * the instant either side hits 5 letters. */
  function resolveVsRound(playerLanded, settings) {
    const robot = rollRobot(settings);
    const [player, bot] = state.players;
    if (!playerLanded) {
      player.letters += 1;
    }
    if (!robot.landed) {
      bot.letters += 1;
    }
    if (player.letters >= LETTERS.length || bot.letters >= LETTERS.length) {
      endGame();
      return;
    }
    state.vsRoundResult = {
      playerLanded,
      robotLanded: robot.landed,
      robotTries: robot.tries,
    };
  }

  /**
   * VS: the player's attempt this round. A "Réussi" always resolves
   * the round on the spot; a "Raté" only resolves it once all 3 tries
   * are spent — otherwise the same trick stays up for another go.
   */
  const vsAttempt = (landed, settings) => {
    if (!landed && state.vsTries < 3) {
      state.vsTries += 1;
      return;
    }
    resolveVsRound(landed, settings);
  };

  /** VS: advances past the round-result panel into the next round. */
  const nextVsRound = (settings) => {
    beginVsRound(settings);
  };

  /**
   * Group: the starting player swaps the trick for a fresh spin. Only
   * possible before anyone attempted it, and at most 3 times per turn.
   */
  const rerollTrick = (settings) => {
    if (state.mode !== "group" || state.turnPos !== 0 || state.rerollsLeft <= 0) {
      return;
    }
    state.rerollsLeft -= 1;
    nextSpin(settings);
  };

  /** Mix: pool of every {familyId, index} across ALL the given
   * families, landed or not — landing still advances that family's
   * plain "::practice" progress (see landTrick), it just no longer
   * restricts what can come up again. Mix never touches Career. */
  function buildMixPool(familyIds) {
    const pool = [];
    for (const familyId of familyIds) {
      const fam = resolveFamilyById(familyId);
      if (!fam) {
        continue;
      }
      fam.entries.forEach((_, index) => pool.push({ familyId, index }));
    }
    return pool;
  }

  const nextSpin = (settings) => {
    state.spinsUsed += 1;
    state.tries = 1;
    // Solo trains you: never-landed and often-skipped grinds come up more.
    const bias = state.mode === "solo" ? collection.grindBias() : null;
    const family = resolveFamilyById(state.activeFamilyId);
    let forcedTrick = null;
    state.activeFamilyEntryIndex = null;
    state.activeMixEntry = null;
    if (family) {
      const remaining = collection.familyRemainingIndices(
        progressFamilyId(family, state.isCareerSession),
        family.entries
      );
      // Should only be empty for one frame right as the family
      // completes (landTrick clears activeFamilyId before this runs) —
      // guarded here anyway rather than crashing.
      if (remaining.length) {
        state.activeFamilyEntryIndex =
          remaining[Math.floor(Math.random() * remaining.length)];
        forcedTrick = family.entries[state.activeFamilyEntryIndex];
      }
    } else if (state.activeFamilyIds.length) {
      const pool = buildMixPool(state.activeFamilyIds);
      if (pool.length) {
        state.activeMixEntry = pool[Math.floor(Math.random() * pool.length)];
        forcedTrick = resolveFamilyById(state.activeMixEntry.familyId).entries[
          state.activeMixEntry.index
        ];
      }
    } else if (state.freeLoopFamilyId) {
      // "Continuer en mode libre" after completion — every entry is
      // fair game every time, no "remaining" tracking needed since
      // there's nothing left to complete.
      const loopFamily = resolveFamilyById(state.freeLoopFamilyId);
      if (loopFamily && loopFamily.entries.length) {
        state.activeFamilyEntryIndex = Math.floor(
          Math.random() * loopFamily.entries.length
        );
        forcedTrick = loopFamily.entries[state.activeFamilyEntryIndex];
      }
    }
    state.spin = generateSpin(
      settings.tricks,
      state.usedGrinds,
      bias,
      settings.grinds,
      settings.switchUpGrinds,
      state.lockedPairs,
      forcedTrick,
      settings.switchUp2Grinds
    );
    state.usedGrinds.push(
      state.spin.reels.find((r) => r.name === "Grind").winner.name
    );
    const switchUpReel = state.spin.reels.find((r) => r.name === "SwitchUp");
    if (switchUpReel && switchUpReel.winner) {
      state.usedGrinds.push(switchUpReel.winner.name);
    }
    const switchUp2Reel = state.spin.reels.find((r) => r.name === "SwitchUp2");
    if (switchUp2Reel && switchUp2Reel.winner) {
      state.usedGrinds.push(switchUp2Reel.winner.name);
    }
    // A switch-up spin pushes 2 names (grind + switch-up grind) in one
    // go, so trimming needs a loop, not a single shift — one shift per
    // call let the array creep past SOLO_REPEAT_WINDOW by one entry
    // every switch-up spin, growing unboundedly over a long session.
    while (state.mode === "solo" && state.usedGrinds.length > SOLO_REPEAT_WINDOW) {
      state.usedGrinds.shift();
    }
    state.spinId += 1;
    state.phase = "spinning";
  };

  // Called by the slot machine once every reel has stopped.
  const onReelsSettled = () => {
    state.phase = "result";
  };

  // Solo: one more failed real-life attempt at the trick on screen.
  // Doesn't touch the spin — same trick, just counts the try.
  const addTry = () => {
    state.tries += 1;
  };

  const currentTrick = () => ({
    name: state.spin.name,
    orig: state.spin.orig,
    score: state.spin.score,
  });

  /** Group: resolve the current player's attempt at the round's trick. */
  const attempt = (landed, settings) => {
    const player = state.players[state.turnOrder[state.turnPos]];
    if (!landed) {
      player.letters += 1;
      // A bail on the last letter can decide the game mid-round: with
      // one player left standing, later attempts this round are moot.
      if (activeIndices().length <= 1) {
        endGame();
        return;
      }
    }
    if (state.turnPos + 1 < state.turnOrder.length) {
      state.turnPos += 1; // same trick, next player
      return;
    }
    // Classic S.K.A.T.E: rounds go on until one player is left standing.
    if (activeIndices().length <= 1) {
      endGame();
    } else {
      beginRound(settings);
    }
  };

  const landTrick = (settings) => {
    captureUndoSnapshot();
    state.points += state.spin.score;
    state.tricks.push(currentTrick());

    // Single family or Mix — whichever is active tells us which
    // family (if any) this land's entry actually belongs to.
    const landFamilyId = state.activeFamilyId ?? state.activeMixEntry?.familyId ?? null;
    const landFamily = landFamilyId ? resolveFamilyById(landFamilyId) : null;
    const landEntryIndex = state.activeFamilyId
      ? state.activeFamilyEntryIndex
      : state.activeMixEntry
      ? state.activeMixEntry.index
      : null;
    const activeEntryForLand =
      landFamily && landEntryIndex !== null ? landFamily.entries[landEntryIndex] : null;

    let badges =
      state.mode === "solo"
        ? collection.recordLand(
            state.spin,
            state.tries,
            state.sessionId,
            landFamilyId,
            activeEntryForLand
          )
        : [];

    let justCompletedFamily = null;
    if (state.activeFamilyId) {
      const family = landFamily;
      if (family && state.activeFamilyEntryIndex !== null) {
        const progressId = progressFamilyId(family, state.isCareerSession);
        const familyBadge = collection.advanceFamilyProgress(
          family,
          family.entries[state.activeFamilyEntryIndex],
          progressId
        );
        if (familyBadge) {
          badges = [...badges, familyBadge];
        }
        if (collection.isFamilyComplete(progressId, family.entries)) {
          justCompletedFamily = family;
          state.activeFamilyId = null;
          state.activeFamilyEntryIndex = null;
        }
      }
    } else if (state.activeMixEntry) {
      const family = landFamily;
      if (family) {
        // Mix never trains Career — always the plain "::practice"
        // bucket, same one the single-family picker itself writes to.
        // Landing still advances/completes that family normally (and
        // still awards its badge the first time it's fully landed);
        // it just no longer removes anything from the draw — a family
        // being complete doesn't pause or shrink the Mix pool anymore.
        const progressId = progressFamilyId(family, false);
        const familyBadge = collection.advanceFamilyProgress(
          family,
          family.entries[state.activeMixEntry.index],
          progressId
        );
        if (familyBadge) {
          badges = [...badges, familyBadge];
        }
      }
    }

    state.newBadges = badges;
    if (justCompletedFamily) {
      // The last family of a whole Career track finishing is a bigger
      // moment than a regular one — it gets its own full-screen
      // takeover instead of the usual pause-and-pick panel, since
      // there's no "next family" to offer anyway.
      const careerBadge = justCompletedFamily.track
        ? collection.awardCareerBadgeIfComplete(justCompletedFamily.track)
        : null;
      if (careerBadge) {
        state.careerJustCompleted = {
          track: justCompletedFamily.track,
          badge: careerBadge,
        };
        state.screen = "careerComplete";
        return;
      }
      // Pause here — don't draw a next (unrelated) spin until the
      // player explicitly chooses what happens next.
      state.familyJustCompleted = justCompletedFamily;
      return;
    }
    nextSpin(settings);
  };

  /** The next family in career order after this one (same track, next
   * tier), or null if it was the last one. */
  const nextFamilyInOrder = (family) =>
    FAMILIES.find((f) => f.track === family.track && f.tier === family.tier + 1) ||
    null;

  // Player's choice after a family completion pause: keep the session
  // going, drawing randomly from THIS family's entries in a loop —
  // "tirage aléatoire de la famille en boucle", not a fully free draw
  // across every grind (that was the bug: activeFamilyId is already
  // null by the time this runs, so without freeLoopFamilyId there was
  // nothing left tying the next draw to the family at all).
  const continueFreePlay = (settings) => {
    state.freeLoopFamilyId = state.familyJustCompleted?.id ?? null;
    state.familyJustCompleted = null;
    state.careerJustCompleted = null;
    nextSpin(settings);
  };

  // Player's choice after a family completion pause: jump straight into
  // training the next family in career order (same track). No-ops if
  // there isn't one (shouldn't be reachable from the UI in that case).
  const nextCareerFamily = (settings) => {
    const completed = state.familyJustCompleted;
    if (!completed) {
      return;
    }
    const next = nextFamilyInOrder(completed);
    state.familyJustCompleted = null;
    state.careerJustCompleted = null;
    if (next) {
      startFamilySession(next.id, settings, { isCareer: true });
    } else {
      nextSpin(settings);
    }
  };

  const skipTrick = (settings) => {
    captureUndoSnapshot();
    state.skipped.push(currentTrick());
    if (state.mode === "solo") {
      const familyId = state.activeFamilyId ?? state.activeMixEntry?.familyId ?? null;
      const family = familyId ? resolveFamilyById(familyId) : null;
      const entryIndex = state.activeFamilyId
        ? state.activeFamilyEntryIndex
        : state.activeMixEntry
        ? state.activeMixEntry.index
        : null;
      const entry = family && entryIndex !== null ? family.entries[entryIndex] : null;
      collection.recordSkip(
        state.spin,
        state.tries,
        state.sessionId,
        familyId,
        entry
      );
    }
    nextSpin(settings);
  };

  const endGame = () => {
    state.screen = "gameover";
    state.phase = "idle";
  };

  // Solo sessions have no game over: ending one shows the session
  // report instead of just bouncing back to the start screen.
  const giveUp = () => {
    clearUndoSnapshot();
    if (state.mode === "solo") {
      if (state.sessionId) {
        collection.endSession(state.sessionId);
        backupApi.autoBackupIfDue();
        state.lastSessionId = state.sessionId;
        state.sessionId = null;
      }
      state.screen = "sessionReport";
      state.phase = "idle";
    } else {
      endGame();
    }
  };

  const goToStart = () => {
    state.screen = "start";
    state.phase = "idle";
    state.spin = null;
    state.newBadges = [];
    state.careerJustCompleted = null;
  };

  // Shortcut back button shown only while training a built-in Career
  // family (never for a personal family or targeted training, neither
  // of which has a "path" screen to return to). Ends the session the
  // same way the regular Retour/giveUp does, but skips the session
  // report and drops the player straight back on this family's Career
  // track path instead of the mode-picker.
  const backToCareer = () => {
    const family = state.activeFamilyId ? resolveFamilyById(state.activeFamilyId) : null;
    const track = family?.track ?? null;
    clearUndoSnapshot();
    if (state.sessionId) {
      collection.endSession(state.sessionId);
      backupApi.autoBackupIfDue();
      state.lastSessionId = state.sessionId;
      state.sessionId = null;
    }
    state.activeFamilyId = null;
    state.activeFamilyEntryIndex = null;
    state.isCareerSession = false;
    state.pendingCareerTrack = track;
    goToStart();
  };

  /**
   * There's no way to run code while the app is closed, so "at
   * midnight" really means "next time the Start screen is shown" — if
   * a solo session was left dangling open from a PREVIOUS calendar day
   * (forgot to tap "Terminer la session"), it's quietly closed out
   * here instead of silently growing forever. A session still open
   * from TODAY is left alone — jumping back into it is likely, and the
   * Start screen offers its own manual "Terminer" button for that case
   * (see hasOpenSessionToday below).
   */
  function closeStaleSessionIfNeeded() {
    if (!state.sessionId) {
      return;
    }
    const session = collection.sessionById(state.sessionId);
    if (!session) {
      state.sessionId = null;
      return;
    }
    const startedDay = session.startedAt.slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (startedDay !== today) {
      collection.endSession(state.sessionId);
      backupApi.autoBackupIfDue();
      state.lastSessionId = state.sessionId;
      state.sessionId = null;
    }
  }

  const hasOpenSessionToday = computed(() => state.sessionId !== null);

  /** Manual escape hatch from the Start screen for a same-day session
   * left open (didn't want to lose it automatically, but also don't
   * want to jump back into it right now). */
  function endOpenSession() {
    if (state.sessionId) {
      giveUp();
    }
  }

  return {
    state,
    spinsLeft,
    isSolo,
    isVs,
    currentPlayer,
    onLastLetter,
    startGame,
    startReviewSession,
    startFamilySession,
    startMixSession,
    startWeakPointsSession,
    WEAK_POINTS_FAMILY_ID,
    activeFamily,
    onReelsSettled,
    attempt,
    rerollTrick,
    landTrick,
    skipTrick,
    canUndo,
    undoLastAction,
    nextFamilyInOrder,
    continueFreePlay,
    nextCareerFamily,
    addTry,
    vsAttempt,
    nextVsRound,
    giveUp,
    goToStart,
    backToCareer,
    closeStaleSessionIfNeeded,
    hasOpenSessionToday,
    endOpenSession,
  };
}