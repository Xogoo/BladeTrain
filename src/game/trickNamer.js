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
  // Second switch-up (3rd grind) — only ever meaningful when the first
  // switch-up is actually present too (you can't switch up a second
  // time from nothing); a stray SwitchUp2* slot with no SwitchUp is
  // ignored below rather than trusted.
  let switchUp2 = bySlot("SwitchUp2");
  switchUp2 =
    switchUp2 && switchUp2.winner && switchUp2.winner.name !== "None"
      ? switchUp2
      : null;
  let switchSpin2 = bySlot("SwitchSpin2");
  switchSpin2 =
    switchSpin2 && switchSpin2.winner && switchSpin2.winner.name !== "None"
      ? switchSpin2
      : null;
  let switchUp2Variation = bySlot("SwitchUp2Variation");
  switchUp2Variation =
    switchUp2Variation && switchUp2Variation.winner ? switchUp2Variation : null;
  if (!switchUp) {
    switchUp2 = null;
    switchSpin2 = null;
    switchUp2Variation = null;
  }
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
    switchSpin2 && switchSpin2.winner.name,
    switchUp2 &&
      (switchUp2Variation && switchUp2Variation.winner.name !== "None"
        ? `${switchUp2Variation.winner.name} ${switchUp2.winner.name}`
        : switchUp2.winner.name),
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
  //
  // Fakie compounds with that same rule instead of overriding it: fakie
  // on its own IS a reverse entry, but Halfcab/True Halfcab (fakie +
  // 180°, an odd multiple) flips you a SECOND time, landing you back
  // facing forward — net forward, not reverse. Fullcab/True Fullcab
  // (fakie + 360°, even) doesn't flip you again, so fakie's own reverse
  // stands. Same "odd flips, even doesn't" rule either way, just XORed
  // against fakie's own starting state instead of a plain forward
  // approach's. Without this, "Halfcab Kindgrind" used to come up —
  // physically impossible, since a Halfcab's own 180° already puts you
  // facing forward, nothing left to be "Alley-oop" about.
  const isReverse =
    !isGroove && (isFakie !== (hasSpin && isReverseSpinDegree(spinTo.winner.name)));

  let approachName = parseApproach(approach, isFakie, hasSpin, isGroove);
  const spinName = parseSpinTo(spinTo, isGroove, isInspin, isOutspin, isFakie);

  const impliesFakie = ["Halfcab", "Fullcab", "True Halfcab", "True Fullcab"];
  if (approachName && impliesFakie.some((cab) => spinName.includes(cab))) {
    approachName = approachName.replace("Fakie", "").replace(" ", "");
  }

  // One switch-up transition's worth of naming — used once for grind 1
  // -> grind 2, and, if there's a second switch-up, once more for
  // grind 2 -> grind 3. `prevIsReverse`/`prevIsInspin` are the
  // cumulative backward/forward state and direction coming INTO this
  // transition (the first grind's own isReverse/isInspin for the
  // first call; whatever THIS function returned for the second) — see
  // the isReverse comment above for why that carry-over (rather than
  // judging each transition alone) is the actual rule, and Pierre's
  // confirmation that a third grind composes exactly the same way a
  // second one does off of it.
  function buildSwitchUpSegment(
    prevGrindName,
    prevIsGroove,
    prevIsReverse,
    prevIsInspin,
    spin,
    target,
    targetVariation,
    switchLabelOn
  ) {
    if (!target) {
      return { token: null, isReverse: prevIsReverse, isInspin: prevIsInspin };
    }
    const targetIsGroove = !!target.winner.isGroove;
    // Only ever one groove side in a cross-type (270/450) transition —
    // pass along whichever grind that is, so nameSwitchSpin can read
    // its FS/BS orientation. Same-type transitions (both true or both
    // false) ignore this entirely.
    const crossTypeGrooveName =
      prevIsGroove !== targetIsGroove ? (prevIsGroove ? prevGrindName : target.winner.name) : null;
    const spinLabel = nameSwitchSpin(spin, crossTypeGrooveName);

    const targetVariationName =
      targetVariation && targetVariation.winner.name !== "None" ? targetVariation.winner.name : null;

    // Whether THIS transition, taken on its own, flips your facing
    // (same idea as isReverse above, but for the switch spin) — true
    // for 180/540/900 same-type and any cross-type 270/450, false for
    // a 360/720 or no switch spin at all.
    const transitionFlips = !!spin && isReverseSpinDegree(spin.winner.name);
    // The real backward/forward state has to account for whatever
    // came before — a 360 (or a straight, no-rotation switch) doesn't
    // undo an Alley-oop/True entry, it just carries you into the next
    // grind exactly as backward as you already were: "AO Top Soul" + a
    // plain 360 switch stays backward the whole way through (must read
    // as e.g. "AO Top Soul to 360 Soyale", never a plain "360 Torque
    // Soul" as if the trick had started forward). All known synonyms
    // are soul grinds, so a groove target never needs any of this.
    const targetIsReverse = !targetIsGroove && prevIsReverse !== transitionFlips;
    // Whether this transition actually reads as Alley-oop (vs. True)
    // for grind-synonym purposes — same resolved direction
    // nameSwitchSpin uses for its own label, NOT just a raw "Inspin"
    // text check. That distinction matters for a cross-type (270/450)
    // transition: entering a Frontside-type groove grind flips which
    // raw reel value (Inspin/Outspin) reads as Alley-oop vs True, same
    // as the FS/BS split trickGenerator.js uses for the real pool. Get
    // this wrong and a genuine True cross-type transition into e.g.
    // Mistrial still matches the Alley-oop-only "AO Top Mistrial"
    // synonym, producing the contradictory "True AO Top Mistrial".
    const spinIsInspin = (() => {
      if (!spin) {
        return false;
      }
      const name = spin.winner.name;
      const rawIsInspin = name.includes("Inspin");
      if ((name.includes("270") || name.includes("450")) && crossTypeGrooveName) {
        const isFrontside = isFrontsideGrindName(crossTypeGrooveName);
        return isFrontside ? !rawIsInspin : rawIsInspin;
      }
      return rawIsInspin;
    })();
    // Same carry-over idea as targetIsReverse: when THIS transition
    // doesn't flip anything (a plain 360, or no switch spin at all),
    // the direction that's still "active" is whichever one was
    // already in play coming in. When the transition DOES flip,
    // that's a fresh, real rotation of its own, so it's judged purely
    // on its own resolved direction.
    const targetIsInspin = transitionFlips ? spinIsInspin : prevIsInspin;

    // spinLabel is folded into the same string as the grind name
    // (rather than joined on afterwards) so a reverse synonym's
    // stripping of the literal "Alley-oop"/"Topside" text below also
    // reaches it — otherwise a synonym whose own name already bakes in
    // "AO" (e.g. "AO Top Mistrial") would leave the real rotation's
    // "Alley-oop" text untouched, and the final abbreviation pass
    // would turn that into a second, duplicate "AO".
    const targetName = applyGrindSynonym(
      [spinLabel, targetVariationName, target.winner.name].filter(Boolean).join(" "),
      target.winner.name,
      {
        isReverse: targetIsReverse,
        isInspin: targetIsInspin,
        isTopside: !!(targetVariationName && targetVariationName.includes("Topside")),
        isNegative: !!(targetVariationName && targetVariationName.includes("Negative")),
        isRough: !!(targetVariationName && targetVariationName.includes("Rough")),
      }
    );

    const token = `to ${switchLabelOn ? "Switch " : ""}${targetName}`;
    return { token, isReverse: targetIsReverse, isInspin: targetIsInspin };
  }

  const seg1 = buildSwitchUpSegment(
    grind.winner.name,
    isGroove,
    isReverse,
    isInspin,
    switchSpin,
    switchUp,
    switchUpVariation,
    options.switchUpSwitch
  );
  const seg2 = buildSwitchUpSegment(
    switchUp ? switchUp.winner.name : null,
    switchUp ? !!switchUp.winner.isGroove : false,
    seg1.isReverse,
    seg1.isInspin,
    switchSpin2,
    switchUp2,
    switchUp2Variation,
    options.switchUp2Switch
  );

  const tokens = [
    approachName,
    spinName,
    variation && variation.winner.name,
    grind.winner.name,
    seg1.token,
    seg2.token,
    spinOff && `to ${parseSpinOff(spinOff, hasSpin, isInspin)} out`,
  ].filter(Boolean);

  let result = applyGrindSynonym(tokens.join(" "), grind.winner.name, {
    isReverse,
    isInspin,
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

// Names the rotation between two switch-up grinds (either 1st->2nd or
// 2nd->3rd — same convention either way). 180/360/540 use the normal
// soul-style Alley-oop/True/Hurricane names. 270/450 only happen on a
// cross-type transition (soul<->groove) — same convention as a groove
// grind's own spin-in (see families.js groove270Entries): Outspin is
// the "forward" rotation for an FS-type grind, Inspin for a BS-type
// one, and THAT direction is what reads as "Alley-oop" here (the other
// direction is "True"), even though that's the opposite of
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
  // 270/450 only ever happen on a cross-type transition (soul<->groove)
  // — same convention as a groove grind's own spin-in (see
  // families.js's groove270Entries): entering a Frontside-type groove
  // grind reads Outspin as the "forward"/Alley-oop-equivalent
  // rotation, Inspin for Backside — the OPPOSITE of what Inspin/Outspin
  // mean for a same-type (180/360/540) rotation. Without
  // crossTypeGrooveName here, every cross-type transition falls back
  // to a plain "270"/"450" with no direction at all, which is the
  // exact bug this fixes: "AO Top Mistrial" (or any topside soul
  // target) showing as a bare "270 Mistrial"/"270 Acid" instead of
  // "AO Top Mistrial"/"AO Top Acid".
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
      !(syn.isInspin && !props.isInspin) &&
      !(syn.isTopside && !props.isTopside) &&
      !(syn.isNegative && !props.isNegative) &&
      !(syn.isRough && !props.isRough)
  );
  if (!synonym) {
    return result;
  }

  result = result.replace(grindName, synonym.newName);
  if (synonym.isReverse) {
    // Kindgrind (Mizou's own isReverse synonym) is only ever matched
    // AT ALL when props.isReverse is true (see the synonym filter
    // above) — and with isReverse's own fixed formula now correctly
    // excluding the Halfcab/True Halfcab (fakie + 180°, net forward)
    // case, "Halfcab Kindgrind" can't happen anymore; that combination
    // just never matches this synonym in the first place, so there's
    // no leftover "Halfcab"/"True Halfcab" text to strip here — only
    // "Alley-oop" (the plain non-fakie reverse case) ever needs it.
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