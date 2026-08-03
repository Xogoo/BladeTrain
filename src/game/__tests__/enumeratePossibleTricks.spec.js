import { describe, expect, it } from "vitest";
import { enumeratePossibleTricks } from "../trickGenerator.js";

// A permissive, realistic personal-family build: one grind on each
// side of a switch-up, cross-type (soul <-> groove) so it exercises
// the 270/450 connector pool, every direction/degree checkbox on —
// same shape TrickPreviewPanel.vue passes straight from
// props.settings.tricks when the player builds (or the app ships) a
// personal family with a switch-up.
function permissiveSettings(trainingFocus) {
  return {
    tricks: {},
    trainingFocus,
    switchUp: true,
    switchUpSwitch: false,
    switchUp2: false,
    alleyOopChance: 25,
    trueChance: null,
    topsideChance: null,
    spinInAlleyOop: true,
    spinInTrue: true,
    spinOutAlleyOop: true,
    spinOutTrue: true,
    spinBetweenAlleyOop: true,
    spinBetweenTrue: true,
    spinIn180: true,
    spinIn270: true,
    spinIn360: true,
    spinIn450: true,
    spinIn540: true,
    spinOut180: true,
    spinOut270: true,
    spinOut360: true,
    spinOut450: true,
    spinOut540: true,
    spinBetween180: true,
    spinBetween270: true,
    spinBetween360: true,
    spinBetween450: true,
    spinBetween540: true,
  };
}

const grindToggles = { Soul: true };
const switchUpGrindToggles = { Frontside: true };

describe("enumeratePossibleTricks — family building", () => {
  // With "Entraînement ciblé" OFF, nothing is locked — the switch-up
  // reel stays a genuine possibility space, so a plain "None" connector
  // and rotated ones both coexist.
  it("includes both a plain (no extra spin) switch-up connector and rotated ones when training focus is off", () => {
    const result = enumeratePossibleTricks(
      permissiveSettings(false),
      grindToggles,
      switchUpGrindToggles,
      {}
    );
    const withNone = result.entries.filter((e) => e.switchSpinName === "None");
    const withRotation = result.entries.filter((e) => e.switchSpinName !== "None");
    expect(withNone.length).toBeGreaterThan(0);
    expect(withRotation.length).toBeGreaterThan(0);
  });

  // The actual lock: narrowing to just one direction (Alley-oop only)
  // with trainingFocus on must exclude the "None"/plain connector
  // entirely — a family built from this exact config is meant to come
  // out with that rotation on every entry, not a mix. This is the
  // precise behavior Pierre relies on to build a tight, single-recipe
  // family (e.g. "Backslide to AO Top") instead of a broad "everything
  // that's merely possible" list.
  it("locks out the plain (no extra spin) connector once a direction is actually narrowed", () => {
    const settings = permissiveSettings(true);
    settings.spinBetweenTrue = false; // only Alley-oop left enabled
    const result = enumeratePossibleTricks(
      settings,
      grindToggles,
      switchUpGrindToggles,
      {}
    );
    const withNone = result.entries.filter((e) => e.switchSpinName === "None");
    expect(withNone.length).toBe(0);
    expect(result.entries.length).toBeGreaterThan(0);
  });

  // Once a family IS saved, its entries are a frozen snapshot (see
  // saveCustomFamily in useSettings.js) — nothing re-derives them
  // later, so trainingFocus (or anything else) toggling afterward can
  // never change an already-created family. This just confirms
  // enumeratePossibleTricks itself is a pure function of its inputs —
  // same settings in, same entries out, every time.
  it("is deterministic for the same settings", () => {
    const settings = permissiveSettings(true);
    const first = enumeratePossibleTricks(settings, grindToggles, switchUpGrindToggles, {});
    const second = enumeratePossibleTricks(settings, grindToggles, switchUpGrindToggles, {});
    expect(first.names).toEqual(second.names);
  });
});