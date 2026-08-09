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
      BLADE est un générateur aléatoire de tricks de grind pour le roller.
      Chaque trick se découpe en plusieurs phases — approche, rotation
      d'entrée, grind, variation, rotation de sortie, et éventuellement un ou
      deux <strong>switch-ups</strong> (changement de grind en plein trick,
      avec sa propre rotation de transition). La machine à sous tire chaque
      phase au hasard et traduit le résultat en un vrai nom de trick de
      roller. Des dizaines de grinds, des dizaines de milliers de tricks
      uniques, avec ou sans switch-up.
    </p>
    <p>
      Neuf façons de jouer : <strong>Solo</strong>, <strong>Famille</strong>,
      <strong>Carrière</strong>, <strong>BLADE VS</strong>,
      <strong>Groupe</strong>, <strong>Drill</strong>, <strong>Combo</strong>
      (via Carrière ou Mix), <strong>Points faibles</strong> et
      <strong>Grinds à réviser</strong> — détaillés ci-dessous.
    </p>

    <h3 class="section-title">Mode Solo</h3>
    <ol class="steps">
      <li>Depuis l'accueil, choisis <strong>Solo</strong>.</li>
      <li>La machine à sous tire un trick — va le réussir.</li>
      <li>
        Réussi ? Appuie sur <strong>Blade!</strong> pour l'ajouter à ta
        collection. Raté mais tu retentes ? <strong>Raté, on rejoue</strong> —
        ça compte l'essai sans changer de trick. Tu laisses tomber ce
        trick-là ? <strong>Passer</strong> en tire un autre.
      </li>
      <li>
        Pas de fin de partie ni de limite de tirages — termine la session
        quand tu veux avec <strong>Terminer la session</strong>.
      </li>
    </ol>
    <p>
      Les roues tournent librement selon tes réglages (Réglages, en bas de
      l'écran) — quels grinds, quelles variations, quelles rotations sont
      possibles. Les tricks jamais réussis et ceux souvent passés reviennent
      plus souvent. Ta collection, tes badges, ta progression par grind et ton
      historique complet sont sauvegardés sur cet appareil.
    </p>

    <h3 class="section-title">Mode Famille</h3>
    <p>
      Entraîne une <strong>famille de tricks</strong> précise — un trick de la
      liste est tiré au hasard parmi ceux que tu n'as pas encore réussis dans
      cette famille. Une fois réussi, un trick ne revient plus ; termine tous
      les tricks pour compléter la famille. Passer ne fait que retirer un
      autre trick de la liste, rien n'est bloqué.
    </p>
    <p>
      Deux origines de familles : les familles <strong>livrées avec l'app</strong>
      (par grind/rotation) et tes <strong>familles perso</strong>, que tu
      construis toi-même (voir plus bas, "Familles perso"). Depuis ce même
      écran, tu peux aussi choisir <strong>Mix</strong> : sélectionne
      plusieurs familles à la fois, et chaque tirage pioche au hasard dans
      l'ensemble combiné de leurs tricks restants.
    </p>
    <p>
      Deux entrées automatiques vivent aussi ici :
      <strong>Points faibles</strong> (tricks que tu réussis le moins souvent,
      recalculée à chaque fois) et <strong>Grinds à réviser</strong> (grinds
      pas retravaillés depuis un moment) — un bouton dédié apparaît dès qu'il
      y a assez de données pour les proposer.
    </p>

    <h3 class="section-title">Mode Carrière</h3>
    <p>
      Deux progressions totalement indépendantes — <strong>Normal</strong> et
      <strong>Switch</strong> — chacune avec les mêmes familles, dans le même
      ordre, mais qui avancent chacune à leur rythme.
    </p>
    <ol class="steps">
      <li>Depuis l'accueil, choisis <strong>Carrière</strong>, puis un track.</li>
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
      Depuis l'écran d'un track (Normal ou Switch), un bouton
      <strong>Lancer un Combo sur toute la track</strong> permet aussi de
      basculer directement en mode Combo (voir plus bas) sur l'ensemble de ce
      track. La Carrière a son propre bouton de réinitialisation, séparé du
      reste — remettre ta Carrière à zéro ne touche pas à ta collection, tes
      badges ou ton historique, et inversement.
    </p>

    <h3 class="section-title">BLADE VS</h3>
    <p>
      Toi contre le robot, un trick à la fois. Chacun a droit à
      <strong>3 essais</strong> sur le même trick. Le premier qui le réussit
      gagne la manche ; les deux ratent leurs 3 essais, personne ne prend de
      lettre. Le perdant de la manche récolte la lettre suivante de
      <strong>B&middot;L&middot;A&middot;D&middot;E</strong> — cinq lettres et
      c'est fini. Une fois le trick résolu, le suivant démarre automatiquement
      après 2 secondes (ou tape <strong>Trick suivant</strong> pour aller plus
      vite).
    </p>
    <p>
      Le % de réussite du robot se règle avant de lancer une manche — plus
      c'est haut, plus il est difficile à battre.
    </p>

    <h3 class="section-title">Mode Groupe — S.K.A.T.E</h3>
    <ol class="steps">
      <li>
        Entre les joueurs (2 à 6), choisis le nombre de manches et la
        difficulté, puis appuie sur <strong>Démarrer la partie</strong>.
      </li>
      <li>
        Chaque manche, un trick est tiré et <strong>chaque joueur le
        tente</strong>, l'un après l'autre. Le joueur qui commence change à
        chaque manche.
      </li>
      <li>
        Le joueur qui commence peut relancer le trick jusqu'à
        <strong>3 fois</strong> — mais une fois qu'il l'a tenté, le trick est
        verrouillé pour tout le monde.
      </li>
      <li>
        Loupe le trick et tu récoltes la lettre suivante de
        <strong>B&middot;L&middot;A&middot;D&middot;E</strong>. Cinq lettres et
        t'es éliminé.
      </li>
      <li>
        La partie se termine après la dernière manche ou quand il ne reste
        qu'un seul joueur. Celui avec le moins de lettres gagne.
      </li>
    </ol>
    <p>
      Contrairement à tous les autres modes, le Groupe ne remplit pas ton
      historique/collection — c'est volontaire, pensé comme une partie
      ponctuelle entre potes plutôt qu'un entraînement personnel.
    </p>

    <h3 class="section-title">Mode Combo</h3>
    <p>
      Enchaîne le plus de tricks possible avec seulement
      <strong>2 essais</strong> par trick — un 2e raté d'affilée et toute la
      chaîne est perdue, il faut repartir de zéro. Deux façons de le lancer :
    </p>
    <ul class="bullets">
      <li>
        <strong>Combo-Carrière</strong> : parcourt tout un track (Normal ou
        Switch) d'une traite, famille après famille, sans jamais s'arrêter
        entre elles.
      </li>
      <li>
        <strong>Combo-Mix</strong> : pioche aléatoirement dans les familles
        que tu choisis, comme un Mix classique, avec la règle des 2 essais en
        plus.
      </li>
    </ul>
    <p>
      Chaque run terminé (chaîne cassée, ou chemin entièrement parcouru) est
      enregistré avec la chaîne atteinte et le trick sur lequel ça s'est
      arrêté — retrouve-les dans l'onglet <strong>Combos</strong> de
      l'Historique, graphique de progression inclus.
    </p>

    <h3 class="section-title">Mode Drill</h3>
    <p>
      Un trick précis, en boucle, jusqu'à le dompter. Chaque entrée a deux
      objectifs à remplir <strong>ensemble</strong> : le réussir
      <strong>20 fois au total</strong> et au moins
      <strong>5 fois d'affilée</strong> (une série qui ne se remet à zéro que
      sur un trick passé). Les deux jauges (total et meilleure série)
      s'affichent en direct sur l'écran de tirage.
    </p>
    <p>Trois façons d'alimenter ta liste Drill :</p>
    <ul class="bullets">
      <li>
        Le bouton <strong>+ Drill</strong> sur l'écran de tirage — ajoute
        exactement le trick affiché, dans n'importe quel mode.
      </li>
      <li>
        Le bouton <strong>Ajouter un drill</strong> sur l'écran Drill lui-même
        — configure un trick précis via les mêmes réglages que pour créer une
        famille perso, puis ajoute-le directement depuis la liste.
      </li>
      <li>
        Les <strong>suggestions automatiques</strong> dans l'onglet Drill de
        l'Historique — les tricks qui reviennent souvent en échec, prêts à
        ajouter en un tap.
      </li>
    </ul>
    <p>
      Une fois dans la liste, un trick progresse même hors d'une session
      Drill dédiée — le réussir en Solo, en BLADE VS ou ailleurs compte pareil.
      Choisis le trick à entraîner via le menu déroulant sur l'écran Drill,
      puis <strong>Lancer</strong>. Une fois les deux objectifs atteints,
      l'écran affiche <strong>Mission réussie !</strong> et le trick passe
      dans la liste des "Domptés" de l'Historique.
    </p>

    <h3 class="section-title">Familles perso</h3>
    <p>
      Construis tes propres familles depuis Réglages : coche les grinds, les
      variations, les rotations, les switch-ups que tu veux, puis
      <strong>Terminé</strong> ouvre l'aperçu des tricks possibles avec ces
      réglages exacts. De là :
    </p>
    <ul class="bullets">
      <li>
        <strong>Créer une famille perso</strong> — sauvegarde toute la liste
        comme une nouvelle famille, entraînable depuis Famille/Mix comme
        n'importe quelle autre.
      </li>
      <li>
        <strong>+ Drill</strong> par ligne (accessible aussi via "Ajouter un
        drill" sur l'écran Drill) — ajoute un seul trick précis de la liste
        directement à ta liste Drill.
      </li>
    </ul>
    <p>
      Tes familles perso s'exportent et s'importent indépendamment d'une
      sauvegarde complète (Réglages) — pratique pour les partager ou les
      garder à l'abri d'une réinstallation.
    </p>

    <h3 class="section-title">L'historique</h3>
    <p>
      Rangé par onglets, tout ce que l'app a enregistré (sauf le mode Groupe,
      volontairement laissé de côté) :
    </p>
    <table class="data-table">
      <tbody>
        <tr>
          <td><strong>Aperçu</strong></td>
          <td>
            Vue d'ensemble : tricks uniques, nombre de sessions, meilleure
            chaîne Combo, progression Carrière (Normal/Switch), badges. Accès
            rapide au rapport mensuel et à la réinitialisation complète.
          </td>
        </tr>
        <tr>
          <td><strong>Sessions</strong></td>
          <td>
            Chaque session (Solo, Carrière, Famille, Mix, Points faibles,
            Révision, BLADE VS), avec son étiquette de mode, filtrable par
            mode ou par trick — dépliable pour le détail complet.
          </td>
        </tr>
        <tr>
          <td><strong>Par trick</strong></td>
          <td>
            Cherche un trick précis (réussi, raté, ou passé) : graphique de
            progression s'il a été réussi 2 fois ou plus, sessions où il est
            apparu, et une liste toujours visible des tricks jamais réussis.
            Filtrable par statut (tous / réussis / jamais réussis).
          </td>
        </tr>
        <tr>
          <td><strong>Switch up</strong></td>
          <td>
            Même principe que "Par trick", groupé d'abord par 1er trick (celui
            avant le switch-up), puis par switch-up précis — graphique et
            sessions inclus.
          </td>
        </tr>
        <tr>
          <td><strong>Combos</strong></td>
          <td>
            Meilleure chaîne, graphique de tous tes runs dans l'ordre
            chronologique (chaque point annoté du nombre de tricks réussis),
            et le détail de chaque run — où ça s'est arrêté, ou "chemin
            terminé" pour un run complet.
          </td>
        </tr>
        <tr>
          <td><strong>BLADE VS</strong></td>
          <td>Palmarès victoires/défaites/nuls, et la liste de tous tes matchs.</td>
        </tr>
        <tr>
          <td><strong>Drill</strong></td>
          <td>
            Tes entrées en cours (jauges total + série), les suggestions
            automatiques à ajouter en un tap, et la liste des tricks domptés.
          </td>
        </tr>
      </tbody>
    </table>
    <p>
      Le bouton <strong>Réinitialiser</strong> (onglet Aperçu) efface tout ce
      qui précède — sessions, badges, progression Carrière/Famille, Combos,
      BLADE VS, Drill — sans jamais toucher tes réglages (voix, couleurs,
      entraînement ciblé...) ni tes familles perso.
    </p>

    <h3 class="section-title">Contrôle vocal &amp; Mode Focus</h3>
    <p>
      Le contrôle vocal (Réglages) écoute "réussi", "raté" et "passe" pendant
      un tirage, dans tous les modes qui s'y prêtent (Solo, BLADE VS, Combo,
      Drill) — pratique pour ne pas avoir à toucher le téléphone entre deux
      passages sur le rail. "Annule" annule le dernier trick, "répète" fait
      relire le nom du trick en cours. Il se met en pause automatiquement dès
      qu'un panneau s'ouvre par-dessus, ou que l'app passe en arrière-plan.
    </p>
    <p>
      Le <strong>Mode Focus</strong> (bouton en haut de l'écran de tirage en
      Solo/Famille/Mix/Carrière) simplifie l'écran au strict minimum pour
      gérer le téléphone en pleine session sans se laisser distraire.
    </p>

    <h3 class="section-title">Sauvegarde</h3>
    <p>
      Tout vit uniquement sur cet appareil. Réglages propose un export complet
      (collection + historique + réglages + familles perso) à envoyer où tu
      veux, et une sauvegarde silencieuse automatique s'exécute une fois par
      jour en local. Aucune des deux ne survit à une désinstallation de l'app —
      pense à exporter avant de réinstaller, puis à réimporter le fichier
      après coup.
    </p>

    <h3 class="section-title">Repères</h3>
    <table class="data-table">
      <tbody>
        <tr>
          <td><AppIcon name="question" /></td>
          <td>Affiche une description du trick en cours.</td>
        </tr>
        <tr>
          <td><AppIcon name="sound" /></td>
          <td>Lit le nom du trick à voix haute.</td>
        </tr>
        <tr>
          <td><AppIcon name="target" /></td>
          <td>Ajoute le trick affiché à ta liste Drill.</td>
        </tr>
        <tr>
          <td><AppIcon name="settings" /></td>
          <td>Réglages du jeu et création de familles perso. Sauvegardé sur cet appareil.</td>
        </tr>
        <tr>
          <td><AppIcon name="book" /></td>
          <td>Recherche des noms de tricks dans le Tricktionary.</td>
        </tr>
        <tr>
          <td><AppIcon name="trophy" /></td>
          <td>Ta collection de tricks, tes badges et ta progression par grind.</td>
        </tr>
        <tr>
          <td><AppIcon name="list" /></td>
          <td>L'Historique complet, par onglets.</td>
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
      C'est incroyable de voir à quel point les tricks de grind sont variés.
      <a
        href="https://www.youtube.com/watch?v=Chpys46GZAY"
        target="_blank"
        rel="noopener"
      >
        J'adore le roller</a
      >.
    </p>
    <ul class="links">
      <li v-for="ref in REFERENCES" :key="ref.url">
        <a :href="ref.url" target="_blank" rel="noopener">{{ ref.name }}</a>
      </li>
    </ul>

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

.bullets {
  padding-left: 22px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
  list-style: disc;
}

.data-table {
  margin: 8px 0 16px;
}

.data-table td:first-child {
  white-space: nowrap;
  color: var(--red-hi);
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