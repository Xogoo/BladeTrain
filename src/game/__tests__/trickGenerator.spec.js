import { describe, expect, it } from "vitest";
import { generateSpin } from "../trickGenerator.js";
import { GRINDS, RARE_GRIND_NAME_PARTS } from "../trickData.js";

const ALL_OFF = {
  fakie: false,
  switch: false,
  topside: false,
  negative: false,
  rough: false,
  tough: false,
  channel: false,
  christ: false,
  grabs: false,
  rocket: false,
  crossgrab: false,
  trainingFocus: false,
  switchUp: false,
  switchUpTopside: false,
  spinInAlleyOop: false,
  spinInTrue: false,
  spinBetweenAlleyOop: false,
  spinBetweenTrue: false,
  spinIn180: false,
  spinIn270: false,
  spinIn360: false,
  spinIn450: false,
  spinIn540: false,
  spinBetween180: false,
  spinBetween270: false,
  spinBetween360: false,
  spinBetween450: false,
  spinBetween540: false,
  spinOut180: false,
  spinOut270: false,
  spinOut360: false,
  spinOut450: false,
  spinOut540: false,
  switchUp2: false,
  switchUp2Switch: false,
  switchUp2Topside: false,
  spinBetween2AlleyOop: false,
  spinBetween2True: false,
  spinBetween2180: false,
  spinBetween2270: false,
  spinBetween2360: false,
  spinBetween2450: false,
  spinBetween2540: false,
};

const ALL_ON = Object.fromEntries(Object.keys(ALL_OFF).map((k) => [k, true]));

// A sample exclusion-based grind selection (rare grinds and slides off)
// — this only exercises generateSpin's own grindToggles mechanics, it
// isn't tied to any particular preset in useSettings.js.
const SAMPLE_EXCLUDED = [...RARE_GRIND_NAME_PARTS, "Pudslide", "Fastslide"];
const SAMPLE_GRINDS = Object.fromEntries(
  GRINDS.filter((g) => SAMPLE_EXCLUDED.some((part) => g.name.includes(part)))
    .map((g) => [g.name, false])
);

describe("generateSpin", () => {
  it("with everything off only spins the grind and 180 spin reels", () => {
    for (let i = 0; i < 200; i++) {
      const spin = generateSpin(ALL_OFF, [], null, SAMPLE_GRINDS);
      const byName = Object.fromEntries(spin.reels.map((r) => [r.name, r]));

      expect(spin.name).not.toBe("");
      expect(byName.Approach.hidden).toBe(true);
      expect(byName.GrindVariation.hidden).toBe(true);
      expect(
        SAMPLE_EXCLUDED.some((part) => byName.Grind.winner.name.includes(part))
      ).toBe(false);
      // Only 180s (or nothing) without the bigger-spin settings.
      for (const reel of [byName.SpinTo, byName.SpinOff]) {
        expect(reel.winner.name).toMatch(/^(None|Forwards|Fakie|\D*180)$/);
      }
    }
  });

  it("never spins up grinds that are switched off", () => {
    const only = {};
    for (const grind of GRINDS) {
      only[grind.name] = ["Makio", "Soul"].includes(grind.name);
    }
    for (let i = 0; i < 100; i++) {
      const spin = generateSpin(ALL_ON, [], null, only);
      expect(["Makio", "Soul"]).toContain(
        spin.reels.find((r) => r.name === "Grind").winner.name
      );
    }
  });

  it("rotates through a small grind selection instead of streaking", () => {
    // Two enabled grinds with skewed weights (soul factor + trainer
    // bias) must still alternate, like the solo game loop calls it.
    const only = Object.fromEntries(
      GRINDS.map((g) => [g.name, ["Mistrial", "Frontside"].includes(g.name)])
    );
    const bias = { Mistrial: 2.5 };
    const used = [];
    const counts = { Mistrial: 0, Frontside: 0 };
    let prev = null;
    for (let i = 0; i < 100; i++) {
      const spin = generateSpin(ALL_ON, used, bias, only);
      const grind = spin.reels.find((r) => r.name === "Grind").winner.name;
      expect(grind).not.toBe(prev);
      prev = grind;
      counts[grind] += 1;
      used.push(grind);
      if (used.length > 15) {
        used.shift();
      }
    }
    expect(counts.Mistrial).toBe(50);
    expect(counts.Frontside).toBe(50);
  });

  it("ignores the grind selection when every grind is off", () => {
    const noneOn = Object.fromEntries(GRINDS.map((g) => [g.name, false]));
    const spin = generateSpin(ALL_ON, [], null, noneOn);
    expect(spin.name).not.toBe("");
  });

  it("with everything on produces valid tricks with all reels", () => {
    for (let i = 0; i < 200; i++) {
      const spin = generateSpin(ALL_ON);
      expect(spin.name).not.toBe("");
      expect(spin.score).toBeGreaterThanOrEqual(1);
      expect(spin.reels).toHaveLength(11);
      expect(spin.reels.every((r) => r.pool.length > 0)).toBe(true);
    }
  });

  it("avoids grinds already used this game", () => {
    const used = ["Makio", "Soul", "Acid"];
    for (let i = 0; i < 100; i++) {
      const spin = generateSpin(ALL_ON, used);
      const grind = spin.reels.find((r) => r.name === "Grind").winner;
      expect(used).not.toContain(grind.name);
    }
  });

  it("never picks switch approaches for noSwitch grinds", () => {
    for (let i = 0; i < 300; i++) {
      const spin = generateSpin(ALL_ON);
      const byName = Object.fromEntries(spin.reels.map((r) => [r.name, r]));
      if (byName.Grind.winner.noSwitch) {
        expect(byName.Approach.winner.isSwitch).toBe(false);
      }
    }
  });
});

// A family entry has no field of its own recording whether its
// switch-up was done in switch stance (see familyEntryKey in
// families.js) — so a forced trick used to fall back to whatever the
// player's own LIVE switchUpSwitch/switchUp2Switch toggle happened to
// be, unrelated to the fixed recipe being trained. That leftover
// setting made a family's switch-up randomly show/hide "Switch" in
// its name depending on something the player had toggled for a
// completely different session. A forced trick must ignore both
// toggles entirely, regardless of what they're set to live.
describe("generateSpin — forced (family) tricks ignore live Switch toggles", () => {
  // A real shipped family entry (Backslide to AO Top) — grind switching
  // up into a pinned variation (Makio, Topside).
  const forcedTrickWithSwitchUp = {
    grindName: "FS Backslide",
    variationName: "None",
    approach: "Forwards",
    spinToName: "None",
    spinOffName: "Forwards",
    switchUpGrindName: "Makio",
    switchUpVariationName: "Topside",
    switchSpinName: "Outspin 270",
  };

  it("never shows Switch on the switch-up, even with the live setting on", () => {
    const settings = { ...ALL_ON, switchUpSwitch: true, switchChance: 100 };
    for (let i = 0; i < 20; i++) {
      const spin = generateSpin(settings, [], null, null, null, null, forcedTrickWithSwitchUp, null);
      expect(spin.name).not.toContain("Switch");
    }
  });

  it("never shows Switch on a second-level switch-up, even with the live setting on", () => {
    const forcedTrickWithSwitchUp2 = {
      ...forcedTrickWithSwitchUp,
      switchUp2GrindName: "Torque Soul",
      switchUp2VariationName: "None",
      switchSpin2Name: "None",
    };
    const settings = { ...ALL_ON, switchUpSwitch: true, switchUp2Switch: true, switchChance: 100 };
    for (let i = 0; i < 20; i++) {
      const spin = generateSpin(settings, [], null, null, null, null, forcedTrickWithSwitchUp2, null);
      expect(spin.name).not.toContain("Switch");
    }
  });

  // The bug: forced tricks never populated switchUpVariationPool, so
  // whenever a family entry pinned a real switch-up variation, the
  // SwitchUpVariation reel became visible (winner !== null) with an
  // empty pool. SlotReel's filler-building then read .name off a
  // random pick from that empty array and threw, which is why the
  // whole result screen (score, Blade!/Passer, even the bottom nav)
  // never came back without the failsafe timeout kicking in.
  it("never leaves a visible reel's pool empty for a pinned switch-up variation", () => {
    for (let i = 0; i < 20; i++) {
      const spin = generateSpin(ALL_ON, [], null, null, null, null, forcedTrickWithSwitchUp, null);
      const reel = spin.reels.find((r) => r.name === "SwitchUpVariation");
      expect(reel.hidden).toBe(false);
      expect(reel.winner).not.toBeNull();
      expect(reel.pool.length).toBeGreaterThan(0);
      expect(reel.pool).toContainEqual(reel.winner);
    }
  });
});