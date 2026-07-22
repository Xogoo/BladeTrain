import { GRIND_SYNONYMS } from "./trickData.js";

export function nameTrick(slots) {
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

  let isReverse = false;
  if (!isGroove && !isFakie) {
    isReverse =
      hasSpin &&
      (spinTo.winner.name.includes("180") ||
        spinTo.winner.name.includes("540"));
  } else if (!isGroove && isFakie) {
    isReverse = hasSpin && spinTo.winner.name.includes("360");
  }

  let approachName = parseApproach(approach, isFakie, hasSpin, isGroove);
  isReverse = approachName === "Zerospin" ? true : isReverse;
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
  const switchSpinName = nameSwitchSpin(switchSpin);

  const switchUpVariationName =
    switchUpVariation && switchUpVariation.winner.name !== "None"
      ? switchUpVariation.winner.name
      : null;

  // Same rule as the first grind's isReverse: soul target + 180° or
  // 540° triggers the synonym swap (all known synonyms are soul
  // grinds); groove targets and 270/450 transitions never do.
  const switchUpIsReverse =
    !switchUpIsGroove &&
    !!switchSpin &&
    (switchSpin.winner.name.includes("180") ||
      switchSpin.winner.name.includes("540"));
  const switchUpName = switchUp
    ? applyGrindSynonym(
        [switchUpVariationName, switchUp.winner.name].filter(Boolean).join(" "),
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
    ? `to ${[switchSpinName, switchUpName].filter(Boolean).join(" ")}`
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
    .replace("Topside", "Top")
    .replace("Alley-oop", "AO")
    .replace(/to Forwards out/g, "")
    .replace(/Forwards/g, "")
    .replace(/90 /, "")
    .replace(/None/, "")
    .replace(/ {2}/g, " ")
    .replace(/ {2}/g, " ");

  return { parsed: result.trim(), orig: orig.join(" | ") };
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

// Names the rotation between the two switch-up grinds. 180/360/540
// borrow the normal soul spin names; 270/450 (different-type
// transitions) have no such name and are shown as-is.
function nameSwitchSpin(switchSpin) {
  if (!switchSpin) {
    return "";
  }
  const name = switchSpin.winner.name;
  const isInspin = name.includes("Inspin");
  if (name.includes("270")) {
    return "270";
  }
  if (name.includes("450")) {
    return "450";
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