<script setup>
import { computed, onMounted, ref, watch } from "vue";
import AppIcon from "./AppIcon.vue";
import SlotReel from "./SlotReel.vue";
import TrickExplainPanel from "./TrickExplainPanel.vue";
import TrickListPanel from "./TrickListPanel.vue";
import { LETTERS, useGame } from "../composables/useGame.js";
import { useSettings } from "../composables/useSettings.js";
import { useSpeech } from "../composables/useSpeech.js";

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
  addTry,
  giveUp,
  onReelsSettled,
} = useGame();
const { settings, reelSpeedMs } = useSettings();
const { speakTrick, playKeys } = useSpeech();

// Group: a game starts with the "fight!" call.
onMounted(() => {
  if (!isSolo.value) {
    playKeys(["fight"]);
  }
});

const openPanel = ref(null); // 'explain' | 'tricklist' | null
const stoppedReels = ref(0);

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
const badgeToast = ref([]);
let badgeToastTimer = null;
watch(
  () => state.newBadges,
  (badges) => {
    if (!badges.length) {
      return;
    }
    badgeToast.value = badges;
    window.clearTimeout(badgeToastTimer);
    badgeToastTimer = window.setTimeout(() => {
      badgeToast.value = [];
    }, 3500);
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

watch(
  () => state.spinId,
  () => {
    stoppedReels.value = 0;
    openPanel.value = null;
  }
);

function onReelStopped() {
  stoppedReels.value += 1;
  if (stoppedReels.value >= visibleReels.value.length) {
    onReelsSettled();
  }
}
</script>

<template>
  <section class="game">
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

        <!-- solo: land or skip, build the collection -->
        <template v-if="isSolo">
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
            <button class="btn btn--ghost" @click="giveUp()">
              <AppIcon name="flag" :size="16" /> Terminer la session
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
            <button class="btn btn--ghost" @click="giveUp()">
              <AppIcon name="flag" :size="16" /> Terminer la partie
            </button>
          </div>
        </template>
      </div>
    </transition>

    <TrickExplainPanel
      v-if="openPanel === 'explain'"
      :trick="state.spin"
      @close="openPanel = null"
    />
    <TrickListPanel v-if="openPanel === 'tricklist'" @close="openPanel = null" />

    <transition name="badge-toast">
      <div v-if="badgeToast.length" class="badge-toast">
        <div v-for="badge in badgeToast" :key="badge.id" class="badge-toast__item">
          <AppIcon name="trophy" :size="18" />
          <span>
            <strong>Badge débloqué : {{ badge.name }}</strong>
            <small>{{ badge.desc }}</small>
          </span>
        </div>
      </div>
    </transition>
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
  background: #fff;
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
  font-size: 14px;
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

.badge-toast {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.badge-toast__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--fg-rgb), 0.6);
  background: rgba(10, 10, 10, 0.94);
  box-shadow: var(--glow-red);
  color: var(--red-hi);
  text-align: left;
}

.badge-toast__item span {
  display: flex;
  flex-direction: column;
}

.badge-toast__item strong {
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.badge-toast__item small {
  color: var(--text-dim);
  font-size: 13px;
}

.badge-toast-enter-active,
.badge-toast-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.badge-toast-enter-from,
.badge-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-14px);
}
</style>