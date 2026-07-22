<script setup>
import { computed, ref } from "vue";
import AppModal from "./AppModal.vue";
import { GRINDS, RARE_GRIND_NAME_PARTS } from "../game/trickData.js";
import {
  LEVELS,
  SOLO_LEVELS,
  CUSTOM_LEVEL,
  useSettings,
} from "../composables/useSettings.js";
import { useBackup } from "../composables/useBackup.js";

defineEmits(["close"]);

const {
  settings,
  applyLevel,
  setTrick,
  reset,
  grindEnabled,
  setGrind,
  setAllGrinds,
  setGrindsByType,
  switchUpGrindEnabled,
  setSwitchUpGrind,
  setAllSwitchUpGrinds,
  setSwitchUpGrindsByType,
} = useSettings();

const { lastBackupAt, exportBackup, restoreBackup } = useBackup();

const backupStatus = ref(""); // shown right after an export/restore attempt
const restoreInput = ref(null);

function formatBackupDate(iso) {
  if (!iso) return "Jamais sauvegardé pour l'instant";
  return `Dernière sauvegarde : ${new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

async function onExportClick() {
  backupStatus.value = "";
  const result = await exportBackup();
  if (result.method === "share") {
    backupStatus.value = "Partagé — choisis où l'envoyer (Mail, Fichiers, ...).";
  } else if (result.method === "download") {
    backupStatus.value = "Enregistré en fichier — joins-le toi-même à un email si tu veux une copie hors du téléphone.";
  }
  // "cancelled" : le joueur a fermé le menu de partage sans rien choisir, on ne dit rien.
}

function onRestoreFileChosen(event) {
  const file = event.target.files?.[0];
  event.target.value = ""; // permet de reprendre le même fichier plus tard
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      restoreBackup(payload);
      backupStatus.value = "Restauré ! Ta progression de cette sauvegarde est chargée.";
    } catch (err) {
      backupStatus.value = `Impossible de restaurer ce fichier : ${err.message}`;
    }
  };
  reader.readAsText(file);
}

// Solo (the main use case) just needs Custom + Switch up — Chill/Juicy/
// Nuts stay for Group games, where a quick shared difficulty pick still
// makes sense.
const presetTitle = computed(() =>
  settings.mode === "solo" ? "Mode" : "Préréglage de difficulté"
);
const presetLevels = computed(() =>
  settings.mode === "solo" ? SOLO_LEVELS : LEVELS
);

const TRICK_GROUPS = [
  {
    title: "Approche",
    options: [
      ["fakie", "Tricks fakie"],
      ["switch", "Tricks switch"],
    ],
  },
  {
    title: "Switch up",
    options: [["switchUp", "Second grind (switch up)"]],
  },
  {
    title: "Variation du premier grind",
    // Rendered as its own 3-column row (see .options--featured) instead
    // of falling into the generic 1-or-2-column list below — these three
    // are related (a topside grind entered alley-oop or true) and read
    // better side by side.
    featured: [
      ["topside", "Grinds topside"],
      ["spinInAlleyOop", "Alley oop (inspin)"],
      ["spinInTrue", "True (outspin)"],
    ],
    options: [
      ["negative", "Grinds negative"],
      ["rough", "Grinds rough / heel (Teakettle, Rough Mizou, ..)"],
      ["tough", "Grinds tough / toe (Tough Soyale, ..)"],
      ["christ", "Grinds christ"],
      ["grabs", "Grabs normaux"],
      ["rocket", "Rocket grabs"],
      ["crossgrab", "Cross grabs"],
      ["channel", "Grinds channel"],
    ],
  },
  {
    title: "Variation du deuxième grind",
    // Same idea as the featured row above, but for the rotation
    // between the two grinds and the 2nd grind's own variation —
    // trains combos like "Top Soul to True Top Soul" independently of
    // the 1st grind's settings above.
    featured: [
      ["switchUpTopside", "Grinds topside (2nd)"],
      ["spinBetweenAlleyOop", "Alley oop (2nd, inspin)"],
      ["spinBetweenTrue", "True (2nd, outspin)"],
    ],
    options: [],
  },
  {
    title: "Rotation d'entrée (Spin in)",
    options: [
      ["spinIn180", "Rotations 180"],
      ["spinIn270", "Rotations 270 (groove)"],
      ["spinIn360", "Rotations 360"],
      ["spinIn450", "Rotations 450 (groove)"],
      ["spinIn540", "Rotations 540"],
    ],
  },
  {
    title: "Rotation entre les grinds (Spin between)",
    options: [
      ["spinBetween180", "Rotations 180"],
      ["spinBetween270", "Rotations 270 (groove)"],
      ["spinBetween360", "Rotations 360"],
      ["spinBetween450", "Rotations 450 (groove)"],
      ["spinBetween540", "Rotations 540"],
    ],
  },
  {
    title: "Rotation de sortie (Spin out)",
    options: [
      ["spinOut180", "Rotations 180"],
      ["spinOut270", "Rotations 270 (groove)"],
      ["spinOut360", "Rotations 360"],
      ["spinOut450", "Rotations 450 (groove)"],
      ["spinOut540", "Rotations 540"],
    ],
  },
];

const isRare = (name) =>
  RARE_GRIND_NAME_PARTS.some((part) => name.includes(part));

// FS/BS pairs sort next to their base name (like the tricktionary);
// rare grinds go to the end of the list.
const byBaseName = (a, b) =>
  a.name
    .replace(/^(BS|FS)/, "ZZ")
    .localeCompare(b.name.replace(/^(BS|FS)/, "ZZ"));
const grindList = [
  ...GRINDS.filter((g) => !isRare(g.name)).sort(byBaseName),
  ...GRINDS.filter((g) => isRare(g.name)).sort(byBaseName),
];
</script>

<template>
  <AppModal title="Réglages" @close="$emit('close')">
    <button class="btn btn--go reset-top" @click="applyLevel(CUSTOM_LEVEL)">
      Tout remettre à zéro
    </button>

    <label class="option option--inline theme-toggle">
      <span>Thème inversé (test)</span>
      <span class="switch">
        <input type="checkbox" v-model="settings.invertedTheme" />
        <span class="track" />
      </span>
    </label>

    <h3 class="section-title">Sauvegarde</h3>
    <p class="hint hint--top">
      Ta progression n'existe que sur ce téléphone. Sauvegarde-la de temps en
      temps pour qu'une réinstallation ou une réinitialisation ne l'efface pas.
    </p>
    <div class="options">
      <label class="option option--inline">
        <span>Email (optionnel, pour le partage)</span>
        <input
          type="email"
          class="select"
          placeholder="toi@exemple.com"
          v-model="settings.backupEmail"
        />
      </label>
    </div>
    <div class="backup-actions">
      <button class="btn" @click="onExportClick">Exporter la sauvegarde</button>
      <button class="btn" @click="restoreInput.click()">Restaurer une sauvegarde</button>
      <input
        ref="restoreInput"
        type="file"
        accept="application/json"
        class="backup-actions__file-input"
        @change="onRestoreFileChosen"
      />
    </div>
    <p class="hint">{{ formatBackupDate(lastBackupAt) }}</p>
    <p v-if="backupStatus" class="hint hint--status">{{ backupStatus }}</p>

    <h3 class="section-title">{{ presetTitle }}</h3>
    <div class="levels">
      <button
        v-for="level in presetLevels"
        :key="level.id"
        class="btn"
        :class="{ 'btn--primary': settings.level === level.id }"
        @click="applyLevel(level.id)"
      >
        {{ level.name }}
      </button>
    </div>
    <label class="option option--inline training-focus">
      <span>
        Mode entraînement ciblé
        <span class="hint hint--inline">
          Verrouille chaque option cochée ci-dessous (Approche, Variations
          de grind, direction/degrés du Spin in, Spin between, Spin out)
          pour qu'elle se produise à chaque fois au lieu d'être juste
          possible.
        </span>
      </span>
      <span class="switch">
        <input
          type="checkbox"
          :checked="settings.tricks.trainingFocus"
          @change="setTrick('trainingFocus', $event.target.checked)"
        />
        <span class="track" />
      </span>
    </label>
    <p class="hint">Modifier une option ci-dessous bascule le préréglage sur Custom.</p>

    <template v-for="group in TRICK_GROUPS" :key="group.title">
      <h3 class="section-title">{{ group.title }}</h3>
      <p v-if="group.hint" class="hint hint--top">{{ group.hint }}</p>
      <div v-if="group.featured" class="options options--featured">
        <label v-for="[key, text] in group.featured" :key="key" class="option">
          <span class="switch">
            <input
              type="checkbox"
              :checked="settings.tricks[key]"
              @change="setTrick(key, $event.target.checked)"
            />
            <span class="track" />
          </span>
          <span>{{ text }}</span>
        </label>
      </div>
      <div class="options">
        <label v-for="[key, text] in group.options" :key="key" class="option">
          <span class="switch">
            <input
              type="checkbox"
              :checked="settings.tricks[key]"
              @change="setTrick(key, $event.target.checked)"
            />
            <span class="track" />
          </span>
          <span>{{ text }}</span>
        </label>
      </div>
    </template>

    <h3 class="section-title">Grinds (premier trick)</h3>
    <p class="hint hint--top">
      Seuls les grinds activés peuvent sortir &mdash; désactive les autres
      pour t'entraîner sur des grinds précis. Si tous sont désactivés, tout
      redevient possible. Les préréglages de difficulté font aussi leur
      propre sélection (les grinds rares sont en fin de liste).
    </p>
    <div class="grind-bulk">
      <button class="btn btn--ghost" @click="setAllGrinds(true)">Tout activer</button>
      <button class="btn btn--ghost" @click="setAllGrinds(false)">Tout désactiver</button>
      <button class="btn btn--ghost" @click="setGrindsByType('soul')">Soul uniquement</button>
      <button class="btn btn--ghost" @click="setGrindsByType('groove')">Groove uniquement</button>
    </div>
    <div class="options">
      <label v-for="grind in grindList" :key="grind.name" class="option">
        <span class="switch">
          <input
            type="checkbox"
            :checked="grindEnabled(grind.name)"
            @change="setGrind(grind.name, $event.target.checked)"
          />
          <span class="track" />
        </span>
        <span>{{ grind.name }}</span>
      </label>
    </div>

    <h3 class="section-title">Grinds (second trick &mdash; switch up)</h3>
    <p class="hint hint--top">
      Indépendant de la liste au-dessus &mdash; ne compte que si le switch up
      est activé. Entraîne le second grind séparément du premier.
    </p>
    <div class="grind-bulk">
      <button class="btn btn--ghost" @click="setAllSwitchUpGrinds(true)">Tout activer</button>
      <button class="btn btn--ghost" @click="setAllSwitchUpGrinds(false)">Tout désactiver</button>
      <button class="btn btn--ghost" @click="setSwitchUpGrindsByType('soul')">Soul uniquement</button>
      <button class="btn btn--ghost" @click="setSwitchUpGrindsByType('groove')">Groove uniquement</button>
    </div>
    <div class="options">
      <label v-for="grind in grindList" :key="grind.name" class="option">
        <span class="switch">
          <input
            type="checkbox"
            :checked="switchUpGrindEnabled(grind.name)"
            @change="setSwitchUpGrind(grind.name, $event.target.checked)"
          />
          <span class="track" />
        </span>
        <span>{{ grind.name }}</span>
      </label>
    </div>

    <p class="hint">Les réglages sont sauvegardés sur cet appareil et s'appliquent à la prochaine partie.</p>

    <div class="actions">
      <button class="btn btn--primary" @click="$emit('close')">Terminé</button>
      <button class="btn btn--ghost" @click="reset()">Tout réinitialiser</button>
    </div>
  </AppModal>
</template>

<style scoped>
.reset-top {
  width: 100%;
  font-size: 17px;
  padding: 16px;
  margin-bottom: 12px;
}

.theme-toggle {
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--red-hi);
  margin: 18px 0 10px;
}

.section-title:first-child {
  margin-top: 0;
}

.levels {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.options {
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 20px;
}

@media (min-width: 560px) {
  .options {
    grid-template-columns: 1fr 1fr;
  }
}

.options--featured {
  grid-template-columns: 1fr;
  margin-bottom: 6px;
}

@media (min-width: 420px) {
  .options--featured {
    grid-template-columns: repeat(3, 1fr);
  }
}

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 0;
  cursor: pointer;
  font-size: 17px;
}

.option--inline {
  justify-content: space-between;
  max-width: 340px;
}

.training-focus {
  max-width: none;
  align-items: flex-start;
  margin-bottom: 6px;
}

.hint--inline {
  display: block;
  color: var(--text-dim);
  font-size: 12px;
  font-weight: normal;
  letter-spacing: normal;
  text-transform: none;
  margin-top: 2px;
}

.grind-bulk {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}

.grind-bulk .btn {
  font-size: 12px;
  padding: 7px 14px;
}

.number-input {
  width: 78px;
}

.hint {
  color: var(--text-dim);
  font-size: 14px;
  margin-top: 10px;
}

.hint--top {
  margin: 0 0 10px;
}

.backup-actions {
  display: flex;
  gap: 10px;
  margin: 4px 0 8px;
}
.backup-actions__file-input {
  display: none;
}
.hint--status {
  color: var(--red-hi);
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}
</style>