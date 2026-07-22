<script setup>
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";
import {
  GLOSSARY,
  GRINDS,
  GRIND_SYNONYMS,
  OBSTACLE_VARIATIONS,
  VARIATIONS,
  thumbUrl,
} from "../game/trickData.js";
import { useCollection } from "../composables/useCollection.js";

defineEmits(["close"]);

const { grindLandedCount, landedGrindCount, totalGrinds } = useCollection();

const terms = Object.entries(GLOSSARY).sort(([a], [b]) => a.localeCompare(b));

// Sort FS/BS pairs next to their base name.
const grinds = [...GRINDS].sort((a, b) =>
  a.name
    .replace(/^(BS|FS)/, "ZZ")
    .localeCompare(b.name.replace(/^(BS|FS)/, "ZZ")),
);

const synonyms = [...GRIND_SYNONYMS].sort((a, b) =>
  a.newName.localeCompare(b.newName),
);

const variations = VARIATIONS.filter((v) => v.name !== "None").sort((a, b) =>
  a.name.localeCompare(b.name),
);

const NOT_IMPLEMENTED = [
  ...OBSTACLE_VARIATIONS.map((v) => ({
    term: v.name,
    comment: `<a target="_blank" href="${v.url}">Book of Grinds</a>`,
  })),
  {
    term: "Illusion Spin",
    comment:
      "Regarder par-dessus l'épaule opposée à la direction dans laquelle tu vas tourner.",
  },
  {
    term: "Grabbing locked feet",
    comment:
      "Les grabs ne sont considérés que quand on attrape le pied libre d'un grind sur un seul pied comme le Makio. Un grab pieds verrouillés veut dire tenir un patin verrouillé, par exemple un Full Torque attrapé.",
  },
  { term: "Negative Topside", comment: "Negative Sweatstance, .." },
  {
    term: "Medspin",
    comment:
      "Un 360 fait au sol où tu passes de face à dos sur un pied, puis retour de face sur les deux pieds.",
  },
  {
    term: "Toe/Heel Rolls",
    comment:
      "Rouler avec un pied sur une seule roue avant ou après le grind. Il y a le Wheelbarrow et le Training Wheel. Beaucoup d'autres variantes sont possibles.",
  },
  {
    term: "Step",
    comment:
      "Ça existe mais je ne comprends pas du tout comment ça marche. <a target='_blank' href='http://skateyeg.com/bog/10.0_Step.html'>Book of Grinds</a>",
  },
  {
    term: "Thread the Needle",
    comment:
      "Cross grab d'un pied puis sauter l'autre pied à travers le trou en gardant le grab. Peut se faire sur des gaps et des grinds.",
  },
  {
    term: "Crosswalk",
    comment: "Comme un Sidewalk mais avec le pied avant en position acid.",
  },
  {
    term: "Sui-slide",
    comment:
      "Comme un Fastslide mais avec le pied arrière au lieu du pied avant.",
  },
  {
    term: "Extremely rare grinds and innovative ideas",
    comment:
      "Regarde des skateurs comme <a target='_blank' href='https://www.instagram.com/rollerstreet_miami/'>Jimmy Cisz</a>, <a target='_blank'  href='https://www.instagram.com/tryhardtri/'>Tri Tri Rudolf</a> pour des grinds vraiment rares — des jambes spéciales sont nécessaires pour des Citric grinds de dingue, ou des idées innovantes comme les Frame Flips. Pour d'autres idées innovantes, je recommande aussi <a target='_blank'  href='https://www.instagram.com/savosin.ilia/'>Ilya Savosin</a>, il patine sur des installations étranges sur des spots difficiles. <a href='https://www.instagram.com/eugenenin/' target='blank'>Eugen Enin</a> est aussi une excellente source de switchups innovants et de grinds rares. Ou <a href='https://www.instagram.com/thefarmacy_' target='blank'>Chris Farmer</a>, sans doute le skateur avec le vocabulaire de tricks le plus riche.",
  },
];

// [anchor id, displayed label] — the id must keep matching the
// hardcoded h3 id="tricktionary-..." below; only the label is French.
const SECTIONS = [
  ["Terms", "Termes"],
  ["Grinds", "Grinds"],
  ["Synonyms", "Synonymes"],
  ["Variations", "Variations"],
  ["More", "Plus"],
];

function scrollTo(id) {
  document.getElementById(`tricktionary-${id}`)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
</script>

<template>
  <AppModal title="Tricktionary" @close="$emit('close')">
    <p class="intro">
      Tous les rendus 3D sont des captures d'écran tirées de l'excellent
      <a href="http://skateyeg.com/bog/" target="_blank" rel="noopener"
        >Book of Grinds</a
      >. Clique une image pour ouvrir la page du Book of Grinds pour ce trick.
    </p>

    <nav class="toc">
      <button
        v-for="[id, label] in SECTIONS"
        :key="id"
        class="btn btn--ghost toc__link"
        @click="scrollTo(id)"
      >
        {{ label }}
      </button>
    </nav>

    <h3 id="tricktionary-Terms" class="section-title">Termes</h3>
    <table class="data-table">
      <tbody>
        <tr v-for="[term, definition] in terms" :key="term">
          <td class="term">{{ term }}</td>
          <td>{{ definition }}</td>
        </tr>
      </tbody>
    </table>

    <h3 id="tricktionary-Grinds" class="section-title">Grinds</h3>
    <p v-if="landedGrindCount > 0" class="landed-summary">
      <AppIcon name="check" :size="14" /> Tu as réussi {{ landedGrindCount }}/{{
        totalGrinds
      }}
      grinds en sessions solo.
    </p>
    <table class="data-table">
      <tbody>
        <tr v-for="grind in grinds" :key="grind.name">
          <td class="term">
            {{
              grind.name
                .replace(/^BS /, "Backside/BS ")
                .replace(/^FS /, "Frontside/FS ")
            }}
            <span
              v-if="grindLandedCount(grind.name) > 0"
              class="landed-mark"
              :title="`Réussi ${grindLandedCount(grind.name)}×`"
            >
              <AppIcon name="check" :size="13" />
              {{ grindLandedCount(grind.name) }}&times;
            </span>
          </td>
          <td>
            <a
              :href="grind.url || 'http://skateyeg.com/bog/'"
              target="_blank"
              rel="noopener"
            >
              <img
                class="thumb"
                :src="grind.thumbUrl"
                :alt="grind.name"
                loading="lazy"
              />
            </a>
          </td>
          <!-- comments come from the local trick database -->
          <td v-html="grind.comment" />
        </tr>
      </tbody>
    </table>

    <h3 id="tricktionary-Synonyms" class="section-title">Synonymes de grind</h3>
    <table class="data-table">
      <tbody>
        <tr v-for="syn in synonyms" :key="syn.newName">
          <td class="term">{{ syn.newName }}</td>
          <td>
            <a
              :href="syn.url || 'http://skateyeg.com/bog/'"
              target="_blank"
              rel="noopener"
            >
              <img
                class="thumb"
                :src="
                  thumbUrl(
                    syn.newName === 'Top Teakettle' ? 'Teakettle' : syn.newName,
                  )
                "
                :alt="syn.newName"
                loading="lazy"
              />
            </a>
          </td>
          <td>{{ syn.comment }}</td>
        </tr>
      </tbody>
    </table>

    <h3 id="tricktionary-Variations" class="section-title">Variations de grind</h3>
    <table class="data-table">
      <tbody>
        <tr v-for="variation in variations" :key="variation.name">
          <td class="term">{{ variation.name }}</td>
          <td>
            <a
              v-if="!variation.noThumb"
              :href="variation.url || 'http://skateyeg.com/bog/'"
              target="_blank"
              rel="noopener"
            >
              <img
                class="thumb"
                :src="thumbUrl(variation.name)"
                :alt="variation.name"
                loading="lazy"
              />
            </a>
          </td>
          <td>{{ variation.comment }}</td>
        </tr>
      </tbody>
    </table>

    <h3 id="tricktionary-More" class="section-title">Pas encore implémenté</h3>
    <table class="data-table">
      <tbody>
        <tr v-for="entry in NOT_IMPLEMENTED" :key="entry.term">
          <td class="term">{{ entry.term }}</td>
          <td v-html="entry.comment" />
        </tr>
      </tbody>
    </table>
  </AppModal>
</template>

<style scoped>
.intro {
  color: var(--text-dim);
  margin-bottom: 14px;
}

.toc {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.toc__link {
  font-size: 12px;
  padding: 7px 12px;
}

.section-title {
  font-size: 14px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--red-hi);
  margin: 22px 0 8px;
  scroll-margin-top: 10px;
}

.term {
  font-weight: 700;
  white-space: nowrap;
}

.landed-summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--red-hi);
  font-size: 14px;
  margin-bottom: 8px;
}

.landed-mark {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--red-hi);
}

@media (max-width: 560px) {
  .term {
    white-space: normal;
  }
}
</style>
