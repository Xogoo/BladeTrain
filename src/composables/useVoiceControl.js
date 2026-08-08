import { ref, onUnmounted } from "vue";
import { speakPhrase } from "./useSpeech.js";

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
const LAND_WORDS = ["blade", "reussi", "reussite", "valide", "ouais", "yes", "ok"];
const SKIP_WORDS = ["passe", "passer", "suivant"];
const FAIL_WORDS = ["rate", "loupe", "perdu", "encore"];
// Checked before FAIL_WORDS below — "annule"/"annulé" would otherwise
// also match "rate" through nothing in particular, but more
// importantly a misheard "annule" mustn't ever silently fall through
// to FAIL and record a wrong attempt instead of undoing one.
const UNDO_WORDS = ["annule", "annuler"];

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
  if (LAND_WORDS.some((word) => text.includes(word))) return "land";
  if (SKIP_WORDS.some((word) => text.includes(word))) return "skip";
  if (FAIL_WORDS.some((word) => text.includes(word))) return "fail";
  return null;
}

/**
 * Hands-free "réussi" / "raté, on rejoue" / "passer" during a solo
 * session, via the browser's SpeechRecognition — so a phone propped up
 * on a ledge doesn't need touching between attempts. Experimental:
 * support and reliability vary a lot by browser (notably Safari/iOS),
 * so this degrades to `isSupported === false` cleanly wherever the API
 * just isn't there instead of throwing.
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
      // Undo is different from the other three: what's worth saying
      // back depends on what actually happens when it runs (which
      // trick is back on screen), not a fixed phrase decided up
      // front — so it has to run BEFORE speaking, not after like
      // land/skip/fail below.
      let phrase = CONFIRMATION_PHRASES[action];
      if (action === "undo") {
        const resultingTrickName = handlers.onUndo?.();
        phrase = resultingTrickName
          ? `Annulé. ${resultingTrickName}.`
          : CONFIRMATION_PHRASES.undo;
      }
      speakPhrase(phrase, () => {
        if (wasListening) {
          shouldRestart = true;
          try {
            recognition.start();
            isListening.value = true;
          } catch {
            // Already running, or onend will pick it back up shortly.
          }
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

  function start({ onLand, onSkip, onFail, onUndo } = {}) {
    if (!isSupported) {
      return;
    }
    handlers = { onLand, onSkip, onFail, onUndo };
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