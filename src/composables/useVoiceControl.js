import { ref, onUnmounted } from "vue";

// Kept short and forgiving on purpose — this listens to whatever's
// picked up around a skate spot (wind, wheels, other people), so a
// handful of natural ways to say each thing beats requiring one exact
// phrase. Matched as a plain substring after stripping accents, not a
// whole-word match, so a sentence like "ouais nickel c'est réussi"
// still triggers "land" through "réussi" alone.
const LAND_WORDS = ["blade", "reussi", "reussite", "valide", "ouais", "yes", "ok"];
const SKIP_WORDS = ["passe", "passer", "suivant"];
const FAIL_WORDS = ["rate", "loupe", "perdu", "encore"];

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (é -> e, etc.)
    .trim();
}

function matchAction(transcript) {
  const text = normalize(transcript);
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
  let shouldRestart = false;
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

  function start({ onLand, onSkip, onFail } = {}) {
    if (!isSupported) {
      return;
    }
    handlers = { onLand, onSkip, onFail };
    permissionDenied.value = false;
    ensureRecognition();
    shouldRestart = true;
    try {
      recognition.start();
      isListening.value = true;
    } catch {
      // Already started.
    }
  }

  function stop() {
    shouldRestart = false;
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