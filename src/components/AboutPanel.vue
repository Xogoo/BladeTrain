<script setup>
import AppModal from "./AppModal.vue";
import AppIcon from "./AppIcon.vue";

defineEmits(["close"]);

const REFERENCES = [
  { name: "Book of Grinds", url: "http://skateyeg.com/" },
  {
    name: "1997 Aggressive inline skating dictionary",
    url: "http://toxboe.net/all/1997-aggressive-inline-skating-dictionary",
  },
  {
    name: "Rollerblading Explained (In Progress)",
    url: "https://broskowfanboy.wordpress.com/rollerblading-explained-in-progress/",
  },
  { name: "BE-MAG message board", url: "https://archive.be-mag.com" },
  {
    name: "The Grab and Grind Chart Aggressive Skating",
    url: "https://lurch17.tripod.com/skchart.htm",
  },
  { name: "Grindlocker", url: "http://grindlocker.com/" },
  {
    name: "Tricks Trainer — Aggressive Inline (Android)",
    url: "https://play.google.com/store/apps/details?id=com.dufflagaramot.trickstrainer",
  },
  {
    name: "Art of Rolling Skate Dice",
    url: "https://www.be-mag.com/news/products/art-of-rolling-skate-dice-free-android-app/",
  },
];
</script>

<template>
  <AppModal title="Comment jouer" @close="$emit('close')">
    <h3 class="section-title">L'application</h3>
    <p>
      BLADE est un générateur aléatoire de tricks de grind pour le roller. Chaque
      trick de grind se découpe en cinq phases — approche, rotation vers le
      grind, grind, variation de grind et rotation de sortie. La machine à sous
      tire les phases au hasard et traduit le résultat en un vrai nom de trick de
      roller. Plus de 30 grinds, plus de 50 000 tricks uniques. Joue seul ou
      contre tes potes.
    </p>

    <h3 class="section-title">Mode Solo</h3>
    <ol class="steps">
      <li>Choisis un mode et appuie sur <strong>Démarrer la session</strong>.</li>
      <li>La machine à sous tire un trick — va le réussir.</li>
      <li>
        Réussi ? Appuie sur <strong>Blade!</strong> pour l'ajouter à ta
        collection de tricks. Impossible ? Appuie sur <strong>Passer</strong>.
      </li>
      <li>
        Il n'y a pas de fin de partie ni de limite de tirages — termine la
        session quand tu veux.
      </li>
    </ol>
    <p>
      Deux façons de jouer en Solo : <strong>Custom</strong> (les roues
      tournent librement selon tes réglages) ou une
      <strong>famille de tricks</strong> précise — un trick de la liste est
      tiré au hasard parmi ceux que tu n'as pas encore réussis. Passer ne
      fait que retirer un autre trick de la liste, rien n'est bloqué ; une
      fois réussi, un trick ne revient plus. Termine tous les tricks pour
      compléter la famille.
    </p>
    <p>
      Le mode solo t'entraîne : les tricks que tu n'as jamais réussis et ceux
      que tu passes souvent reviennent plus fréquemment. Ta collection, tes
      badges d'étapes (premier topside, premier 540, tous les grinds
      soul-plate, ...) et ta progression par grind sont sauvegardés sur cet
      appareil — regarde-les dans <strong>Collection</strong>.
    </p>

    <h3 class="section-title">Mode Carrière</h3>
    <p>
      Deux progressions totalement indépendantes — <strong>Normal</strong> et
      <strong>Switch</strong> — chacune avec les mêmes familles de tricks,
      dans le même ordre, mais qui avancent chacune à leur rythme.
    </p>
    <ol class="steps">
      <li>
        Depuis l'écran d'accueil, choisis <strong>Carrière</strong>, puis
        Normal ou Switch.
      </li>
      <li>
        Les familles s'enchaînent en chemin d'étapes : la première est
        toujours ouverte, chaque suivante se débloque une fois la précédente
        entièrement terminée.
      </li>
      <li>
        Termine une famille et la session se met en pause : choisis
        <strong>Famille suivante</strong> pour enchaîner directement, ou
        <strong>Continuer en solo libre</strong>.
      </li>
    </ol>
    <p>
      La Carrière a son propre bouton de réinitialisation (en bas de l'écran
      Carrière), séparé du reste — remettre ta Carrière à zéro ne touche pas
      à ta collection, tes badges ou ton historique, et inversement.
    </p>

    <h3 class="section-title">Mode Groupe — B.L.A.D.E</h3>
    <ol class="steps">
      <li>
        Entre les joueurs (2 à 6), choisis le nombre de manches et la
        difficulté, puis appuie sur <strong>Démarrer la partie</strong>.
      </li>
      <li>
        Chaque manche, un trick est tiré et
        <strong>chaque joueur le tente</strong>, l'un après l'autre. Le joueur
        qui commence change à chaque manche.
      </li>
      <li>
        Le joueur qui commence peut relancer le trick jusqu'à
        <strong>3 fois</strong> — mais une fois qu'il l'a tenté, le trick est
        verrouillé pour tout le monde.
      </li>
      <li>
        Loupe le trick et tu récoltes la lettre suivante de
        <strong>B&middot;L&middot;A&middot;D&middot;E</strong>. Cinq lettres et
        t'es éliminé — comme au S.K.A.T.E.
      </li>
      <li>
        La partie se termine après la dernière manche ou quand il ne reste
        qu'un seul joueur. Celui avec le moins de lettres gagne.
      </li>
    </ol>

    <h3 class="section-title">Contrôles</h3>
    <table class="data-table">
      <tbody>
        <tr>
          <td><AppIcon name="question" /></td>
          <td>Affiche une description du trick en cours.</td>
        </tr>
        <tr>
          <td><AppIcon name="sound" /></td>
          <td>
            Lit le nom du trick à voix haute. Le bouton en haut à droite coupe
            tout le son.
          </td>
        </tr>
        <tr>
          <td><AppIcon name="forward" /></td>
          <td>
            Solo : passe ce trick et tire le suivant. Groupe : le joueur qui
            commence relance le trick (3 par tour).
          </td>
        </tr>
        <tr>
          <td><AppIcon name="check" /></td>
          <td>Trick réussi — l'ajoute à ta collection (solo) ou passe la main (groupe).</td>
        </tr>
        <tr>
          <td><AppIcon name="flag" /></td>
          <td>
            Solo : termine la session. Groupe : loupé — prends une lettre, ou
            termine toute la partie.
          </td>
        </tr>
        <tr>
          <td><AppIcon name="list" /></td>
          <td>Affiche les tricks que tu as faits cette session.</td>
        </tr>
        <tr>
          <td><AppIcon name="trophy" /></td>
          <td>Ta collection de tricks, tes badges et ta progression par grind.</td>
        </tr>
        <tr>
          <td><AppIcon name="settings" /></td>
          <td>
            Inclus et exclus des tricks, règle les options de jeu. Sauvegardé
            sur cet appareil.
          </td>
        </tr>
        <tr>
          <td><AppIcon name="book" /></td>
          <td>Recherche des noms de tricks dans le tricktionary.</td>
        </tr>
      </tbody>
    </table>

    <h3 class="section-title">Crédits &amp; références</h3>
    <p>
      Un grand merci à l'excellente référence roller
      <a href="http://skateyeg.com/bog/" target="_blank" rel="noopener"
        >Book of Grinds</a
      >
      pour m'avoir laissé utiliser les miniatures des explications de tricks.
      L'app ne couvre que les tricks à un seul grind — pas de sauts ni de
      switch-ups. C'est incroyable de voir à quel point les tricks de grind
      sont variés.
      <a
        href="https://www.youtube.com/watch?v=Chpys46GZAY"
        target="_blank"
        rel="noopener"
      >
        J'adore le roller</a
      >.
    </p>

    <p class="footer-note">
      Copyright &copy; 2026 Roman Hatz &middot;
      <a
        href="https://github.com/amiga909/gtg-grind-trick-generator"
        target="_blank"
        rel="noopener"
      >
        Code source</a
      >
      &middot;
      <a href="mailto:aight.bladegame@gmail.com">aight.bladegame@gmail.com</a>
    </p>
  </AppModal>
</template>

<style scoped>
.section-title {
  font-size: 14px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--red-hi);
  margin: 20px 0 8px;
}

.section-title:first-child {
  margin-top: 0;
}

.steps {
  padding-left: 22px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
}

.links {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 8px;
}

.footer-note {
  margin-top: 24px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  color: var(--text-dim);
  font-size: 14px;
}
</style>