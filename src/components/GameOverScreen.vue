<script setup>
import { computed, onMounted } from "vue";
import AppIcon from "./AppIcon.vue";
import { LETTERS, useGame } from "../composables/useGame.js";
import { useSettings } from "../composables/useSettings.js";
import { useSpeech } from "../composables/useSpeech.js";

const { state, startGame, goToStart } = useGame();
const { settings } = useSettings();
const { announceWinner } = useSpeech();

function changeConfig() {
  if (state.mode === "vs") {
    // Same idea as giveUp() mid-match: land back on VS's own setup
    // screen (sliders and all) instead of the top-level mode-picker.
    state.pendingVsSetup = true;
  }
  goToStart();
}

const standings = computed(() =>
  [...state.players].sort((a, b) => a.letters - b.letters)
);
const winners = computed(() =>
  standings.value.filter((p) => p.letters === standings.value[0]?.letters)
);
const winnerNames = computed(() =>
  winners.value.map((p) => p.name).join(" & ")
);
// VS is the one mode where both sides can hit 5 letters on the exact
// same round (see resolveVsRound in useGame.js) — group mode always
// ends the instant a bail leaves only one player standing, so this
// can't happen there. When it does, nobody actually "won".
const isDraw = computed(() =>
  state.players.every((p) => p.letters >= LETTERS.length)
);

function lettersOf(player) {
  return LETTERS.slice(0, player.letters).split("").join(" ");
}

// "Player N ... wins" — only when there is a single winner to call out.
onMounted(() => {
  if (!isDraw.value && winners.value.length === 1) {
    announceWinner(state.players.indexOf(winners.value[0]) + 1);
  }
});

// Tumbling logo images rain down instead of generic confetti.
const rain = Array.from({ length: 22 }, () => ({
  left: `${Math.random() * 100}%`,
  size: `${16 + Math.random() * 22}px`,
  delay: `${Math.random() * 3}s`,
  duration: `${3 + Math.random() * 3}s`,
  spin: `${Math.round((Math.random() * 2 - 1) * 720)}deg`,
  opacity: 0.25 + Math.random() * 0.5,
}));
</script>

<template>
  <section class="gameover rise-in">
    <button class="btn btn--ghost gameover__back" @click="changeConfig()">
      &lsaquo; Retour
    </button>

    <div class="logo-rain" aria-hidden="true">
      <img
        v-for="(drop, i) in rain"
        :key="i"
        src="/img/blade-mark-square.svg"
        alt=""
        :style="{
          left: drop.left,
          width: drop.size,
          animationDelay: drop.delay,
          animationDuration: drop.duration,
          '--spin': drop.spin,
          '--drop-opacity': drop.opacity,
        }"
      />
    </div>

    <img
      class="gameover__stamp"
      src="/img/blade-mark-square.svg"
      alt=""
    />
    <h2 class="gameover__title sticker-text">Partie terminée</h2>

    <p class="gameover__winner">
      <AppIcon name="trophy" :size="18" />
      <template v-if="isDraw">
        <strong>Match nul</strong>
      </template>
      <template v-else>
        <strong>{{ winnerNames }}</strong>
        {{ winners.length > 1 ? "partagent la couronne !" : "prend la couronne !" }}
      </template>
    </p>

    <div class="gameover__standings panel">
      <table class="data-table">
        <tbody>
          <tr v-for="(player, i) in standings" :key="player.name + i">
            <td class="rank">{{ i + 1 }}.</td>
            <td class="name" :class="{ out: player.letters >= LETTERS.length }">
              {{ player.name }}
            </td>
            <td class="letters">
              <span v-if="player.letters > 0">{{ lettersOf(player) }}</span>
              <span v-else class="clean">sans faute !</span>
              <span v-if="player.letters >= LETTERS.length" class="out-tag"
                >éliminé</span
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="gameover__actions">
      <button class="btn btn--go" @click="startGame(settings, state.mode)">
        <AppIcon name="play" :size="18" /> Revanche
      </button>
      <button class="btn" @click="changeConfig()">Changer la config</button>
    </div>
  </section>
</template>

<style scoped>
.gameover {
  position: relative;
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 30px 16px 46px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.gameover__back {
  align-self: flex-start;
  font-size: 13px;
  padding: 10px 16px;
  margin-bottom: 4px;
}

.gameover__title {
  font-size: clamp(26px, 7vw, 38px);
  font-weight: 900;
  text-transform: uppercase;
}

.gameover__winner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  color: var(--text-dim);
}

.gameover__winner strong {
  font-family: var(--font-display);
  font-size: 19px;
  text-transform: uppercase;
  color: var(--red-hi);
  text-shadow: var(--glow-red-hi);
}

.gameover__standings {
  width: 100%;
  margin-top: 12px;
  padding: 8px 16px;
  text-align: left;
}

.rank {
  width: 34px;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--text-dim);
}

.name {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
}

.name.out {
  text-decoration: line-through;
  color: var(--text-dim);
}

.letters {
  text-align: right;
  font-family: var(--font-display);
  font-weight: 900;
  letter-spacing: 0.12em;
  color: var(--red);
  text-shadow: var(--glow-red);
}

.letters .clean {
  color: var(--text-dim);
  text-shadow: none;
  font-weight: 600;
  letter-spacing: normal;
}

.out-tag {
  margin-left: 8px;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-dim);
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  padding: 2px 8px;
}

.gameover__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 20px;
}

/* the winner's sticker slam: scales in hard, keeps a slight tilt */
.gameover__stamp {
  width: 96px;
  margin-bottom: 4px;
  animation:
    stamp-in 0.55s cubic-bezier(0.2, 1.4, 0.35, 1) both,
    stamp-glow 2.4s ease-in-out 0.55s infinite;
}

@keyframes stamp-in {
  0% {
    opacity: 0;
    transform: scale(2.6) rotate(-14deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(-4deg);
  }
}

@keyframes stamp-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 12px rgba(var(--fg-rgb), 0.4));
  }
  50% {
    filter: drop-shadow(0 0 26px rgba(var(--fg-rgb), 0.75));
  }
}

.logo-rain {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.logo-rain img {
  position: absolute;
  top: -40px;
  opacity: 0;
  filter: drop-shadow(0 0 6px rgba(var(--fg-rgb), 0.35));
  animation-name: logo-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes logo-fall {
  0% {
    opacity: var(--drop-opacity);
    transform: translateY(0) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(92vh) rotate(var(--spin));
  }
}
</style>