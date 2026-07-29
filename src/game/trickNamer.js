import { GRIND_SYNONYMS } from "./trickData.js";

export function nameTrick(slots, options = {}) {
  const bySlot = (slotName) =>
    slots.find((s) => s && s.name === slotName) || null;

  let approach = bySlot("Approach");
  const grind = bySlot("Grind");
  let spinTo = bySlot("SpinTo");
  spinTo = spinTo && spinTo.winner.name === "None" ? null : spinTo;
  let variation = bySlot("GrindVariation");
  variation = variation && variation.winner ? variation : null;
  let switchUp = bySlot("SwitchUp");
  switchUp =
    switchUp && switchUp.winner && switchUp.winner.name !== "None"
      ? switchUp
      : null;
  let switchSpin = bySlot("SwitchSpin");
  switchSpin =
    switchSpin && switchSpin.winner && switchSpin.winner.name !== "None"
      ? switchSpin
      : null;
  let switchUpVariation = bySlot("SwitchUpVariation");
  switchUpVariation =
    switchUpVariation && switchUpVariation.winner ? switchUpVariation : null;
  let spinOff = bySlot("SpinOff");
  spinOff = spinOff && spinOff.winner.name === "None" ? null : spinOff;

  if (!approach || !approach.winner) {
    approach = { winner: { name: "Forwards" } };
  }

  const orig = [
    approach.winner.name,
    spinTo && spinTo.winner.name,
    variation
      ? `${variation.winner.name} ${grind.winner.name}`
      : grind.winner.name,
    switchSpin && switchSpin.winner.name,
    switchUp &&
      (switchUpVariation && switchUpVariation.winner.name !== "None"
        ? `${switchUpVariation.winner.name} ${switchUp.winner.name}`
        : switchUp.winner.name),
    spinOff && spinOff.winner.name,
  ].filter(Boolean);

  const isGroove =
    grind.winner.isGrooveGrind === true || grind.winner.isGroove === true;
  const isFakie = approach.winner.isFakie === true;
  const hasSpin = !!spinTo;
  const isInspin = hasSpin && spinTo.winner.name.includes("Inspin");
  const isOutspin = hasSpin && spinTo.winner.name.includes("Outspin");

  // Whether this trick is entered "backwards" relative to a plain
  // straight-in approach — either because the approach itself is Fakie
  // (including Zerospin, which has no spin at all), or because there's
  // a real spin-in that doesn't land you back facing forward. A 180 or
  // 540 (odd multiple of 180) does turn you around — that's the actual
  // Alley-oop/True. A 360 or 720 (even multiple) brings you all the way
  // back to facing forward, so it stays a plain forward trick (e.g. a
  // forward 360 into Torque Soul is "360 Torque Soul", never "Soyale").
  // Used to pick grind synonyms like Kindgrind/Soyale over their plain
  // straight-in counterpart (Sweatstance/Torque Soul).
  const isReverse = !isGroove && (isFakie || (hasSpin && isReverseSpinDegree(spinTo.winner.name)));

  let approachName = parseApproach(approach, isFakie, hasSpin, isGroove);
  const spinName = parseSpinTo(spinTo, isGroove, isInspin, isOutspin, isFakie);

  const impliesFakie = ["Halfcab", "Fullcab", "True Halfcab", "True Fullcab"];
  if (approachName && impliesFakie.some((cab) => spinName.includes(cab))) {
    approachName = approachName.replace("Fakie", "").replace(" ", "");
  }

  // Rotation between the two grinds: 180/360/540 use the same soul-style
  // names as a normal spin in (Alley-oop / True / Hurricane); 270/450
  // (only possible when the two grinds are of different types) have no
  // such stylized name, so they're shown as plain numbers.
  const switchUpIsGroove = !!(switchUp && switchUp.winner.isGroove);
  // Only ever one groove side in a cross-type (270/450) transition —
  // pass along whichever grind that is, so nameSwitchSpin can read its
  // FS/BS orientation. Same-type transitions (both true or both false)
  // ignore this entirely.
  const crossTypeGrooveName =
    isGroove !== switchUpIsGroove
      ? isGroove
        ? grind.winner.name
        : switchUp.winner.name
      : null;
  const switchSpinName = nameSwitchSpin(switchSpin, crossTypeGrooveName);

  const switchUpVariationName =
    switchUpVariation && switchUpVariation.winner.name !== "None"
      ? switchUpVariation.winner.name
      : null;

  // Same rule as the first grind's isReverse: a spin transition into a
  // soul target triggers the synonym swap (all known synonyms are soul
  // grinds) only if it doesn't land back facing forward — "no
  // transition at all", a groove target, or a 360/720 transition all
  // keep the plain name.
  const switchUpIsReverse =
    !switchUpIsGroove && !!switchSpin && isReverseSpinDegree(switchSpin.winner.name);
  // switchSpinName is folded into the same string as the grind name
  // (rather than joined on afterwards) so a reverse synonym's stripping
  // of the literal "Alley-oop"/"Topside" text below also reaches it —
  // otherwise a synonym whose own name already bakes in "AO" (e.g. "AO
  // Top Mistrial") would leave the real rotation's "Alley-oop" text
  // untouched, and the final abbreviation pass would turn that into a
  // second, duplicate "AO".
  const switchUpName = switchUp
    ? applyGrindSynonym(
        [switchSpinName, switchUpVariationName, switchUp.winner.name]
          .filter(Boolean)
          .join(" "),
        switchUp.winner.name,
        {
          isReverse: switchUpIsReverse,
          isTopside: !!(switchUpVariationName && switchUpVariationName.includes("Topside")),
          isNegative: !!(switchUpVariationName && switchUpVariationName.includes("Negative")),
          isRough: !!(switchUpVariationName && switchUpVariationName.includes("Rough")),
        }
      )
    : null;

  const switchUpToken = switchUpName
    ? `to ${options.switchUpSwitch ? "Switch " : ""}${switchUpName}`
    : null;

  const tokens = [
    approachName,
    spinName,
    variation && variation.winner.name,
    grind.winner.name,
    switchUpToken,
    spinOff && `to ${parseSpinOff(spinOff, hasSpin, isInspin)} out`,
  ].filter(Boolean);

  let result = applyGrindSynonym(tokens.join(" "), grind.winner.name, {
    isReverse,
    isTopside: !!(variation && variation.winner.name.includes("Topside")),
    isNegative: !!(variation && variation.winner.name.includes("Negative")),
    isRough: !!(variation && variation.winner.name.includes("Rough")),
  });

  result = result
    .replace(/Topside/g, "Top")
    .replace(/Alley-oop/g, "AO")
    .replace(/to Forwards out/g, "")
    .replace(/Forwards/g, "")
    .replace(/90 /, "")
    .replace(/None/, "")
    .replace(/ {2}/g, " ")
    .replace(/ {2}/g, " ");

  return { parsed: result.trim(), orig: orig.join(" | ") };
}

// A spin degree counts as "reverse" (turns you around) unless it's a
// multiple of 360 — that brings you all the way back to facing
// forward regardless of direction (180/540/900 do turn you around;
// 360/720 don't). Cross-type groove transitions (270/450) have no
// forward-facing equivalent, so they always count as reverse.
function isReverseSpinDegree(name) {
  const match = name && name.match(/(\d+)/);
  if (!match) {
    return false;
  }
  return parseInt(match[1], 10) % 360 !== 0;
}

function parseApproach(approach, isFakie, hasSpin, isGroove) {
  let name = approach.winner.name || "";
  if (name === "Forwards & Natural") {
    name = "";
  } else if (name === "Fakie & Natural") {
    name = "Fakie";
  } else if (name === "Forwards & Switch") {
    name = "Switch";
  } else if (name === "Fakie & Switch") {
    name = "Fakie Switch";
  }

  if (isFakie && !hasSpin && !isGroove) {
    name = approach.winner.name.includes("Switch")
      ? "Switch Zerospin"
      : "Zerospin";
  }
  return name;
}

function parseSpinTo(spinTo, isGroove, isInspin, isOutspin, isFakie) {
  if (!spinTo || !spinTo.winner.name) {
    return "";
  }
  let name = spinTo.winner.name;

  if (!isGroove && !isFakie) {
    if (name.includes("180")) {
      name = isInspin ? "Alley-oop" : "True";
    } else if (name.includes("360")) {
      name = isInspin ? "360" : "Hurricane";
    } else if (name.includes("540")) {
      name = isInspin ? "540 Alley-oop" : "540 Hurricane";
    } else if (name.includes("720")) {
      name = isInspin ? "720" : "720 Hurricane";
    } else if (name.includes("900")) {
      name = isInspin ? "900 Alley-oop" : "900 Hurricane";
    }
  }

  if (!isGroove && isFakie) {
    if (isInspin && name.includes("180")) {
      name = "Halfcab";
    }
    if (isInspin && name.includes("360")) {
      name = "Fullcab";
    }
    if (isOutspin && name.includes("180")) {
      name = "True Halfcab";
    }
    if (isOutspin && name.includes("360")) {
      name = "True Fullcab";
    }
    if (isOutspin && name.includes("540")) {
      name = "True Fullcab 540";
    }
    if (isOutspin && name.includes("720")) {
      name = "True Fullcab 720";
    }
    if (isOutspin && name.includes("900")) {
      name = "True Fullcab 900";
    }
  }

  return name.replace("Inspin", "").replace("Outspin", "").replace("None", "");
}

// Names the rotation between the two switch-up grinds. 180/360/540 use
// the normal soul-style Alley-oop/True/Hurricane names. 270/450 only
// happen on a cross-type transition (soul<->groove) — same convention
// as a groove grind's own spin-in (see families.js groove270Entries):
// Outspin is the "forward" rotation for an FS-type grind, Inspin for a
// BS-type one, and THAT direction is what reads as "Alley-oop" here
// (the other direction is "True"), even though that's the opposite of
// Inspin/Outspin's meaning for a same-type (180/360/540) rotation.
function isFrontsideGrindName(name) {
  return name === "Frontside" || name.includes("FS ");
}

function nameSwitchSpin(switchSpin, crossTypeGrooveName) {
  if (!switchSpin) {
    return "";
  }
  const name = switchSpin.winner.name;
  const isInspin = name.includes("Inspin");
  if (name.includes("270") || name.includes("450")) {
    if (crossTypeGrooveName) {
      const isFrontside = isFrontsideGrindName(crossTypeGrooveName);
      const isAlleyOop = isFrontside ? !isInspin : isInspin;
      const label = isAlleyOop ? "Alley-oop" : "True";
      return name.includes("450") ? `450 ${label}` : label;
    }
    return name.includes("450") ? "450" : "270";
  }
  if (name.includes("180")) {
    return isInspin ? "Alley-oop" : "True";
  }
  if (name.includes("360")) {
    return isInspin ? "360" : "Hurricane";
  }
  if (name.includes("540")) {
    return isInspin ? "540 Alley-oop" : "540 Hurricane";
  }
  return "";
}

function parseSpinOff(spinOff, hasSpin, isInspin) {
  const name = spinOff.winner.name;
  const isRewind =
    hasSpin &&
    ((isInspin && name.includes("Outspin")) ||
      (!isInspin && name.includes("Inspin")));

  const cleaned = name
    .replace("Inspin", "")
    .replace("Outspin", "")
    .replace("None", "");
  return isRewind ? `${cleaned} rewind` : cleaned;
}

function applyGrindSynonym(result, grindName, props) {
  const synonym = GRIND_SYNONYMS.filter((syn) => syn.name === grindName).find(
    (syn) =>
      !(syn.isReverse && !props.isReverse) &&
      !(syn.isTopside && !props.isTopside) &&
      !(syn.isNegative && !props.isNegative) &&
      !(syn.isRough && !props.isRough)
  );
  if (!synonym) {
    return result;
  }

  result = result.replace(grindName, synonym.newName);
  if (synonym.isReverse) {
    result = result.replace("Alley-oop", "");
  }
  if (synonym.isTopside) {
    result = result.replace("Topside", "");
  }
  if (synonym.isNegative) {
    result = result.replace("Negative&", "").replace("Negative", "");
  }
  if (synonym.isRough) {
    result = result.replace("Rough", "");
  }
  return result;
}