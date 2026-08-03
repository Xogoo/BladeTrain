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
  // This is THE regression this file exists to prevent: a personal
  // family (built in-app, or one of the 14 shipped defaults) is
  // supposed to be a frozen, complete list of every distinct trick a
  // given grind/switch-up selection allows. "Focus d'entraînement" is
  // a LIVE random-draw pacing preference (avoid landing on "no extra
  // spin" too often during an actual session) — it must never change
  // which tricks get saved into a family, or every family built (or
  // shipped) while it happened to be on ends up missing every
  // straightforward, no-extra-spin switch-up entry, permanently.
  it("always includes a plain (no extra spin) switch-up connector alongside rotated ones", () => {
    const result = enumeratePossibleTricks(
      permissiveSettings(true), // the actual live default
      grindToggles,
      switchUpGrindToggles,
      {}
    );
    const withNone = result.entries.filter((e) => e.switchSpinName === "None");
    const withRotation = result.entries.filter((e) => e.switchSpinName !== "None");
    expect(withNone.length).toBeGreaterThan(0);
    expect(withRotation.length).toBeGreaterThan(0);
  });

  // Building the exact same family with trainingFocus off must yield
  // the exact same set of entries — enumeration answers "what tricks
  // exist for this config", a question trainingFocus has no opinion
  // on. If a future change makes this fail, something is once again
  // leaking a live-session-only flag into what gets permanently saved.
  it("produces identical output regardless of trainingFocus", () => {
    const withFocus = enumeratePossibleTricks(
      permissiveSettings(true),
      grindToggles,
      switchUpGrindToggles,
      {}
    );
    const withoutFocus = enumeratePossibleTricks(
      permissiveSettings(false),
      grindToggles,
      switchUpGrindToggles,
      {}
    );
    expect(withFocus.names).toEqual(withoutFocus.names);
  });
});