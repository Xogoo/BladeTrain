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
  spins360: false,
  spins540: false,
  spins720: false,
  spins900: false,
};

const ALL_ON = Object.fromEntries(Object.keys(ALL_OFF).map((k) => [k, true]));

// The Chill preset's grind selection: rare grinds and slides are off.
const CHILL_EXCLUDED = [...RARE_GRIND_NAME_PARTS, "Pudslide", "Fastslide"];
const CHILL_GRINDS = Object.fromEntries(
  GRINDS.filter((g) => CHILL_EXCLUDED.some((part) => g.name.includes(part)))
    .map((g) => [g.name, false])
);

describe("generateSpin", () => {
  it("with everything off only spins the grind and 180 spin reels", () => {
    for (let i = 0; i < 200; i++) {
      const spin = generateSpin(ALL_OFF, [], null, CHILL_GRINDS);
      const byName = Object.fromEntries(spin.reels.map((r) => [r.name, r]));

      expect(spin.name).not.toBe("");
      expect(byName.Approach.hidden).toBe(true);
      expect(byName.GrindVariation.hidden).toBe(true);
      expect(
        CHILL_EXCLUDED.some((part) => byName.Grind.winner.name.includes(part))
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
      expect(spin.reels).toHaveLength(5);
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
