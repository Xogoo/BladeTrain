<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import AppIcon from "./components/AppIcon.vue";
import ScoreBoard from "./components/ScoreBoard.vue";
import StartScreen from "./components/StartScreen.vue";
import GameScreen from "./components/GameScreen.vue";
import GameOverScreen from "./components/GameOverScreen.vue";
import SessionReportScreen from "./components/SessionReportScreen.vue";
import CareerCompleteScreen from "./components/CareerCompleteScreen.vue";
import ComboRecapScreen from "./components/ComboRecapScreen.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import TricktionaryPanel from "./components/TricktionaryPanel.vue";
import AboutPanel from "./components/AboutPanel.vue";
import CollectionPanel from "./components/CollectionPanel.vue";
import SessionHistoryPanel from "./components/SessionHistoryPanel.vue";
import { useGame } from "./composables/useGame.js";
import { useSettings } from "./composables/useSettings.js";
import { useSpeech } from "./composables/useSpeech.js";
import { useBackup } from "./composables/useBackup.js";
import { computeAccentPalette, computeAccentGlow } from "./game/accentPalette.js";

const { state, goToStart, closeStaleSessionIfNeeded } = useGame();
const { settings } = useSettings();
const { autoBackupIfDue } = useBackup();

// A solo session left dangling open from a previous day (forgot to tap
// "Terminer la session") gets quietly closed out the next time the
// Start screen is shown — there's no way to run code while the app is
// closed, so this is the closest honest equivalent to "at midnight".
watch(
  () => state.screen,
  (screen) => {
    if (screen === "start") {
      closeStaleSessionIfNeeded();
    }
  },
  { immediate: true }
);

// Real light/dark palette swap — see .theme-inverted in base.css. Lives
// on <body> since it needs to cover the ambient background gradient
// too, which is painted on body, outside this component.
watch(
  () => settings.invertedTheme,
  (inverted) => document.body.classList.toggle("theme-inverted", inverted),
  { immediate: true }
);

// Accent color: "mono" is the default black & white look, no CSS
// properties to set at all (just clears any previously-applied custom
// ones). "custom" computes a full palette from the chosen hue (see the
// color wheel in Réglages and game/accentPalette.js) and sets it as
// inline custom properties on <body> — any of the 360° is selectable,
// so this can't be a fixed set of body.accent-* classes like it used
// to be. Recomputed whenever the hue OR the light/dark theme changes,
// since the palette differs between the two.
const ACCENT_PROPERTIES = [
  "--red",
  "--red-hi",
  "--red-deep",
  "--cta-text",
  "--glow-red",
  "--glow-red-hi",
];
watch(
  [
    () => settings.accentColor,
    () => settings.accentHue,
    () => settings.accentSaturation,
    () => settings.invertedTheme,
  ],
  ([accent, hue, saturation, inverted]) => {
    if (accent !== "custom") {
      for (const prop of ACCENT_PROPERTIES) {
        document.body.style.removeProperty(prop);
      }
      return;
    }
    const palette = computeAccentPalette(hue, inverted, saturation);
    const glow = computeAccentGlow(palette, inverted);
    document.body.style.setProperty("--red", palette.red);
    document.body.style.setProperty("--red-hi", palette.redHi);
    document.body.style.setProperty("--red-deep", palette.redDeep);
    document.body.style.setProperty("--cta-text", palette.ctaText);
    document.body.style.setProperty("--glow-red", glow.glowRed);
    document.body.style.setProperty("--glow-red-hi", glow.glowRedHi);
  },
  { immediate: true }
);

// All audio (speech samples, announcer, title music) is decoded before
// the app shows, behind an intro screen of at least INTRO_MIN_MS.
const {
  speechState,
  preloadSpeech,
  stopSpeech,
  startMusic,
  fadeOutMusic,
  unlockAudio,
} = useSpeech();
preloadSpeech();

// Panel deep links: ?panel=tricktionary (the tricktionary.html redirect)
// or a bare /tricktionary path. They skip the intro entirely — there is
// no start button, so audio stays locked until the first click inside
// the app (playKeys resumes the AudioContext itself).
const PANELS = ["settings", "tricktionary", "collection", "about", "history"];
const requestedPanel = [
  new URLSearchParams(window.location.search).get("panel"),
  window.location.pathname
    .replace(/\/$/, "")
    .split("/")
    .pop()
    .replace(/\.html$/, ""),
].find((key) => PANELS.includes(key));

const INTRO_MIN_MS = 2000;
const introTimeDone = ref(false);
const started = ref(Boolean(requestedPanel));

// Browsers block audio until a user gesture, so the intro ends with a
// START button: clicking it unlocks the AudioContext, starts the title
// music and fades the game in.
const showStart = computed(() => speechState.ready && introTimeDone.value);
const showApp = computed(() => started.value);

function start() {
  started.value = true;
  // resume the AudioContext; start the music only if enabled in settings
  unlockAudio(settings.introMusic);
}

// Switching the setting off while the music plays silences it right away.
watch(
  () => settings.introMusic,
  (enabled) => !enabled && fadeOutMusic(0.5)
);

// While the game fades in, transient transforms would overflow the
// viewport and flash a scrollbar. Clip the page until it settles.
function lockScroll() {
  document.documentElement.style.overflow = "clip";
}
function unlockScroll() {
  document.documentElement.style.overflow = "";
}

// The loading counter always animates from 0 to the asset total across
// the intro (at least 2s), never running ahead of what actually loaded.
const displayedCount = ref(0);
function animateCounter(startedAt) {
  const progress = Math.min((performance.now() - startedAt) / INTRO_MIN_MS, 1);
  displayedCount.value = Math.min(
    Math.floor(progress * speechState.total),
    speechState.loaded
  );
  if (!showApp.value) {
    requestAnimationFrame(() => animateCounter(startedAt));
  }
}

// Any button press in the game cuts running speech short (capture
// phase, so the stop happens before the button's own handler, which
// may speak again, like the replay button) AND checks whether today's
// automatic backup is still due (see useBackup.js's autoBackupIfDue —
// it's a cheap same-day string check, so calling it on every single
// tap costs nothing; the actual backup work only ever runs once a
// day). Piggybacking here means the FIRST tap of the day anywhere in
// the app triggers it — not just finishing a training session — since
// a day where the player only checks the Historique or Réglages
// should still get backed up. The intro music is NOT touched here —
// it keeps playing through the toolbar panels and only fades when a
// mode is chosen (see StartScreen).
function onGlobalButtonClick(event) {
  if (!event.target.closest("button")) {
    return;
  }
  if (showApp.value) {
    stopSpeech();
  }
  autoBackupIfDue();
}

onMounted(() => {
  setTimeout(() => (introTimeDone.value = true), INTRO_MIN_MS);
  animateCounter(performance.now());
  document.addEventListener("click", onGlobalButtonClick, true);
});
onUnmounted(() => {
  document.removeEventListener("click", onGlobalButtonClick, true);
});

// 'settings' | 'tricktionary' | 'collection' | 'about' | 'history' | null;
// seeded from the deep link, if any (see top of script).
const openPanel = ref(requestedPanel ?? null);
</script>

<template>
  <div class="landscape-lock" role="alert">
    <span class="landscape-lock__icon" aria-hidden="true">&#8635;</span>
    Tourne ton téléphone en mode portrait pour continuer.
  </div>

  <transition name="intro-out">
    <div v-if="!showApp" class="app-loading">
      <div class="app-loading__logo-mark" aria-hidden="true" />
      <span class="app-loading__logo-text">BLADE</span>
      <button v-if="showStart" class="btn btn--go app-loading__start" @click="start()">
        <AppIcon name="play" :size="20" /> Démarrer
      </button>
      <template v-else>
        <span class="app-loading__spinner" aria-hidden="true" />
        <p class="app-loading__text">
          Chargement&hellip; {{ displayedCount }}/{{ speechState.total }}
          </p>
      </template>
    </div>
  </transition>

  <transition
    name="intro-in"
    appear
    @enter="lockScroll"
    @after-enter="unlockScroll"
  >
  <div v-if="showApp" class="app-shell">
  <header v-if="state.screen !== 'start' && !(settings.focusMode && state.screen === 'game')" class="app-header">
    <button class="app-header__logo" aria-label="Accueil" @click="goToStart()">
      <span class="app-header__logo-text">BLADE</span>
    </button>
    <ScoreBoard />
  </header>

  <main class="app-main">
    <StartScreen
      v-if="state.screen === 'start'"
      @open-settings="openPanel = 'settings'"
    />
    <GameScreen v-else-if="state.screen === 'game'" />
    <SessionReportScreen v-else-if="state.screen === 'sessionReport'" />
    <CareerCompleteScreen v-else-if="state.screen === 'careerComplete'" />
    <ComboRecapScreen v-else-if="state.screen === 'comboRecap'" />
    <GameOverScreen v-else />
  </main>

  <nav v-if="state.screen !== 'game'" class="app-nav">
    <button
      class="app-nav__btn"
      :disabled="state.phase === 'spinning'"
      @click="openPanel = 'settings'"
    >
      <AppIcon name="settings" /><span>Réglages</span>
    </button>
    <button
      class="app-nav__btn"
      :disabled="state.phase === 'spinning'"
      @click="openPanel = 'tricktionary'"
    >
      <AppIcon name="book" /><span>Tricktionary</span>
    </button>
    <button
      class="app-nav__btn"
      :disabled="state.phase === 'spinning'"
      @click="openPanel = 'collection'"
    >
      <AppIcon name="trophy" /><span>Collection</span>
    </button>
    <button
      class="app-nav__btn"
      :disabled="state.phase === 'spinning'"
      @click="openPanel = 'history'"
    >
      <AppIcon name="list" /><span>Historique</span>
    </button>
    <button
      class="app-nav__btn"
      :disabled="state.phase === 'spinning'"
      @click="openPanel = 'about'"
    >
      <AppIcon name="info" /><span>Comment jouer</span>
    </button>
  </nav>

  <SettingsPanel v-if="openPanel === 'settings'" @close="openPanel = null" />
  <TricktionaryPanel v-if="openPanel === 'tricktionary'" @close="openPanel = null" />
  <CollectionPanel v-if="openPanel === 'collection'" @close="openPanel = null" />
  <SessionHistoryPanel v-if="openPanel === 'history'" @close="openPanel = null" />
  <AboutPanel v-if="openPanel === 'about'" @close="openPanel = null" />
  </div>
  </transition>
</template>

<style scoped>
/* No web API can actually LOCK orientation on iOS (Safari, and
   Add-to-Home-Screen PWAs, ignore both the Screen Orientation API and
   the manifest's "orientation" field — a longstanding platform gap,
   not something fixable from here). This is the reliable fallback
   every mobile web app uses instead: a fullscreen block that only
   shows up in landscape, on phone-sized screens specifically (the
   max-height guard keeps this from ever firing on a wide desktop
   browser window, which is technically "landscape" too but obviously
   not a phone turned sideways). Hidden by default; note this can't
   live in a normal v-if/computed the rest of the app uses, since it
   has to react to the DEVICE rotating, not any app state — a pure CSS
   media query is both simpler and instant, no orientationchange
   listener needed.
   For the native (Capacitor) iOS build specifically, this can be
   locked properly at the OS level instead — set "Supported interface
   orientations" to Portrait only in Xcode/Info.plist, which is outside
   what this web source can reach. */
.landscape-lock {
  display: none;
}

@media (orientation: landscape) and (max-height: 500px) {
  .landscape-lock {
    display: flex;
    position: fixed;
    inset: 0;
    z-index: 9999;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px;
    text-align: center;
    background: #050505;
    color: #f4f4f4;
    font-family: var(--font-display, sans-serif);
    font-size: 16px;
  }
}

.landscape-lock__icon {
  font-size: 40px;
  animation: landscape-lock-spin 1.6s ease-in-out infinite;
}

@keyframes landscape-lock-spin {
  0%,
  100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(-90deg);
  }
}

.app-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

/* intro: loading screen dissolves, the game fades and scales in */
.intro-out-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.intro-out-leave-to {
  opacity: 0;
  transform: scale(1.06);
}

.intro-in-enter-active {
  transition: opacity 0.9s ease, transform 0.9s cubic-bezier(0.22, 1.2, 0.36, 1);
}

/* scale only — a translateY here would push the 100dvh shell past the
   viewport and flash a scrollbar */
.intro-in-enter-from {
  opacity: 0;
  transform: scale(0.94);
}

.app-loading__logo-mark {
  width: min(200px, 55vw);
  aspect-ratio: 700 / 656;
  margin-bottom: 10px;
  -webkit-mask-image: url(/img/blade-skater-silhouette.png);
  mask-image: url(/img/blade-skater-silhouette.png);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  background-color: var(--red-hi, #ffffff);
}

body.theme-inverted .app-loading__logo-mark {
  background-color: var(--red-hi, #000000);
}

.app-loading__logo-text {
  font-family: var(--font-display);
  font-size: clamp(52px, 15vw, 88px);
  font-weight: 900;
  letter-spacing: 0.06em;
  color: var(--red-hi, var(--text));
  animation: intro-logo-pulse 1.6s ease-in-out infinite;
}

.app-loading__start {
  font-size: 18px;
  padding: 16px 44px;
}

@keyframes intro-logo-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 12px rgba(var(--fg-rgb), 0.25));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 34px rgba(var(--fg-rgb), 0.6));
    transform: scale(1.03);
  }
}

.app-loading {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  background:
    radial-gradient(700px 420px at 50% 40%, rgba(var(--fg-rgb), 0.12), transparent 65%),
    var(--bg-0);
}

.app-loading__spinner {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 4px solid rgba(var(--fg-rgb), 0.2);
  border-top-color: var(--red);
  box-shadow: 0 0 18px rgba(var(--fg-rgb), 0.25);
  animation: app-loading-spin 0.9s linear infinite;
}

.app-loading__text {
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
}

@keyframes app-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

.app-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: calc(env(safe-area-inset-top) + 16px) 16px 6px;
  flex-shrink: 0;
}

.app-header__logo-text {
  display: inline-block;
  height: 34px;
  line-height: 34px;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: var(--text);
  filter: drop-shadow(0 0 14px rgba(var(--fg-rgb), 0.45));
}

.app-main {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.app-nav {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, transparent, rgba(var(--bg-0-rgb), 0.92) 35%);
  flex-wrap: wrap;
}

.app-nav__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 84px;
  padding: 9px 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel);
  backdrop-filter: blur(8px);
  color: var(--text-dim);
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.app-nav__btn:hover {
  color: var(--red-hi);
  border-color: var(--red-hi);
  box-shadow: var(--glow-red-hi);
}

.app-nav__btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}

/* small phones: icons only, the labels don't fit */
@media (max-width: 480px) {
  .app-nav__btn span {
    display: none;
  }

  .app-nav__btn {
    min-width: 58px;
    padding: 11px 0;
  }
}
</style>