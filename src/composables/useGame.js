import { computed, reactive, ref } from "vue";
import { generateSpin } from "../game/trickGenerator.js";
import { FAMILIES, resolveFamily, familiesInTrackOrder } from "../game/families.js";
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
  // Restricts the draw to several selected families' entries at once
  // instead of the usual random pool — used by two different modes:
  // Mix (solo training across several families, built-in and/or
  // personal — see startMixSession/buildMixPool below) and BLADE VS
  // (settings.vsMode === "families" — see startGame). Empty array
  // when neither is active. Only Mix (mode "solo") advances family
  // progress on landing — see the "state.mode === 'solo'" guard in
  // landTrick; VS reuses the same draw mechanism but never writes to
  // family progress, win or lose.
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
  // Same idea, for BLADE VS: set right before navigating back to the
  // Start screen from either quitting mid-match (giveUp) or "Changer
  // la config" on the game-over screen, so StartScreen reopens
  // directly on VS's own setup screen (sliders and all) instead of the
  // mode-picker. Consumed and cleared by StartScreen as soon as it
  // reads it.
  pendingVsSetup: false,
  // Solo only: which setup screen the session report's "Retour" button
  // should jump back to — "mix" | "family" | "setup" | null. Set by
  // giveUp() right before leaving for the report, cleared by
  // StartScreen once it's read. "Retour à l'accueil" clears this
  // itself first so it always lands on the plain mode-picker instead.
  pendingReturnStep: null,
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

  // Combo mode state — go as far as possible chaining tricks with at
  // most 2 tries each; failing both on any one trick ends the whole
  // run, and the chain built so far is gone (see comboAttempt below).
  // Two independent ways to build the sequence of tricks (see
  // startComboCareer/startComboMix):
  // - "career": the ENTIRE track (Normal or Switch) end to end, every
  //   family back to back in tier order (families.js's
  //   familiesInTrackOrder), switching family automatically the
  //   instant the current one's last entry lands — no pause, unlike
  //   normal Career.
  // - "mix": a random draw from the pooled entries of the selected
  //   families, exactly like Mix training's own buildMixPool, just
  //   with the 2-tries/lose-it-all rule on top instead of Mix's usual
  //   per-family progress tracking.
  // Never advances family/Career progress either way — same
  // philosophy as BLADE VS (its own separate challenge, not a side
  // door to grind out Career or a personal family).
  comboActive: false,
  comboSource: null, // "career" | "mix" | null
  comboTrack: null, // "normal" | "switch" — set for career combos only
  comboPath: [], // career only: flattened [{ familyId, familyName, entry }] for the whole track
  comboPathIndex: 0, // career only: position along comboPath
  comboFamilyIds: [], // mix only: the selected family ids
  // Which family (and, for mix, which of its entries) the CURRENT spin
  // was forced from — career derives the entry itself from
  // comboPath[comboPathIndex], mix needs the index remembered since
  // it's a fresh random pick every spin.
  comboCurrentFamilyId: null,
  comboCurrentEntryIndex: null, // mix only
  comboChain: 0, // tricks landed so far this run
  comboTries: 1, // attempts used on the trick currently on screen (1 or 2)
  // Set once a run ends (2nd failed try, the whole career track
  // cleared, or the player abandons) — read by ComboRecapScreen,
  // cleared on the next combo start. { source, label, chain, cleared,
  // endedAt } | null.
  comboRecap: null,
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
  const isCombo = computed(() => state.mode === "combo");
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
  function beginOrContinueSoloSession(label = null) {
    const isFresh = !state.sessionId;
    if (isFresh) {
      state.points = 0;
      state.spinsUsed = 0;
      state.tricks = [];
      state.skipped = [];
      state.usedGrinds = [];
      state.newBadges = [];
      state.sessionId = collection.startSession(label);
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
      beginOrContinueSoloSession("Solo");
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
        { name: "Pierre", letters: 0 },
        { name: "BladeBot", letters: 0 },
      ];
      state.round = 0;
      // A VS match now feeds the same history as solo training: trick/
      // grind counts, Collection, badges, and its own row in the
      // session history — see landTrick's recordLand call and
      // endGame/giveUp closing this back out.
      state.sessionId = collection.startSession("BLADE VS");
      // Same family-restricted draw Mix uses (see buildMixPool/nextSpin)
      // — draws from every entry of the chosen families, landed or
      // not. VS never advances family PROGRESS either way (see
      // landTrick's "state.mode === 'solo'" guard on that), this only
      // changes which tricks can come up.
      state.activeFamilyIds =
        settings.vsMode === "families"
          ? [...new Set(settings.vsFamilyIds)].filter((id) => resolveFamilyById(id))
          : [];
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
    beginOrContinueSoloSession("Grinds à réviser");
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
    const familyLabel =
      familyId === WEAK_POINTS_FAMILY_ID
        ? "Points faibles"
        : isCareer
          ? `Carrière — ${resolvedFamily?.name ?? "?"}`
          : `Famille — ${resolvedFamily?.name ?? "?"}`;
    beginOrContinueSoloSession(familyLabel);
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
    const mixLabel = `Mix (${ids.map((id) => resolveFamilyById(id)?.name || "?").join(", ")})`;
    beginOrContinueSoloSession(mixLabel);
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

  // Same "hidden synthetic family" trick as Points faibles above, but
  // for the player's own Drill list (collection.drillEntries) instead
  // of an auto-computed one. Uses freeLoopFamilyId rather than
  // activeFamilyId — a Drill entry needs to keep coming up over and
  // over (that's the whole point: a total count AND a best streak),
  // not disappear from the draw the first time it's landed the way
  // normal family "remaining" progress would.
  const DRILL_FAMILY_ID = "drill";
  const startDrillSession = (settings) => {
    const entries = collection.drillList.value.map((d) => d.entry);
    if (!entries.length) {
      return false;
    }
    const family = { id: DRILL_FAMILY_ID, name: "Drill", entries };
    const existingIndex = settings.customFamilies.findIndex((f) => f.id === DRILL_FAMILY_ID);
    if (existingIndex >= 0) {
      settings.customFamilies.splice(existingIndex, 1, family);
    } else {
      settings.customFamilies.push(family);
    }
    state.mode = "solo";
    state.lockedPairs = null;
    state.activeFamilyId = null;
    state.activeFamilyEntryIndex = null;
    state.activeFamilyIds = [];
    state.activeMixEntry = null;
    state.familyJustCompleted = null;
    state.careerJustCompleted = null;
    state.isCareerSession = false;
    state.freeLoopFamilyId = DRILL_FAMILY_ID;
    state.screen = "game";
    state.spinsTotal = Infinity;
    beginOrContinueSoloSession("Drill");
    nextSpin(settings);
    return true;
  };

  /** The "+ Drill" button on the draw screen — adds whatever trick is
   * currently showing, exactly as rolled, to the Drill list. Works in
   * every mode (a fixed Carrière/Famille entry included): the point is
   * "I want to grind specifically on this exact trick", regardless of
   * where it happened to come up. Returns null if it's already being
   * drilled or already mastered (see addDrillEntry). */
  const addCurrentTrickToDrill = () => {
    if (!state.spin) {
      return null;
    }
    return collection.addDrillEntry({
      trickName: state.spin.name,
      entry: collection.entryFromSpin(state.spin),
    });
  };

  // Resets every cross-mode "what's currently active" field before a
  // Combo run starts — same defensive clearing startFamilySession/
  // startMixSession already do, so nothing from whatever mode was
  // running before (a Career family, a personal family, Mix, VS...)
  // bleeds into Combo's own display or logic.
  function resetForCombo() {
    state.activeFamilyId = null;
    state.activeFamilyEntryIndex = null;
    state.activeFamilyIds = [];
    state.activeMixEntry = null;
    state.familyJustCompleted = null;
    state.careerJustCompleted = null;
    state.freeLoopFamilyId = null;
    state.lockedPairs = null;
    state.isCareerSession = false;
    if (state.sessionId) {
      collection.endSession(state.sessionId);
      backupApi.autoBackupIfDue();
      state.sessionId = null;
    }
  }

  /**
   * Combo via Carrière: walks the ENTIRE track (Normal or Switch) end
   * to end, every family back to back in tier order, no pause between
   * them. Returns false without starting anything if the track somehow
   * resolves to zero entries.
   */
  const startComboCareer = (track, settings) => {
    const path = familiesInTrackOrder(track).flatMap((family) =>
      family.entries.map((entry) => ({ familyId: family.id, familyName: family.name, entry }))
    );
    if (!path.length) {
      return false;
    }
    resetForCombo();
    state.mode = "combo";
    state.comboActive = true;
    state.comboSource = "career";
    state.comboTrack = track;
    state.comboPath = path;
    state.comboPathIndex = 0;
    state.comboFamilyIds = [];
    state.comboCurrentFamilyId = null;
    state.comboCurrentEntryIndex = null;
    state.comboChain = 0;
    state.comboTries = 1;
    state.comboRecap = null;
    state.screen = "game";
    state.spinsUsed = 0;
    state.spinsTotal = Infinity;
    state.sessionId = collection.startSession(
      `Combo — Carrière (${track === "normal" ? "Normal" : "Switch"})`
    );
    clearUndoSnapshot();
    nextComboSpin(settings);
    return true;
  };

  /**
   * Combo via Mix: draws randomly from the pooled entries of the
   * selected families (same buildMixPool Mix training itself uses),
   * with the 2-tries/lose-it-all rule layered on top. Returns false
   * without starting anything if the selection is empty or resolves to
   * no real families.
   */
  const startComboMix = (familyIds, settings) => {
    const ids = [...new Set(familyIds)].filter((id) => resolveFamilyById(id));
    if (!ids.length || !buildMixPool(ids).length) {
      return false;
    }
    resetForCombo();
    state.mode = "combo";
    state.comboActive = true;
    state.comboSource = "mix";
    state.comboTrack = null;
    state.comboPath = [];
    state.comboPathIndex = 0;
    state.comboFamilyIds = ids;
    state.comboCurrentFamilyId = null;
    state.comboCurrentEntryIndex = null;
    state.comboChain = 0;
    state.comboTries = 1;
    state.comboRecap = null;
    state.screen = "game";
    state.spinsUsed = 0;
    state.spinsTotal = Infinity;
    state.sessionId = collection.startSession(
      `Combo — Mix (${ids.map((id) => resolveFamilyById(id)?.name || "?").join(", ")})`
    );
    clearUndoSnapshot();
    nextComboSpin(settings);
    return true;
  };

  // The exact family entry the CURRENT combo spin was forced from —
  // career reads it straight off comboPath, mix reconstructs it from
  // the family + index remembered when that spin was drawn (see
  // nextComboSpin).
  function comboCurrentEntry() {
    if (state.comboSource === "career") {
      return state.comboPath[state.comboPathIndex]?.entry ?? null;
    }
    if (state.comboCurrentFamilyId && state.comboCurrentEntryIndex !== null) {
      const family = resolveFamilyById(state.comboCurrentFamilyId);
      return family ? family.entries[state.comboCurrentEntryIndex] : null;
    }
    return null;
  }

  /** Draws the next trick along the combo path/pool. Ends the run (as
   * a full clear, not a failure) in the vanishingly rare case a
   * Carrière combo actually reaches the end of the whole track, or a
   * Mix combo's pool somehow empties out. */
  function nextComboSpin(settings) {
    state.tries = 1;
    state.comboTries = 1;
    let forcedTrick = null;
    if (state.comboSource === "career") {
      const step = state.comboPath[state.comboPathIndex];
      if (!step) {
        finishComboRun({ cleared: true });
        return;
      }
      forcedTrick = step.entry;
      state.comboCurrentFamilyId = step.familyId;
      state.comboCurrentEntryIndex = null;
    } else {
      const pool = buildMixPool(state.comboFamilyIds);
      if (!pool.length) {
        finishComboRun({ cleared: true });
        return;
      }
      const picked = pool[Math.floor(Math.random() * pool.length)];
      const family = resolveFamilyById(picked.familyId);
      forcedTrick = family.entries[picked.index];
      state.comboCurrentFamilyId = picked.familyId;
      state.comboCurrentEntryIndex = picked.index;
    }
    state.spinsUsed += 1;
    state.spin = generateSpin(
      settings.tricks,
      [],
      null,
      settings.grinds,
      settings.switchUpGrinds,
      null,
      forcedTrick,
      settings.switchUp2Grinds
    );
    state.spinId += 1;
    state.phase = "spinning";
  }

  /** Combo: the player's attempt at the trick on screen — landed
   * extends the chain and draws the next one; a 2nd failed try in a
   * row ends the whole run right there. */
  const comboAttempt = (landed, settings) => {
    if (landed) {
      state.newBadges = collection.recordLand(
        state.spin,
        state.comboTries,
        state.sessionId,
        state.comboCurrentFamilyId,
        comboCurrentEntry()
      );
      state.comboChain += 1;
      if (state.comboSource === "career") {
        state.comboPathIndex += 1;
      }
      nextComboSpin(settings);
      return;
    }
    if (state.comboTries < 2) {
      state.comboTries += 1;
      return;
    }
    finishComboRun({ cleared: false });
  };

  /** Ends the current combo run (2nd failed try, whole track cleared,
   * or the player abandoning early via giveUp) — logs it to the Combo
   * history and shows the recap screen. */
  function finishComboRun({ cleared }) {
    const label =
      state.comboSource === "career"
        ? `Carrière — ${state.comboTrack === "normal" ? "Normal" : "Switch"}`
        : `Mix (${state.comboFamilyIds
            .map((id) => resolveFamilyById(id)?.name || "?")
            .join(", ")})`;
    const run = collection.recordComboRun({
      source: state.comboSource,
      label,
      chain: state.comboChain,
      // The trick showing when the run ended — the 2nd failed try (or
      // wherever the player abandoned) leaves state.spin pointing at
      // exactly that trick, since neither path draws a new one before
      // calling this. null for a full clear: there's no "failing
      // trick" to show, the whole path is done.
      endedOnTrick: cleared ? null : (state.spin?.name ?? null),
    });
    if (state.sessionId) {
      collection.endSession(state.sessionId);
      backupApi.autoBackupIfDue();
      state.lastSessionId = state.sessionId;
      state.sessionId = null;
    }
    state.comboActive = false;
    // track/familyIds aren't part of the persisted history record (see
    // recordComboRun) — kept here only so ComboRecapScreen's "Relancer"
    // can restart the exact same combo without the player having to
    // re-pick anything.
    state.comboRecap = {
      ...run,
      cleared,
      track: state.comboTrack,
      familyIds: state.comboFamilyIds,
    };
    state.screen = "comboRecap";
    state.phase = "idle";
  }

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

  /** VS: settings.vsRobotChance is the robot's GLOBAL chance (0-100) of
   * landing the trick within its 3 tries — more readable than a
   * per-attempt number. Converted here to the per-attempt probability
   * p that makes 1-(1-p)^3 equal that global chance, then rolled as 3
   * independent tries at p each; lands on the first success, or fails
   * all 3. See perAttemptVsChance in StartScreen.vue for the reverse
   * (shown to the person in parentheses next to the slider). */
  function rollRobot(settings) {
    const global = Math.min(100, Math.max(0, settings.vsRobotChance ?? 50)) / 100;
    const perAttempt = 1 - Math.pow(1 - global, 1 / 3);
    for (let i = 1; i <= 3; i++) {
      if (Math.random() < perAttempt) {
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
    if (playerLanded) {
      // BLADE VS feeds the same history as solo training — trick/
      // grind counts, Collection, badges, and this match's own session
      // row (see startGame's vs branch for where the session opened).
      // VS never uses landTrick() at all (this is its own resolution
      // path), so this has to happen here rather than there.
      const landFamilyId = state.activeMixEntry?.familyId ?? null;
      const landFamily = landFamilyId ? resolveFamilyById(landFamilyId) : null;
      const activeEntryForLand =
        landFamily && state.activeMixEntry ? landFamily.entries[state.activeMixEntry.index] : null;
      state.newBadges = collection.recordLand(
        state.spin,
        state.vsTries,
        state.sessionId,
        landFamilyId,
        activeEntryForLand
      );
    }
    const robot = rollRobot(settings);
    const [player, bot] = state.players;
    if (!playerLanded) {
      player.letters += 1;
    }
    if (!robot.landed) {
      bot.letters += 1;
    }
    if (player.letters >= LETTERS.length || bot.letters >= LETTERS.length) {
      endGame(settings);
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
    } else if (state.mode === "solo" && state.activeMixEntry) {
      const family = landFamily;
      if (family) {
        // Mix never trains Career — always the plain "::practice"
        // bucket, same one the single-family picker itself writes to.
        // Landing still advances/completes that family normally (and
        // still awards its badge the first time it's fully landed);
        // it just no longer removes anything from the draw — a family
        // being complete doesn't pause or shrink the Mix pool anymore.
        // (BLADE VS reuses this same activeMixEntry/activeFamilyIds
        // mechanism to restrict its own draw to chosen families, but
        // being mode "vs" and not "solo", it never lands here — VS
        // never writes to family progress.)
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

  const endGame = (settings = null) => {
    // A VS match closes out its session here too (win or lose) — same
    // history bookkeeping solo sessions get, just triggered by the
    // match actually finishing instead of "Terminer la session". Also
    // logs the match itself to its own history (see recordVsMatch) —
    // separate from the generic session row, same idea as Combo's own
    // dedicated history alongside its session bookkeeping.
    if (state.mode === "vs") {
      const [player, bot] = state.players;
      const result =
        player.letters === bot.letters
          ? "draw"
          : player.letters < bot.letters
            ? "win"
            : "loss";
      collection.recordVsMatch({
        playerLetters: player.letters,
        robotLetters: bot.letters,
        result,
        robotChance: settings?.vsRobotChance ?? null,
      });
      if (state.sessionId) {
        collection.endSession(state.sessionId);
        backupApi.autoBackupIfDue();
        state.lastSessionId = state.sessionId;
        state.sessionId = null;
      }
    }
    state.screen = "gameover";
    state.phase = "idle";
  };

  // Solo sessions have no game over: ending one shows the session
  // report instead of just bouncing back to the start screen.
  const giveUp = () => {
    clearUndoSnapshot();
    if (state.mode === "combo") {
      // Abandoning early is treated the same as a 2nd failed try —
      // whatever chain was built still gets logged to Combo history,
      // it just wasn't broken by a miss this time.
      finishComboRun({ cleared: false });
      return;
    }
    if (state.mode === "solo") {
      // Remember which setup screen this session actually came from,
      // for the report's own "Retour" button — a single family, Mix,
      // or just the plain solo setup.
      state.pendingReturnStep = state.activeFamilyIds.length
        ? "mix"
        : state.activeFamilyId
        ? "family"
        : "setup";
      if (state.sessionId) {
        collection.endSession(state.sessionId);
        backupApi.autoBackupIfDue();
        state.lastSessionId = state.sessionId;
        state.sessionId = null;
      }
      state.screen = "sessionReport";
      state.phase = "idle";
    } else if (state.mode === "vs") {
      // Quitting mid-match isn't the same as the match actually
      // finishing — skip the win/lose screen entirely and drop
      // straight back on VS's own setup screen (sliders and all).
      // Still closes out the session first so whatever was landed
      // before quitting isn't lost from the history.
      if (state.sessionId) {
        collection.endSession(state.sessionId);
        backupApi.autoBackupIfDue();
        state.lastSessionId = state.sessionId;
        state.sessionId = null;
      }
      state.pendingVsSetup = true;
      goToStart();
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
    isCombo,
    currentPlayer,
    onLastLetter,
    startGame,
    startReviewSession,
    startFamilySession,
    startMixSession,
    startWeakPointsSession,
    startDrillSession,
    addCurrentTrickToDrill,
    DRILL_FAMILY_ID,
    startComboCareer,
    startComboMix,
    comboAttempt,
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