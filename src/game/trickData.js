/**
 * The trick database.
 *
 * A grind trick is split into 5 phases, one per slot machine reel:
 *   Approach → Spin to grind → Grind → Grind variation → Spin off grind.
 *
 * `weight` controls how often an entry appears on a reel (higher = more
 * likely). `score` is the number of points the entry is worth; grinds
 * default to 2 ("average") when not specified.
 */

const RARE = 1;
const MEDIUM = 3;
const EASY = 4;

export const APPROACHES = [
  { name: "Forwards", weight: EASY, isFakie: false, isSwitch: false, score: 0 },
  {
    name: "Fakie",
    weight: MEDIUM,
    isFakie: true,
    isSwitch: false,
    score: 1,
    url: "http://skateyeg.com/bog/05.0_Fakie.html",
  },
  {
    name: "Switch",
    weight: MEDIUM,
    isFakie: false,
    isSwitch: true,
    score: 1,
    url: "http://skateyeg.com/bog/04.0_Switch.html",
  },
  {
    name: "Fakie & Switch",
    weight: RARE,
    isFakie: true,
    isSwitch: true,
    score: 3,
    url: "http://skateyeg.com/bog/04.0_Switch.html",
  },
];

// Spin tables. Soul grinds spin in 180-degree steps. Groove grinds land
// perpendicular to the obstacle, so their spins are +/- 90 degrees
// (270, 450, ...). Frontside groove spins differ between forwards and
// fakie approaches; backside groove spins are the same either way.
export const SPINS_TO_SOUL = [
  { name: "None", weight: EASY, score: 0 },
  { name: "Outspin 180", weight: 1, score: 1 },
  { name: "Inspin 180", weight: 1, score: 1 },
  { name: "Inspin 360", weight: 1, score: 2 },
  { name: "Outspin 360", weight: 1, score: 2 },
  { name: "Inspin 540", weight: 1, score: 3 },
  { name: "Outspin 540", weight: 1, score: 3 },
  { name: "Inspin 720", weight: 1, score: 4 },
  { name: "Outspin 720", weight: 1, score: 4 },
  { name: "Inspin 900", weight: 1, score: 5 },
  { name: "Outspin 900", weight: 1, score: 5 },
];

// Fakie to soul: same degrees as forwards, plus "None" — landing fakie
// with no rotation at all is a Zerospin (any grind), handled by the
// namer's isFakie && !hasSpin && !isGroove check. Weighted low/EASY
// like the forward pool's None, not a coin flip with every other degree.
export const SPINS_TO_SOUL_FAKIE = [
  { name: "None", weight: EASY, score: 0 },
  { name: "Inspin 180", weight: 1, score: 1 },
  { name: "Outspin 180", weight: 1, score: 1 },
  { name: "Inspin 360", weight: 1, score: 2 },
  { name: "Outspin 360", weight: 1, score: 2 },
  { name: "Inspin 540", weight: 1, score: 3 },
  { name: "Outspin 540", weight: 1, score: 3 },
  { name: "Inspin 720", weight: 1, score: 4 },
  { name: "Outspin 720", weight: 1, score: 4 },
  { name: "Inspin 900", weight: 1, score: 5 },
  { name: "Outspin 900", weight: 1, score: 5 },
];

export const SPINS_TO_GROOVE_FS = [
  { name: "None", weight: EASY, score: 0 },
  { name: "Outspin 270", weight: 1, score: 2 },
  { name: "Inspin 450", weight: 1, score: 3 },
  { name: "Outspin 630", weight: 1, score: 4 },
  { name: "Inspin 810", weight: 1, score: 5 },
];

export const SPINS_TO_GROOVE_FS_FAKIE = [
  { name: "None", weight: EASY, score: 0 },
  { name: "Outspin 270", weight: 1, score: 3 },
  { name: "Inspin 450", weight: 1, score: 3 },
  { name: "Outspin 630", weight: 1, score: 4 },
  { name: "Inspin 810", weight: 1, score: 5 },
];

export const SPINS_TO_GROOVE_BS = [
  { name: "None", weight: EASY, score: 0 },
  { name: "Inspin 270", weight: 1, score: 2 },
  { name: "Outspin 450", weight: 1, score: 3 },
  { name: "Inspin 630", weight: 1, score: 4 },
  { name: "Outspin 810", weight: 1, score: 5 },
];

export const SPINS_OFF_SOUL = [
  { name: "None", weight: EASY, score: 0 },
  { name: "Inspin 180", weight: 1, score: 1 },
  { name: "Outspin 180", weight: 1, score: 1 },
  { name: "Outspin 360", weight: 1, score: 2 },
  { name: "Inspin 360", weight: 1, score: 2 },
  { name: "Outspin 540", weight: 1, score: 3 },
  { name: "Inspin 540", weight: 1, score: 3 },
  { name: "Outspin 720", weight: 1, score: 4 },
  { name: "Inspin 720", weight: 1, score: 4 },
  { name: "Outspin 900", weight: 1, score: 5 },
  { name: "Inspin 900", weight: 1, score: 5 },
];

export const SPINS_OFF_GROOVE = [
  { name: "Forwards", weight: EASY, score: 0 },
  { name: "Fakie", weight: EASY, score: 0 },
  { name: "270", weight: 1, score: 2 },
  { name: "450", weight: 1, score: 3 },
  { name: "630", weight: 1, score: 4 },
  { name: "810", weight: 1, score: 5 },
];

/**
 * Soul grinds: grinds on the soul plate, no frontside/backside variant.
 * `isSoulGroove` marks hybrids (Tabernacle, Darkslide, ...) — h-block
 * tricks that are named like soul tricks, so they exist as FS and BS.
 * `noSwitch` marks grinds that have no switch stance.
 */
const SOUL_GRINDS = [
  {
    name: "Soul",
    weight: EASY,
    score: 1,
    url: "http://skateyeg.com/bog/02.0_Soul.html",
    comment:
      "Le pied arrière repose sur la semelle (soul plate) et le pied avant glisse sur le h-block, pointant vers l'obstacle.",
    variations: ["Topside", "Negative", "Tough", "Tough Topside"],
  },
  {
    name: "Acid",
    weight: EASY,
    score: 1,
    url: "http://skateyeg.com/bog/05.0_Acid.html",
    comment: "Comme un Soul mais le pied avant est dans la position opposée.",
    variations: ["Topside", "Negative", "Tough", "Tough Topside"],
  },
  {
    name: "Makio",
    weight: EASY,
    score: 1,
    url: "http://skateyeg.com/bog/01.0_Makio.html",
    comment: "Grind soul simple, sur un seul pied.",
    variations: [
      "Topside",
      "Negative",
      "Rough",
      "Tough",
      "Grab",
      "Rocket",
      "Cross-Grab",
      "Christ",
      "Rough Topside",
      "Tough Topside",
      "Grab Topside",
      "Rocket Topside",
      "Cross-Grab Topside",
      "Christ Topside",
      "Grab Negative",
      "Rocket Negative",
      "Cross-Grab Negative",
      "Christ Negative",
    ],
  },
  {
    name: "PStar",
    weight: EASY,
    url: "http://skateyeg.com/bog/04.0_PStar.html",
    comment:
      "(Pornstar) Le pied soul est à l'avant et le pied arrière pointe vers l'obstacle.",
    variations: [
      "Topside",
      "Negative",
      "Rough",
      "Rough Topside",
      "Tough",
      "Tough Topside",
    ],
  },
  {
    name: "Torque Soul",
    weight: MEDIUM,
    url: "http://skateyeg.com/bog/08.0_Torque_Soul.html",
    comment:
      "Le pied arrière est sur la semelle soul, le pied avant sur la plaque backslide.",
    variations: ["Topside", "Negative", "Tough", "Tough Topside"],
  },
  {
    name: "Mistrial",
    weight: MEDIUM,
    url: "http://skateyeg.com/bog/07.0_Mistrial.html",
    comment:
      "Comme un Mizou mais le pied arrière pointe vers l'obstacle. Les deux pieds doivent être proches l'un de l'autre.",
    variations: [
      "Topside",
      "Negative",
      "Rough",
      "Rough Topside",
      "Tough",
      "Tough Topside",
    ],
  },
  {
    name: "Mizou",
    weight: EASY,
    score: 1,
    url: "http://skateyeg.com/bog/03.0_Mizou.html",
    comment:
      "(Miszou) Le pied soul est à l'avant et le pied arrière repose sur le h-block, pointant à l'opposé de l'obstacle.",
    variations: [
      "Topside",
      "Negative",
      "Rough",
      "Rough Topside",
      "Tough",
      "Tough Topside",
    ],
  },
  {
    name: "X-Grind",
    weight: MEDIUM,
    url: "http://skateyeg.com/bog/06.0_X_Grind.html",
    comment:
      "Les X-Grind se font sur les semelles des deux patins. Un X-Grind classique a le pied avant en topside. Un X-Grind topside a le pied arrière en topside.",
    variations: [
      "Topside",
      "Negative",
      "Negative&Topside",
      "Rough",
      "Tough",
      "Rough Topside",
      "Tough Topside",
      "Tough&Rough",
    ],
  },
  {
    name: "BS Tabernacle",
    weight: RARE,
    isSoulGroove: true,
    url: "http://skateyeg.com/bog/12.1_Backside_Tabernacle.html",
    comment: "Comme un Mizou mais avec le pied soul avant en position acid.",
    variations: ["Channel"],
  },
  {
    name: "FS Tabernacle",
    weight: RARE,
    isSoulGroove: true,
    url: "http://skateyeg.com/bog/12.0_Tabernacle.html",
    comment:
      "Comme un Sweatstance mais avec le pied soul avant en position acid.",
    variations: ["Channel"],
  },
  {
    name: "BS Darkslide",
    weight: RARE,
    isSoulGroove: true,
    url: "http://skateyeg.com/bog/14.1_Backside_Darkslide.html",
    comment:
      "(Acid Rain) Comme un Mistrial mais avec le pied soul avant en position acid.",
    variations: ["Channel"],
  },
  {
    name: "FS Darkslide",
    weight: RARE,
    isSoulGroove: true,
    url: "http://skateyeg.com/bog/14.0_Darkslide.html",
    comment:
      "(Acid Rain) Comme un Top Mistrial mais avec le pied soul avant en position acid. Le pied arrière est comme un Frontside Backslide.",
    variations: ["Channel"],
  },
  {
    name: "BS Byn Soul",
    weight: RARE,
    isSoulGroove: true,
    comment: `(Neighborhood) Comme un Top Soul mais avec le pied soul tourné en position Frontside Torque.
      <a target="_blank" href="https://www.picuki.com/media/2251667102534778405">Image</a>.`,
    variations: ["Channel"],
  },
  {
    name: "FS Byn Soul",
    weight: RARE,
    isSoulGroove: true,
    comment: `(Neighborhood) Comme un Soul mais avec le pied soul tourné en position Backside Torque.
      <a target="_blank" href="https://www.picuki.com/media/2251667102534778405">Image</a>.`,
    variations: ["Channel"],
  },
];

/**
 * Groove grinds: h-block based grinds with a frontside and a backside
 * variant. There is no alley-oop naming for grooves — an alley-oop
 * Royale simply is a Full Torque.
 */
const GROOVE_GRINDS = [
  {
    name: "FS Royale",
    weight: MEDIUM,
    url: "http://skateyeg.com/bog/03.0_Royale.html",
    comment:
      "(Shifty) Grind sur le bord intérieur du patin avant, et sur le bord extérieur du patin arrière.",
    variations: ["Channel"],
  },
  {
    name: "BS Royale",
    weight: MEDIUM,
    url: "http://skateyeg.com/bog/03.1_Backside_Royale.html",
    comment:
      "(Shifty) Grind sur le bord intérieur du patin avant, et sur le bord extérieur du patin arrière.",
    variations: ["Channel"],
  },
  {
    name: "FS Unity",
    weight: MEDIUM,
    url: "http://skateyeg.com/bog/07.0_Unity.html",
    comment:
      "(Buddha) Jambes croisées sur les deux plaques backslide, le pied arrière passant par-dessus le pied avant.",
    variations: ["Channel"],
  },
  {
    name: "BS Unity",
    weight: MEDIUM,
    url: "http://skateyeg.com/bog/07.1_Backside_Unity.html",
    comment:
      "(Buddha) Jambes croisées sur les deux plaques backslide, le pied arrière passant par-dessus le pied avant.",
    variations: ["Channel"],
  },
  {
    name: "FS Torque",
    weight: MEDIUM,
    url: "http://skateyeg.com/bog/05.0_Torque.html",
    comment: "Comme un Full Torque sur un seul pied.",
    variations: ["Grab", "Rocket", "Cross-Grab", "Christ", "Channel"],
  },
  {
    name: "BS Torque",
    weight: MEDIUM,
    url: "http://skateyeg.com/bog/05.1_Backside_Torque.html",
    comment: "Comme un Full Torque sur un seul pied.",
    variations: ["Grab", "Rocket", "Cross-Grab", "Christ", "Channel"],
  },
  {
    name: "FS Cab driver",
    weight: RARE,
    score: 3,
    url: "http://skateyeg.com/bog/09.0_Cab_driver.html",
    comment:
      "(Cowboy, Lucky Grind) Glisser un torque et un backslide en même temps sans croiser les jambes.",
    variations: ["Channel"],
  },
  {
    name: "BS Cab driver",
    weight: RARE,
    score: 3,
    url: "http://skateyeg.com/bog/09.1_Backside_Cab_driver.html",
    comment:
      "(Cowboy, Lucky Grind) Glisser un torque et un backslide en même temps sans croiser les jambes.",
    variations: ["Channel"],
  },
  {
    name: "FS Backslide",
    weight: RARE,
    url: "http://skateyeg.com/bog/06.0_Backslide.html",
    comment: "Comme un Royale sur un seul pied, grindé sur le pied arrière.",
    variations: ["Grab", "Rocket", "Cross-Grab", "Christ", "Channel"],
  },
  {
    name: "BS Backslide",
    weight: RARE,
    url: "http://skateyeg.com/bog/06.1_Backside_Backslide.html",
    comment: "Comme un Royale sur un seul pied, grindé sur le pied arrière.",
    variations: ["Grab", "Rocket", "Cross-Grab", "Christ", "Channel"],
  },
  {
    name: "FS Pudslide",
    weight: RARE,
    score: 3,
    url: "http://skateyeg.com/bog/11.0_Pudslide.html",
    comment:
      "Comme un Backslide mais avec la cheville pliée vers l'extérieur au lieu de l'intérieur.",
    variations: ["Grab", "Rocket", "Cross-Grab", "Christ"],
  },
  {
    name: "BS Pudslide",
    weight: RARE,
    score: 3,
    url: "http://skateyeg.com/bog/11.1_Backside_Pudslide.html",
    comment:
      "Comme un Backslide mais avec la cheville pliée vers l'extérieur au lieu de l'intérieur.",
    variations: ["Grab", "Rocket", "Cross-Grab", "Christ"],
  },
  {
    name: "FS Full Torque",
    weight: MEDIUM,
    url: "http://skateyeg.com/bog/04.0_Full_Torque.html",
    comment:
      "(Fahrvergnuegen, Fahrve, Nugen) Comme un Royale mais grindé en marche arrière.",
    variations: ["Channel"],
  },
  {
    name: "BS Full Torque",
    weight: MEDIUM,
    url: "http://skateyeg.com/bog/04.1_Backside_Full_Torque.html",
    comment:
      "(Fahrvergnuegen, Fahrve, Nugen) Comme un Royale mais grindé en marche arrière.",
    variations: ["Channel"],
  },
  {
    name: "FS Fastslide",
    weight: RARE,
    score: 3,
    url: "http://skateyeg.com/bog/10.0_Fastslide.html",
    comment:
      "Comme un Torque mais sans le pied posé sur la plaque backslide (cheville tendue).",
    variations: ["Grab", "Rocket", "Cross-Grab", "Christ", "Channel"],
  },
  {
    name: "BS Fastslide",
    weight: RARE,
    score: 3,
    url: "http://skateyeg.com/bog/10.1_Backside_Fastslide.html",
    comment:
      "Comme un Torque mais sans le pied posé sur la plaque backslide (cheville tendue).",
    variations: ["Grab", "Rocket", "Cross-Grab", "Christ", "Channel"],
  },
  {
    name: "Frontside",
    weight: MEDIUM,
    score: 1,
    url: "http://skateyeg.com/bog/01.0_Frontside.html",
    comment:
      "Le rider tourne à 90° et pose les deux h-blocks (la rainure entre les roues du milieu) sur l'obstacle, torse face à celui-ci.",
    variations: ["Channel"],
  },
  {
    name: "Backside",
    weight: MEDIUM,
    score: 1,
    url: "http://skateyeg.com/bog/02.0_Backside.html",
    comment:
      "Le rider tourne à 90° et glisse perpendiculairement à l'obstacle, dos tourné à celui-ci.",
    variations: ["Channel"],
  },
  {
    name: "FS Savannah",
    weight: RARE,
    url: "http://skateyeg.com/bog/09.0_Savannah_(AO_Unity).html",
    comment:
      "Jambes croisées sur les deux plaques backslide, le pied arrière passant derrière le pied avant.",
    variations: ["Channel"],
  },
  {
    name: "BS Savannah",
    weight: RARE,
    url: "http://skateyeg.com/bog/09.1_Backside_Savannah_(AO_BS_Unity).html",
    comment:
      "Jambes croisées sur les deux plaques backslide, le pied arrière passant derrière le pied avant.",
    variations: ["Channel"],
  },
];

/**
 * Grind variations. The master list: per-grind variation lists above
 * reference these by name. `score`/`weight` always come from here.
 */
export const VARIATIONS = [
  { name: "None", weight: EASY, score: 0, noThumb: true },
  {
    name: "Topside",
    weight: EASY,
    score: 1,
    url: "http://skateyeg.com/bog/03.0_Topside_(Top).html",
    comment:
      "Un Topside, c'est quand le châssis du patin est amené par-dessus l'obstacle et posé dessus, pendant que la semelle reste en dessous.",
  },
  {
    name: "Negative",
    weight: RARE,
    score: 2,
    url: "http://skateyeg.com/bog/11.0_Negative.html",
    comment:
      "Grinder sur la semelle intérieure au lieu de la semelle extérieure.",
  },
  {
    name: "Rough",
    weight: RARE,
    score: 2,
    url: "http://skateyeg.com/bog/08.0_Rough_(Heel).html",
    comment:
      "Grinder sur le talon au lieu de tout le pied soul (Rough Mizou, Rough Sweatstance, ..)",
  },
  {
    name: "Tough",
    weight: RARE,
    score: 2,
    url: "http://skateyeg.com/bog/07.0_Tough_(Toe).html",
    comment:
      "(Tokyo) Grinder sur la pointe au lieu de tout le pied soul (Tough Acid, ..)",
  },
  {
    name: "Channel",
    weight: RARE,
    score: 2,
    url: "http://skateyeg.com/bog/18.0_Channel.html",
    comment:
      "Grinder une figure groove entre les roues (Channel Frontside, ..)",
  },
  {
    name: "Rocket",
    weight: MEDIUM,
    score: 2,
    url: "http://skateyeg.com/bog/06.0_Rocket.html",
    comment:
      "Les deux jambes tendues, une main croisée devant elles, attrapant la semelle extérieure opposée.",
  },
  {
    name: "Grab",
    weight: EASY,
    score: 1,
    url: "http://skateyeg.com/bog/17.0_Grabbed.html",
    comment: "Attraper le pied libre pendant un grind sur un seul pied.",
  },
  {
    name: "Cross-Grab",
    weight: MEDIUM,
    score: 2,
    noThumb: true,
    comment:
      "Attraper le patin libre avec la main opposée. Aussi appelé Mute Grab.",
  },
  {
    name: "Christ",
    weight: RARE,
    score: 2,
    url: "http://skateyeg.com/bog/09.0_Christ.html",
    comment:
      "Le pied libre est posé sur la pointe du patin qui grinde, en position de soul grind.",
  },
  // combos
  {
    name: "Rough Topside",
    weight: RARE,
    score: 2,
    noThumb: true,
    comment: "Comme Rough mais en Topside, par exemple un Rough Sweatstance.",
  },
  {
    name: "Cross-Grab Topside",
    weight: RARE,
    score: 2,
    noThumb: true,
    comment: "Comme Cross-Grab mais avec un Topside.",
  },
  {
    name: "Cross-Grab Negative",
    weight: RARE,
    score: 3,
    noThumb: true,
    comment: "Comme Cross-Grab mais avec un Negative.",
  },
  {
    name: "Christ Topside",
    weight: RARE,
    score: 2,
    noThumb: true,
    comment: "Comme Christ mais avec un Topside.",
  },
  {
    name: "Christ Negative",
    weight: RARE,
    score: 3,
    noThumb: true,
    comment: "Comme Christ mais avec un Negative.",
  },
  {
    name: "Tough Topside",
    weight: RARE,
    score: 2,
    noThumb: true,
    comment: "Comme Tough mais en Topside.",
  },
  {
    name: "Grab Topside",
    weight: MEDIUM,
    score: 2,
    noThumb: true,
    comment: "Comme Grab mais avec un Topside.",
  },
  {
    name: "Grab Negative",
    weight: RARE,
    score: 3,
    noThumb: true,
    comment: "Comme Grab mais avec un Negative.",
  },
  {
    name: "Rocket Topside",
    weight: RARE,
    score: 2,
    noThumb: true,
    comment: "Comme Rocket mais avec un Topside.",
  },
  {
    name: "Rocket Negative",
    weight: RARE,
    score: 3,
    noThumb: true,
    comment: "Comme Rocket mais avec un Negative.",
  },
  {
    name: "Negative&Topside",
    weight: RARE,
    score: 3,
    noThumb: true,
    comment: "Utilisé pour un X-Grind Negative ou un Stub Soul",
  },
  {
    name: "Tough&Rough",
    weight: RARE,
    score: 3,
    noThumb: true,
    comment: "Utilisé pour un X-Grind Rough & Tough ou un Duck Hunt",
  },
];

/**
 * Some grind + variation/spin combos have their own name. The namer
 * swaps them in when the trick has the listed properties (isReverse
 * means the grind is entered alley-oop / truespin).
 */
export const GRIND_SYNONYMS = [
  {
    newName: "AO Top Mistrial",
    name: "Mistrial",
    comment: "Alley-oop Topside Mistrial",
    isReverse: true,
    isTopside: true,
    url: "http://skateyeg.com/bog/07.0_Misfit_(AO_Topside_Mistrial).html",
  },
  {
    newName: "Top Mistrial",
    name: "Mistrial",
    comment: "Topside Mistrial",
    isTopside: true,
    url: "http://skateyeg.com/bog/10.0_Overpuss_(Topside_Mistrial).html",
  },
  {
    newName: "Soyale",
    name: "Torque Soul",
    comment: "Alley-oop Torque Soul",
    isReverse: true,
    url: "http://skateyeg.com/bog/04.0_Soyale_(AO_Torque_Soul).html",
  },
  {
    newName: "Fishbrain",
    name: "Makio",
    comment: "Topside Makio",
    isTopside: true,
    url: "http://skateyeg.com/bog/01.0_Fishbrain_(Topside_Makio).html",
  },
  {
    newName: "Kindgrind",
    name: "Mizou",
    comment: "Alley-oop Topside Mizou",
    isReverse: true,
    isTopside: true,
    url: "http://skateyeg.com/bog/03.0_Kindgrind_(AO_Topside_Mizou).html",
  },
  {
    newName: "Sweatstance",
    name: "Mizou",
    comment: "Topside Mizou",
    isTopside: true,
    url: "http://skateyeg.com/bog/02.0_Sweatstance_(Topside_Mizou).html",
  },
  {
    newName: "Top Teakettle",
    name: "PStar",
    comment: "Rough Topside PStar",
    isTopside: true,
    isRough: true,
  },
  {
    newName: "Teakettle",
    name: "PStar",
    comment: "Rough PStar",
    isRough: true,
    url: "http://skateyeg.com/bog/13.0_Tea_Kettle.html",
  },
  {
    newName: "Cloudy Night",
    name: "PStar",
    comment: "Alley-oop Topside PStar",
    isTopside: true,
    isReverse: true,
    url: "http://skateyeg.com/bog/06.0_Cloudy_Night_(AO_Topside_PStar).html",
  },
  {
    newName: "Top PStar",
    name: "PStar",
    comment: "Topside PStar",
    isTopside: true,
    url: "http://skateyeg.com/bog/05.0_Sunny_Day_(Topside_PStar).html",
  },
  {
    newName: "Stub Soul",
    name: "X-Grind",
    comment: "Un X-Grind avec un pied qui grinde la semelle négative.",
    isNegative: true,
    url: "http://skateyeg.com/bog/10.0_Stub_Soul.html",
  },
];

export const GLOSSARY = {
  AO: "(Alley-oop) Forwards vers un 180 Inspin vers un grind soul.",
  True: "(Truespin) Forwards vers un 180 Outspin vers un grind soul.",
  Hurricane: "Forwards vers un 360 Outspin vers un grind soul.",
  Halfcab: "Fakie vers un 180 Inspin vers un grind soul.",
  Fullcab: "Fakie vers un 360 Inspin vers un grind soul.",
  "True Halfcab": "Fakie vers un 180 Outspin vers un grind soul.",
  "True Fullcab": "Fakie vers un 360 Outspin vers un grind soul.",
  Zerospin: "Fakie vers un grind soul, sans rotation.",
  Rewind:
    "(Revert) Sortir d'un grind en tournant dans le sens opposé à la rotation d'entrée.",
  450: "Rotation de 360 vers/hors d'un grind groove. Le chemin le plus long (360 + 90 degrés).",
  270: "Rotation de 360 vers/hors d'un grind groove. Le chemin le plus court (360 - 90 degrés).",
  810: "Rotation de 720 vers/hors d'un grind groove. Le chemin le plus long (720 + 90 degrés).",
  630: "Rotation de 720 vers/hors d'un grind groove. Le chemin le plus court (720 - 90 degrés).",
  Switch:
    "(Unnatural) Grinder dans la position miroir non naturelle d'un grind. Dans ce jeu, Switch s'applique uniquement aux grinds, pas au sens de rotation.",
  Fakie:
    "Aborder l'obstacle en roulant en arrière. Utilisé aussi pour atterrir un grind groove en arrière sans rotation (Royale to Fakie).",
  Forwards: "Forwards est l'opposé de Fakie.",
  Natural: "Natural est l'opposé de Switch.",
  Inspin: `Rotation vers l'obstacle.
    Si l'obstacle est à ta gauche, Inspin est une rotation vers la gauche (sens antihoraire).
    Si l'obstacle est à ta droite, Inspin est une rotation vers la droite (sens horaire).`,
  Outspin: `Rotation à l'opposé de l'obstacle, aussi appelée "Blindside" dans d'autres sports.
    Si l'obstacle est à ta gauche, Outspin est une rotation vers la droite (sens horaire).
    Si l'obstacle est à ta droite, Outspin est une rotation vers la gauche (sens antihoraire).`,
  "Frontside/FS": "Frontside",
  "Backside/BS": "Backside",
  "Soul grinds":
    "Grind basé sur la semelle (soul), sans variante frontside ou backside.",
  "Groove grinds":
    "(Boot/Frame grinds) Grind basé sur le h-block, avec une variante frontside et une variante backside.",
};

export const OBSTACLE_VARIATIONS = [
  { name: "Darkside", url: "http://skateyeg.com/bog/13.0_Darkside.html" },
  { name: "Farside", url: "http://skateyeg.com/bog/12.0_Farside.html" },
  { name: "Disaster", url: "http://skateyeg.com/bog/14.0_Disaster.html" },
];

// Grinds excluded unless the "rare grinds" setting is on.
// Matched by substring so BS/FS variants are covered.
export const RARE_GRIND_NAME_PARTS = ["Byn Soul", "Darkslide"];

export function thumbUrl(name) {
  return `img/captures/200x200/${name.replaceAll(" ", "")}.jpg`;
}

function finalizeGrind(grind, isGroove) {
  return {
    score: 2,
    ...grind,
    isGroove,
    thumbUrl: thumbUrl(grind.name),
  };
}

export const GRINDS = [
  ...SOUL_GRINDS.map((g) => finalizeGrind(g, false)),
  ...GROOVE_GRINDS.map((g) => finalizeGrind(g, true)),
];

export function variationByName(name) {
  return VARIATIONS.find((v) => v.name === name);
}