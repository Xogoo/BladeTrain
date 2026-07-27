import {
  GLOSSARY,
  GRINDS,
  GRIND_SYNONYMS,
  VARIATIONS,
  thumbUrl,
  synonymThumbUrl,
} from "./trickData.js";

/**
 * Builds the explanation for a parsed trick: one row per term the
 * trick name contains (glossary terms, the grind, the variation).
 *
 * @param trick `{ parsed, orig }` as returned by nameTrick.
 * @returns Array of `{ title, comment, thumbUrl?, url? }`.
 */
export function explainTrick(trick) {
  const rows = [];
  // Grind synonyms are matched against the parsed name as-is, before
  // the Topside abbreviation is undone below — several synonyms start
  // with "Top " as part of their own proper name (Top Teakettle, Top
  // PStar, Top Mistrial, AO Top Mistrial), and expanding that to
  // "Topside " first broke their own self-match, silently falling
  // through to a shorter, unrelated synonym instead (e.g. "Top
  // Teakettle" matching plain "Teakettle") or to the generic grind
  // fallback further down, either way showing the wrong comment/URL.
  const synonym = GRIND_SYNONYMS.find((syn) => trick.parsed.includes(syn.newName));

  // Undo the namer's abbreviation so "Top Acid" matches "Topside".
  let rest = trick.parsed.replace("Top ", "Topside");

  if (trick.orig.includes("Inspin") || trick.orig.includes("Outspin")) {
    rows.push({
      title: "Inspin/Outspin",
      comment:
        "Inspin est une rotation vers la droite (sens horaire) si l'obstacle est à ta droite, Outspin est une rotation vers la gauche. Inversement si l'obstacle est à ta gauche.",
    });
  }

  for (const [term, comment] of Object.entries(GLOSSARY)) {
    if (!rest.toLowerCase().includes(term.toLowerCase())) {
      continue;
    }
    // "True Fullcab" is explained as a whole, not as "True" + "Fullcab".
    const isCabPart = ["True", "Halfcab", "Fullcab"].includes(term);
    const hasCabName =
      rest.includes("True Fullcab") || rest.includes("True Halfcab");
    if (isCabPart && hasCabName) {
      continue;
    }
    rows.push({ title: term, comment });
    rest = rest.replace(term, "");
  }

  if (synonym) {
    rows.push({
      title: synonym.newName,
      comment: synonym.comment,
      thumbUrl: synonymThumbUrl(synonym),
      url: synonym.url,
    });
  } else {
    // Longest name first so "Torque Soul" wins over "Soul".
    const grind = [...GRINDS]
      .sort((a, b) => b.name.length - a.name.length)
      .find((g) => rest.includes(g.name));
    if (grind) {
      rows.push({
        title: grind.name
          .replace(/^BS /, "Backside ")
          .replace(/^FS /, "Frontside "),
        comment: grind.comment,
        thumbUrl: grind.thumbUrl,
        url: grind.url,
      });
      rest = rest.replace(grind.name, "");
    }
  }

  // Longest name first so "Cross-Grab Topside" wins over "Grab".
  const variation = [...VARIATIONS]
    .sort((a, b) => b.name.length - a.name.length)
    .find((v) => rest.includes(v.name) && v.name !== "None");
  if (variation) {
    rows.push({
      title: variation.name,
      comment: variation.comment,
      thumbUrl: variation.noThumb ? undefined : thumbUrl(variation.name),
      url: variation.url,
    });
  }

  return rows;
}