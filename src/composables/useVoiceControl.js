import { ref, watch, onUnmounted } from "vue";
import { speakPhrase, isSpeaking } from "./useSpeech.js";

const CONFIRMATION_PHRASES = {
  land: "Trick validé !",
  skip: "Trick passé !",
  fail: "Raté, on recommence.",
  undo: "Annulé.",
};

// Kept short and forgiving on purpose — this listens to whatever's
// picked up around a skate spot (wind, wheels, other people), so a
// handful of natural ways to say each thing beats requiring one exact
// phrase. Matched as a plain substring after stripping accents, not a
// whole-word match, so a sentence like "ouais nickel c'est réussi"
// still triggers "land" through "réussi" alone.
// "yes" got dropped — too generic in ANY nearby conversation not
// aimed at the app. "ok" stays despite the same risk (kept on
// request).
const LAND_WORDS = ["blade", "reussi", "reussite", "valide", "ouais", "ok"];
const SKIP_WORDS = ["passe", "passer", "suivant"];
const FAIL_WORDS = ["rate", "loupe", "perdu", "encore"];
// Checked before FAIL_WORDS below — "annule"/"annulé" would otherwise
// also match "rate" through nothing in particular, but more
// importantly a misheard "annule" mustn't ever silently fall through
// to FAIL and record a wrong attempt instead of undoing one.
const UNDO_WORDS = ["annule", "annuler"];
// Just re-reads the trick currently on screen — doesn't touch game
// state at all, so a false trigger here is harmless (unlike the four
// above), but still checked ahead of LAND/SKIP/FAIL since none of
// their words overlap with these anyway and it's the same class of
// "meta" command as undo.
const REPEAT_WORDS = ["repete", "repeter", "redis"];

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (é -> e, etc.)
    .trim();
}

function matchAction(transcript) {
  const text = normalize(transcript);
  if (UNDO_WORDS.some((word) => text.includes(word))) return "undo";
  if (REPEAT_WORDS.some((word) => text.includes(word))) return "repeat";
  if (LAND_WORDS.some((word) => text.includes(word))) return "land";
  if (SKIP_WORDS.some((word) => text.includes(word))) return "skip";
  if (FAIL_WORDS.some((word) => text.includes(word))) return "fail";
  return null;
}

/**
 * Hands-free "réussi" / "raté, on rejoue" / "passer" / "répète" during
 * a solo session, via the browser's SpeechRecognition — so a phone
 * propped up on a ledge doesn't need touching between attempts.
 * Experimental: support and reliability vary a lot by browser
 * (notably Safari/iOS), so this degrades to `isSupported === false`
 * cleanly wherever the API just isn't there instead of throwing.
 */
export function useVoiceControl() {
  const SpeechRecognitionCtor =
    typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const isSupported = !!SpeechRecognitionCtor;

  const isListening = ref(false);
  const lastHeard = ref("");
  const lastAction = ref(null);
  const permissionDenied = ref(false);

  let recognition = null;
  let shouldRestart = false; // "the caller wants this listening right now"
  let pausedForVisibility = false; // internal-only: temporarily stopped because the page went to the background, not because the caller stopped wanting it
  let handlers = {};
  let stopWaitingForSpeech = null; // pending resumeListeningAfterSpeech watcher, if any

  // Turning the mic back on right when a confirmation phrase ends
  // isn't actually safe yet: landing/failing a trick also draws the
  // NEXT one and reads it aloud (speakTrick) a beat later, once the
  // reel-settle animation finishes — not necessarily speaking yet at
  // this exact instant, so isSpeaking alone can't be trusted without
  // a short buffer first. Waits BUFFER_MS for that read-aloud to
  // actually start, then (whether it did or not) waits for isSpeaking
  // to genuinely clear before starting the recognizer — so the mic
  // never opens on top of the app's own voice mid-sentence.
  const RESUME_BUFFER_MS = 350;
  function resumeListeningAfterSpeech() {
    stopWaitingForSpeech?.();
    stopWaitingForSpeech = null;
    const goLive = () => {
      shouldRestart = true;
      try {
        recognition.start();
        isListening.value = true;
      } catch {
        // Already running, or onend will pick it back up shortly.
      }
    };
    window.setTimeout(() => {
      if (!isSpeaking.value) {
        goLive();
        return;
      }
      stopWaitingForSpeech = watch(isSpeaking, (speaking) => {
        if (!speaking) {
          stopWaitingForSpeech?.();
          stopWaitingForSpeech = null;
          goLive();
        }
      });
    }, RESUME_BUFFER_MS);
  }

  function ensureRecognition() {
    if (recognition || !isSupported) {
      return;
    }
    recognition = new SpeechRecognitionCtor();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript ?? "";
      lastHeard.value = transcript;
      const action = matchAction(transcript);
      if (!action) {
        // Heard something, understood nothing — clear any PREVIOUS
        // match instead of leaving it displayed next to an unrelated
        // phrase (e.g. "réussi" sets lastAction to "land"; ambient
        // noise transcribed as something else right after shouldn't
        // still show "land" alongside it).
        lastAction.value = null;
        return;
      }
      lastAction.value = action;
      // The mic is still listening (continuous mode) — speaking the
      // confirmation without pausing it first risks the recognizer
      // picking its own voice back up through the phone speaker (e.g.
      // "validé" is also a LAND keyword) and re-triggering the same
      // action in a loop. Pause listening for the duration of the
      // phrase, then resume once it's actually done speaking.
      const wasListening = shouldRestart;
      if (wasListening) {
        shouldRestart = false;
        try {
          recognition.stop();
        } catch {
          // Already stopped.
        }
      }
      // Undo and Repeat are different from the other three: what's
      // worth saying back depends on what's actually happening (which
      // trick just came back on screen for undo, which one's already
      // there for repeat), not a fixed phrase decided up front — so
      // both run BEFORE speaking, not after like land/skip/fail below.
      let phrase = CONFIRMATION_PHRASES[action];
      if (action === "undo") {
        const resultingTrickName = handlers.onUndo?.();
        phrase = resultingTrickName
          ? `Annulé. ${resultingTrickName}.`
          : CONFIRMATION_PHRASES.undo;
      } else if (action === "repeat") {
        const trickName = handlers.onRepeat?.();
        phrase = trickName || "Aucun trick en cours.";
      }
      speakPhrase(phrase, () => {
        if (wasListening) {
          resumeListeningAfterSpeech();
        }
      });
      if (action === "land") handlers.onLand?.();
      else if (action === "skip") handlers.onSkip?.();
      else if (action === "fail") handlers.onFail?.();
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        permissionDenied.value = true;
        shouldRestart = false;
      }
      // Other errors (no-speech, aborted, network hiccups) are routine
      // during normal pauses between attempts — onend below handles
      // restarting, nothing to surface to the player for those.
    };

    // Browsers stop recognition on their own after a period of silence
    // or a fixed max duration — restart it transparently as long as
    // we're still supposed to be listening, so it feels continuous
    // from the player's side without them noticing the restarts.
    recognition.onend = () => {
      isListening.value = false;
      if (shouldRestart) {
        try {
          recognition.start();
          isListening.value = true;
        } catch {
          // Already running, or restarted too quickly — onend will
          // fire again shortly regardless.
        }
      }
    };
  }

  // Leaving the app (switching apps, locking the phone, backgrounding
  // the tab) doesn't unmount GameScreen — it's still the active Vue
  // component, just not visible — so onUnmounted below never fires
  // and the mic would otherwise keep listening (and keep the OS-level
  // "microphone in use" indicator lit) for no reason. This explicitly
  // stops it the moment the page is hidden, and picks back up on
  // return — but only if it was actually still supposed to be
  // listening, not unconditionally.
  function handleVisibilityChange() {
    if (typeof document === "undefined" || !recognition) {
      return;
    }
    if (document.hidden) {
      if (shouldRestart) {
        pausedForVisibility = true;
        shouldRestart = false; // keep onend from racing to restart it below
        try {
          recognition.stop();
        } catch {
          // Already stopped.
        }
        isListening.value = false;
      }
    } else if (pausedForVisibility) {
      pausedForVisibility = false;
      shouldRestart = true;
      try {
        recognition.start();
        isListening.value = true;
      } catch {
        // Already running, or onend will pick it back up shortly.
      }
    }
  }

  let visibilityHandlerAttached = false;
  function attachVisibilityHandler() {
    if (visibilityHandlerAttached || typeof document === "undefined") {
      return;
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    // Extra safety net for an outright close/reload (not just a
    // background/foreground switch) — makes sure the mic doesn't
    // stay "in use" for the brief moment before the page actually
    // tears down.
    window.addEventListener("pagehide", stop);
    visibilityHandlerAttached = true;
  }

  function detachVisibilityHandler() {
    if (!visibilityHandlerAttached || typeof document === "undefined") {
      return;
    }
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", stop);
    visibilityHandlerAttached = false;
  }

  function start({ onLand, onSkip, onFail, onUndo, onRepeat } = {}) {
    if (!isSupported) {
      return;
    }
    handlers = { onLand, onSkip, onFail, onUndo, onRepeat };
    permissionDenied.value = false;
    ensureRecognition();
    attachVisibilityHandler();
    shouldRestart = true;
    pausedForVisibility = false;
    try {
      recognition.start();
      isListening.value = true;
    } catch {
      // Already started.
    }
  }

  function stop() {
    shouldRestart = false;
    pausedForVisibility = false;
    stopWaitingForSpeech?.();
    stopWaitingForSpeech = null;
    detachVisibilityHandler();
    try {
      recognition?.stop();
    } catch {
      // Already stopped.
    }
    isListening.value = false;
  }

  onUnmounted(stop);

  return { isSupported, isListening, lastHeard, lastAction, permissionDenied, start, stop };
}