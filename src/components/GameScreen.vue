<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import AppIcon from "./AppIcon.vue";
import SlotReel from "./SlotReel.vue";
import TrickExplainPanel from "./TrickExplainPanel.vue";
import TrickListPanel from "./TrickListPanel.vue";
import FamilyChecklistPanel from "./FamilyChecklistPanel.vue";
import { LETTERS, useGame } from "../composables/useGame.js";
import { useSettings } from "../composables/useSettings.js";
import { useSpeech } from "../composables/useSpeech.js";
import { useCollection } from "../composables/useCollection.js";

const REEL_STAGGER_MS = 320;

// The 320ms stagger between reels is fine at normal/slow speeds, but at
// very fast settings it would dominate the total time (6 reels × 320ms
// = ~1.6s minimum, regardless of how fast each individual reel spins).
// Scaling it down proportionally for fast base speeds keeps "Instant"
// actually instant across the whole machine, while leaving the
// existing slower presets exactly as they were (anything 800ms or
// slower already computes to >= 320ms here).
function staggerFor(baseMs) {
  return Math.min(REEL_STAGGER_MS, baseMs * 0.4);
}

const {
  state,
  isSolo,
  currentPlayer,
  onLastLetter,
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
  giveUp,
  onReelsSettled,
  activeFamily,
} = useGame();
const { settings, reelSpeedMs } = useSettings();
const { speakTrick, playKeys } = useSpeech();
const { familyIndex } = useCollection();

// Switch families carry their own leading "Switch " prefix (see
// families.js) — nothing to strip here anymore, kept as a pass-through
// in case a suffix-style annotation ever comes back.
function familyBaseName(name) {
  return name.replace(/ \((Normal|Switch)\)$/, "");
}

const nextFamilyPreview = computed(() =>
  state.familyJustCompleted ? nextFamilyInOrder(state.familyJustCompleted) : null
);

// Group: a game starts with the "fight!" call.
onMounted(() => {
  if (!isSolo.value) {
    playKeys(["fight"]);
  }
});

const openPanel = ref(null); // 'explain' | 'tricklist' | 'familyChecklist' | null
const stoppedReels = ref(0);

onUnmounted(() => {
  window.clearTimeout(settleFailsafeTimer);
});

// Read the trick aloud once the reels have settled.
watch(
  () => state.phase,
  (phase) => {
    if (phase === "result" && state.spin) {
      speakTrick(state.spin.name);
    }
  }
);

// Badges earned by the last landed trick pop up as a short toast.
// "Terminer la session/partie" needs a tap-again-to-confirm, same
// pattern as the reset buttons elsewhere — too easy to hit by accident
// mid-session otherwise, and there's no undo once it's ended.
const confirmingEndSession = ref(false);
function onEndSessionClick() {
  if (!confirmingEndSession.value) {
    confirmingEndSession.value = true;
    return;
  }
  confirmingEndSession.value = false;
  giveUp();
}

// Badges earned in the same spin used to all stack on screen together
// (with just a staggered slam-in animation) — now they queue up and
// show one at a time, each getting its own full 4.5s, so a big
// multi-badge moment doesn't turn into a wall of overlapping stamps.
const badgeToast = ref([]); // always 0 or 1 badge, kept as an array so the template (v-for) doesn't need to change
let badgeQueue = [];
let badgeToastTimer = null;

function showNextBadge() {
  if (badgeQueue.length === 0) {
    badgeToast.value = [];
    return;
  }
  badgeToast.value = [badgeQueue.shift()];
  window.clearTimeout(badgeToastTimer);
  badgeToastTimer = window.setTimeout(showNextBadge, 4500);
}

watch(
  () => state.newBadges,
  (badges) => {
    if (!badges.length) {
      return;
    }
    badgeQueue = badgeQueue.concat(badges);
    // Only kick off the queue if nothing is currently showing — if a
    // badge is already mid-display, it'll pick up the new arrivals on
    // its own timer chain once it's done.
    if (badgeToast.value.length === 0) {
      showNextBadge();
    }
  }
);

const visibleReels = computed(() =>
  state.spin ? state.spin.reels.filter((reel) => !reel.hidden) : []
);
const isResult = computed(() => state.phase === "result");

// Roster info for group mode: whether a player already attempted the
// current trick, is up now, or is out of the game.
function playerStatus(index) {
  const pos = state.turnOrder.indexOf(index);
  if (state.players[index].letters >= LETTERS.length) {
    return "out";
  }
  if (pos === -1) {
    return "waiting";
  }
  if (pos < state.turnPos) {
    return "done";
  }
  return pos === state.turnPos ? "up" : "waiting";
}

function lettersOf(player) {
  return LETTERS.slice(0, player.letters).split("").join(" ");
}

let settleFailsafeTimer = null;
watch(
  () => state.spinId,
  () => {
    stoppedReels.value = 0;
    openPanel.value = null;
    // Safety net: normally every visible reel's "stopped" event adds up
    // to onReelsSettled() flipping the phase to "result". If that chain
    // ever doesn't complete for any reason — e.g. resuming a session
    // right after returning from the Start screen, where the component
    // remounts fresh mid-flight — the result screen (and its Blade!/
    // Passer buttons, and the bottom nav, which stays disabled while
    // phase is "spinning") would otherwise never come back, leaving the
    // session stuck with no way to continue. This forces it through
    // once a generous margin past the reels' own total spin time has
    // passed, regardless of what actually went wrong upstream.
    // `immediate: true` matters here specifically for that remount
    // case: state.spinId was already bumped by the nextSpin() call
    // that happened just before this component (re)mounted, so without
    // it this watcher would only ever arm for the *next* spin and miss
    // arming for the one already in flight when the session resumed.
    window.clearTimeout(settleFailsafeTimer);
    const maxSettleMs = reelSpeedMs() * 4 + 4000;
    settleFailsafeTimer = window.setTimeout(() => {
      if (state.phase === "spinning") {
        onReelsSettled();
      }
    }, maxSettleMs);
  },
  { immediate: true }
);

function onReelStopped() {
  stoppedReels.value += 1;
  if (stoppedReels.value >= visibleReels.value.length) {
    onReelsSettled();
  }
}
</script>

<template>
  <section class="game" :class="{ 'game--focus': settings.focusMode }">
    <button
      v-if="!settings.focusMode"
      class="btn btn--ghost game__back"
      :class="{ 'btn--confirm': confirmingEndSession }"
      @click="onEndSessionClick()"
      @blur="confirmingEndSession = false"
    >
      &lsaquo; {{ confirmingEndSession ? "Retape pour confirmer" : "Retour" }}
    </button>

    <button
      v-if="!settings.focusMode"
      class="focus-enter-btn"
      @click="settings.focusMode = true"
    >
      <AppIcon name="zap" :size="14" /> Mode Focus
    </button>

    <button
      v-if="settings.focusMode"
      class="focus-exit-btn"
      @click="settings.focusMode = false"
    >
      <AppIcon name="close" :size="14" /> Quitter le mode Focus
    </button>

    <button
      v-if="settings.focusMode"
      class="btn btn--ghost focus-end-btn"
      :class="{ 'btn--confirm': confirmingEndSession }"
      @click="onEndSessionClick()"
      @blur="confirmingEndSession = false"
    >
      <AppIcon name="flag" :size="13" />
      {{ confirmingEndSession ? "Retape pour confirmer" : "Terminer la session" }}
    </button>

    <button
      v-if="settings.focusMode && activeFamily"
      class="focus-family-progress"
      @click="openPanel = 'familyChecklist'"
    >
      {{ familyIndex(activeFamily.id) }}/{{ activeFamily.entries.length }} tricks réussis
    </button>

    <div v-if="!isSolo" class="roster">
      <div
        v-for="(player, i) in state.players"
        :key="i"
        class="roster__chip panel"
        :class="`roster__chip--${playerStatus(i)}`"
      >
        <AppIcon
          v-if="i === state.turnOrder[0]"
          name="play"
          :size="10"
          title="Commence ce tour"
        />
        <span class="roster__name">{{ player.name }}</span>
        <span class="roster__letters">{{ lettersOf(player) || "—" }}</span>
      </div>
    </div>

    <transition name="result">
      <div v-if="isResult" class="result">
        <div class="result__name sticker-text">
          {{ state.spin.name }}
          <button
            class="result__speak"
            aria-label="Lire le trick à voix haute"
            @click="speakTrick(state.spin.name)"
          >
            <AppIcon name="sound" :size="20" />
          </button>
        </div>

        <button v-if="canUndo" class="undo-btn" @click="undoLastAction()">
          <AppIcon name="forward" :size="14" style="transform: scaleX(-1)" /> Annuler
          {{ isSolo ? "le dernier trick" : "la dernière action" }}
        </button>

        <!-- solo: land or skip, build the collection -->
        <template v-if="isSolo">
          <template v-if="state.familyJustCompleted">
            <div class="family-pause">
              <AppIcon name="trophy" :size="26" />
              <h3 class="family-pause__title">
                Famille {{ familyBaseName(state.familyJustCompleted.name) }} complétée !
              </h3>
            </div>
            <div class="result__actions">
              <button
                v-if="nextFamilyPreview"
                class="btn btn--go"
                @click="nextCareerFamily(settings)"
              >
                <AppIcon name="forward" :size="18" /> Famille suivante :
                {{ familyBaseName(nextFamilyPreview.name) }}
              </button>
              <button class="btn" @click="continueFreePlay(settings)">
                <AppIcon name="play" :size="18" /> Continuer en solo libre
              </button>
            </div>
            <div class="result__actions result__actions--secondary">
              <button
                class="btn btn--ghost"
                :class="{ 'btn--confirm': confirmingEndSession }"
                @click="onEndSessionClick()"
                @blur="confirmingEndSession = false"
              >
                <AppIcon name="flag" :size="16" />
                {{ confirmingEndSession ? "Retape pour confirmer" : "Terminer la session" }}
              </button>
            </div>
          </template>

          <template v-else>
            <div class="result__score">
              <AppIcon name="zap" :size="18" />
              {{ state.spin.score }} point{{ state.spin.score === 1 ? "" : "s" }}
            </div>

            <!-- attempt counter: tap once per failed real-life try before
                 you finally land it (or skip). Doesn't reroll anything. -->
            <div class="result__tries">
              <span class="result__tries-label">
                Essai {{ state.tries }}{{ state.tries > 1 ? ` (${state.tries - 1} raté${state.tries - 1 === 1 ? "" : "s"})` : "" }}
              </span>
              <button class="btn btn--ghost result__tries-btn" @click="addTry()">
                <AppIcon name="forward" :size="14" /> Raté, on rejoue
              </button>
            </div>

            <div class="result__actions">
              <button class="btn" @click="openPanel = 'explain'">
                <AppIcon name="question" :size="18" /> Explication
              </button>
              <button class="btn" @click="skipTrick(settings)">
                <AppIcon name="forward" :size="18" /> Passer
              </button>
              <button class="btn btn--go" @click="landTrick(settings)">
                <AppIcon name="check" :size="18" /> Blade! +{{ state.spin.score }}
              </button>
            </div>
            <div class="result__actions result__actions--secondary">
              <button
                class="btn btn--ghost"
                :class="{ 'btn--confirm': confirmingEndSession }"
                @click="onEndSessionClick()"
                @blur="confirmingEndSession = false"
              >
                <AppIcon name="flag" :size="16" />
                {{ confirmingEndSession ? "Retape pour confirmer" : "Terminer la session" }}
              </button>
              <button
                class="btn btn--ghost"
                :disabled="state.tricks.length + state.skipped.length === 0"
                @click="openPanel = 'tricklist'"
              >
                <AppIcon name="list" :size="16" /> Liste des tricks ({{ state.tricks.length }})
              </button>
            </div>
          </template>
        </template>

        <!-- group: every player attempts the same trick, bails cost a letter -->
        <template v-else>
          <div class="result__turn">
            <span class="result__turn-name">{{ currentPlayer?.name }}</span> — à
            toi de jouer !
            <span v-if="onLastLetter" class="result__last">dernière lettre !</span>
          </div>

          <div class="result__actions">
            <button class="btn" @click="openPanel = 'explain'">
              <AppIcon name="question" :size="18" /> Explication
            </button>
            <!-- only the turn's starting player may swap the trick -->
            <button
              v-if="state.turnPos === 0"
              class="btn"
              :disabled="state.rerollsLeft <= 0"
              @click="rerollTrick(settings)"
            >
              <AppIcon name="forward" :size="18" /> Nouveau trick ({{
                state.rerollsLeft
              }})
            </button>
            <button class="btn" @click="attempt(false, settings)">
              <AppIcon name="flag" :size="18" /> Loupé
            </button>
            <button class="btn btn--go" @click="attempt(true, settings)">
              <AppIcon name="check" :size="18" /> Réussi
            </button>
          </div>
          <div class="result__actions result__actions--secondary">
            <button
              class="btn btn--ghost"
              :class="{ 'btn--confirm': confirmingEndSession }"
              @click="onEndSessionClick()"
              @blur="confirmingEndSession = false"
            >
              <AppIcon name="flag" :size="16" />
              {{ confirmingEndSession ? "Retape pour confirmer" : "Terminer la partie" }}
            </button>
          </div>
        </template>
      </div>
    </transition>

    <div v-if="settings.focusMode && !isResult" class="focus-spinning">
      Ça tourne&hellip;
    </div>

    <div class="machine panel">
      <div class="machine__lights" aria-hidden="true">
        <span v-for="i in 14" :key="i" :style="{ '--i': i }" />
      </div>

      <div class="machine__reels">
        <SlotReel
          v-for="(reel, index) in visibleReels"
          :key="reel.name"
          :label="reel.label"
          :pool="reel.pool"
          :winner="reel.winner"
          :spin-id="state.spinId"
          :duration="reelSpeedMs() + index * staggerFor(reelSpeedMs())"
          @stopped="onReelStopped"
        />
      </div>
    </div>

    <TrickExplainPanel
      v-if="openPanel === 'explain'"
      :trick="state.spin"
      @close="openPanel = null"
    />
    <TrickListPanel v-if="openPanel === 'tricklist'" @close="openPanel = null" />
    <FamilyChecklistPanel
      v-if="openPanel === 'familyChecklist' && activeFamily"
      :family-id="activeFamily.id"
      @close="openPanel = null"
    />

    <div v-if="badgeToast.length" class="badge-stamp-layer">
      <!-- Distorts the stamp's edges via feDisplacementMap so it reads
           as a rough ink impression instead of a clean vector shape. -->
      <svg width="0" height="0" style="position: absolute" aria-hidden="true">
        <filter id="badge-stamp-ink">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.05"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="10"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <transition-group
        name="badge-stamp"
        tag="div"
        class="badge-stamp-stack"
        :class="{ 'badge-stamp-stack--multi': badgeToast.length > 1 }"
      >
        <div
          v-for="(badge, i) in badgeToast"
          :key="badge.id"
          class="badge-stamp"
          :style="{ '--stamp-delay': `${i * 0.2}s` }"
        >
          <div class="badge-stamp__shape" aria-hidden="true">
            <div class="badge-stamp__ink" />
          </div>
          <div class="badge-stamp__content">
            <div class="badge-stamp__icon">
              <AppIcon name="trophy" :size="34" />
            </div>
            <div v-if="badge.id.startsWith('family-')" class="badge-stamp__text">
              <strong>Famille complétée !</strong>
              <span>{{ badge.name }}</span>
            </div>
            <div v-else class="badge-stamp__text">
              <strong>{{ badge.name }}</strong>
              <span>{{ badge.desc }}</span>
            </div>
          </div>
        </div>
      </transition-group>
    </div>
  </section>
</template>

<style scoped>
.game {
  width: min(680px, 100%);
  margin: 0 auto;
  padding: 18px 16px 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: relative;
}

.game__back {
  align-self: flex-start;
  font-size: 13px;
  padding: 10px 16px;
}

/* Always reachable in a corner, in or out of Focus mode — big enough
   to tap without precision (gloves, phone on the ground, one hand). */
.undo-btn {
  align-self: center;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text-dim);
  font-size: 13px;
}

.game--focus .undo-btn {
  font-size: 15px;
  padding: 12px 18px;
}

.focus-enter-btn,
.focus-exit-btn {
  align-self: flex-end;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: rgba(var(--bg-0-rgb), 0.6);
  color: var(--red-hi);
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

/* In focus mode this is the only way back — no header, no nav — so it
   gets its own prominent spot instead of blending in, and needs to
   stay reachable at any point (mid-spin included), not just once a
   result is showing. Ordinary document flow, not position:fixed —
   fixed positioning kept getting visually covered once the result
   screen appeared, for a stacking-context conflict never fully
   pinned down across several passes; flow layout sidesteps the whole
   question instead of fighting it. */
.focus-exit-btn {
  align-self: center;
  margin-bottom: 10px;
  padding: 12px 20px;
  font-size: 15px;
}

.focus-end-btn {
  align-self: center;
  margin-bottom: 14px;
  font-size: 12px;
  padding: 7px 14px;
}

/* Focus mode: just the trick name (big) and the two main buttons
   (big) — everything else that isn't essential while handling the
   phone mid-session gets out of the way. */
.game--focus .roster,
.game--focus .machine,
.game--focus .result__score,
.game--focus .result__actions--secondary,
.game--focus .result__speak {
  display: none;
}

.game--focus {
  padding-top: 70px;
  min-height: 100dvh;
  justify-content: center;
}

.game--focus .result__name {
  font-size: clamp(32px, 9vw, 52px);
  text-align: center;
}

.game--focus .result__tries {
  flex-direction: column;
  gap: 10px;
}

.game--focus .result__tries-label {
  font-size: 16px;
}

.game--focus .result__tries-btn {
  width: 100%;
  padding: 18px;
  font-size: 17px;
}

.game--focus .result__actions {
  flex-direction: column;
}

.game--focus .result__actions .btn {
  width: 100%;
  padding: 26px;
  font-size: 20px;
}

.focus-spinning {
  text-align: center;
  font-family: var(--font-display);
  font-size: 28px;
  color: var(--text-dim);
}

.focus-family-progress {
  align-self: center;
  background: none;
  border: none;
  cursor: pointer;
  text-align: center;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--red-hi);
  text-shadow: var(--glow-red);
  margin-bottom: -6px;
}

.machine {
  position: relative;
  padding: 26px 18px 20px;
  background:
    linear-gradient(180deg, rgba(var(--fg-rgb), 0.06), rgba(var(--fg-rgb), 0.02)),
    linear-gradient(180deg, var(--bg-2), var(--bg-1));
  box-shadow:
    0 18px 60px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(var(--fg-rgb), 0.12);
}

/* blinking marquee lights along the top edge */
.machine__lights {
  position: absolute;
  top: 9px;
  left: 18px;
  right: 18px;
  display: flex;
  justify-content: space-between;
}

.machine__lights span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--red);
  box-shadow: var(--glow-red);
  animation: marquee 1.4s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.1s);
}

.machine__lights span:nth-child(even) {
  background: var(--red-hi);
  box-shadow: var(--glow-white);
}

@keyframes marquee {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}

.machine__reels {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.result {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.result__name {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(22px, 6vw, 34px);
  line-height: 1.25;
  text-transform: uppercase;
}

.result__speak {
  vertical-align: middle;
  margin-left: 6px;
  padding: 4px;
  color: var(--red-hi);
  text-shadow: none;
  transition: transform 0.15s ease;
}

.result__speak:hover {
  transform: scale(1.15);
}

.btn--confirm {
  color: var(--red-hi);
  border-color: rgba(var(--fg-rgb), 0.6);
  box-shadow: 0 0 10px rgba(var(--fg-rgb), 0.2);
}

.family-pause {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 0 16px;
  color: var(--red-hi);
}

.family-pause__title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text);
  margin: 4px 0 0;
}

.result__score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--font-display);
  font-size: 15px;
  color: var(--text);
  text-shadow: var(--glow-white);
}

.result__tries {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.result__tries-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-dim);
}

.result__tries-btn {
  font-size: 12px;
  padding: 7px 12px;
}

.result__last {
  color: var(--red-hi);
}

.result__turn {
  font-size: 18px;
  color: var(--text-dim);
}

.result__turn-name {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 20px;
  text-transform: uppercase;
  color: var(--text);
  text-shadow: var(--glow-white);
}

/* group roster */
.roster {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.roster__chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.roster__chip--up {
  border-color: var(--red);
  box-shadow: var(--glow-red);
}

/* marker for the player who starts this turn */
.roster__chip > svg {
  color: var(--red-hi);
  flex: none;
}

.roster__chip--done {
  opacity: 0.6;
}

.roster__chip--out {
  opacity: 0.35;
}

.roster__chip--out .roster__name {
  text-decoration: line-through;
}

.roster__name {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.roster__chip--up .roster__name {
  color: var(--red-hi);
}

.roster__letters {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: var(--red);
  text-shadow: var(--glow-red);
}

.result__actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
}

.result__actions--secondary .btn {
  font-size: 12px;
  padding: 8px 14px;
  color: var(--text-dim);
}

.result-enter-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.result-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.96);
}

.result-leave-active {
  transition: opacity 0.15s ease;
}

.result-leave-to {
  opacity: 0;
}

.badge-stamp-layer {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(var(--bg-0-rgb), 0.72);
  backdrop-filter: blur(3px);
}

.badge-stamp-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  max-height: 100dvh;
  overflow-y: auto;
  padding: 12px 0;
}

.badge-stamp {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(78vw, 340px);
  aspect-ratio: 1;
  animation: badge-stamp-slam 1s var(--stamp-delay, 0s) cubic-bezier(0.22, 0.68, 0.32, 1)
      both,
    badge-stamp-shake 0.5s calc(var(--stamp-delay, 0s) + 1s) ease-out;
}

/* Two or more badges landing at once used to stack at full size and
   overflow the screen — shrink each stamp (and its inner content)
   once there's more than one so the whole stack fits and reads
   clearly instead of spilling off-screen. */
.badge-stamp-stack--multi {
  gap: 10px;
}

.badge-stamp-stack--multi .badge-stamp {
  width: min(52vw, 220px);
}

.badge-stamp-stack--multi .badge-stamp__content {
  padding: 16px 14px;
  gap: 6px;
}

.badge-stamp-stack--multi .badge-stamp__icon {
  width: 52px;
  height: 52px;
}

.badge-stamp-stack--multi .badge-stamp__text strong {
  font-size: 17px;
}

.badge-stamp-stack--multi .badge-stamp__text span {
  font-size: 12px;
  max-width: 150px;
}

/* Everything that should look like rough-edged ink — clipped to a
   perfect circle, then roughened by the SVG filter. Kept separate from
   the text below so distorting it never touches the actual letters. */
.badge-stamp__shape {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 6px solid var(--red-hi);
  outline: 2px solid var(--red-hi);
  outline-offset: -14px;
  background: rgba(var(--bg-0-rgb), 0.96);
  box-shadow: var(--glow-red);
  filter: url(#badge-stamp-ink);
  animation: badge-stamp-glow 1.8s calc(var(--stamp-delay, 0s) + 1.5s) ease-in-out infinite;
}

/* A second, slightly offset outline behind the main one — the classic
   double-struck look of a rubber stamp that didn't land perfectly
   flush the first time. */
.badge-stamp__shape::before {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: inherit;
  border: 3px solid var(--red-hi);
  opacity: 0.35;
  transform: rotate(4deg) scale(1.03);
  pointer-events: none;
}

/* Uneven ink coverage — a rubber stamp never lays down a perfectly
   flat, uniform color, some patches always come out lighter/heavier. */
.badge-stamp__ink {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  mix-blend-mode: multiply;
  opacity: 0.5;
  background-image: radial-gradient(
      circle at 18% 22%,
      rgba(var(--fg-rgb), 0.22) 0%,
      transparent 32%
    ),
    radial-gradient(circle at 82% 15%, rgba(var(--fg-rgb), 0.16) 0%, transparent 28%),
    radial-gradient(circle at 75% 78%, rgba(var(--fg-rgb), 0.2) 0%, transparent 34%),
    radial-gradient(circle at 12% 80%, rgba(var(--fg-rgb), 0.14) 0%, transparent 26%),
    radial-gradient(circle at 50% 50%, transparent 55%, rgba(var(--bg-0-rgb), 0.5) 100%);
}

/* The actual readable content — sits above the ink layer, completely
   untouched by its filter/distortion, so text always stays crisp. */
.badge-stamp__content {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 30px 26px;
  text-align: center;
  overflow: hidden;
}

.badge-stamp__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  border: 3px solid var(--red-hi);
  color: var(--red-hi);
  background: linear-gradient(135deg, rgba(var(--fg-rgb), 0.12), transparent);
}

.badge-stamp__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.badge-stamp__text strong {
  font-family: var(--font-display);
  font-size: 26px;
  line-height: 1.1;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
}

.badge-stamp__text span {
  color: var(--text-dim);
  font-size: 14px;
  max-width: 220px;
}

@keyframes badge-stamp-slam {
  0% {
    opacity: 0;
    transform: scale(5) translateY(-220px) rotate(-26deg);
  }
  60% {
    opacity: 1;
    transform: scale(0.92) translateY(0) rotate(-4deg);
  }
  80% {
    transform: scale(1.04) translateY(0) rotate(-4deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0) rotate(-4deg);
  }
}

@keyframes badge-stamp-shake {
  0%,
  100% {
    transform: scale(1) rotate(-4deg);
  }
  25% {
    transform: scale(1.03) rotate(-6deg);
  }
  50% {
    transform: scale(0.99) rotate(-2deg);
  }
  75% {
    transform: scale(1.01) rotate(-4.5deg);
  }
}

@keyframes badge-stamp-glow {
  0%,
  100% {
    box-shadow: var(--glow-red);
  }
  50% {
    box-shadow: var(--glow-red-hi);
  }
}

.badge-stamp-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.badge-stamp-leave-to {
  opacity: 0;
  transform: scale(0.85) rotate(-4deg);
}
</style>