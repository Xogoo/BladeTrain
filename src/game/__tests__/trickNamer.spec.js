import { describe, expect, it } from "vitest";
import { nameTrick } from "../trickNamer.js";
// namerCases.js is the unchanged test data of the original jQuery app.
import { testData } from "./namerCases.js";

describe("nameTrick", () => {
  it.each(testData.map((entry) => [entry.expected, entry.data]))(
    "names %s",
    (expected, data) => {
      expect(nameTrick(data).parsed).toBe(expected);
    }
  );
});

// namerCases.js has no switch-up coverage at all — these lock in the
// "AO AO Top Mistrial" duplicate-abbreviation bug fix (a reverse
// synonym's baked-in "AO"/"Top" text used to leave the real switch
// rotation's own "Alley-oop"/"Topside" text unstripped, so the final
// abbreviation pass turned it into a second, duplicate "AO"/"Top").
describe("nameTrick switch up", () => {
  it("does not duplicate AO when the switch-up target has a reverse synonym", () => {
    const data = [
      { name: "Grind", winner: { name: "Soul", isGrooveGrind: false } },
      { name: "SwitchSpin", winner: { name: "Inspin 180" } },
      { name: "SwitchUp", winner: { name: "Mistrial" } },
      { name: "SwitchUpVariation", winner: { name: "Topside" } },
    ];
    expect(nameTrick(data).parsed).toBe("Soul to AO Top Mistrial");
  });

  it("keeps the real switch rotation when the synonym isn't reverse-flagged", () => {
    const data = [
      { name: "Grind", winner: { name: "Soul", isGrooveGrind: false } },
      { name: "SwitchSpin", winner: { name: "Outspin 540" } },
      { name: "SwitchUp", winner: { name: "PStar" } },
      { name: "SwitchUpVariation", winner: { name: "Topside" } },
    ];
    expect(nameTrick(data).parsed).toBe("Soul to 540 Hurricane Top PStar");
  });

  it("names a plain switch-up combo with no synonym involved", () => {
    const data = [
      { name: "Grind", winner: { name: "Soul", isGrooveGrind: false } },
      { name: "SwitchSpin", winner: { name: "Inspin 540" } },
      { name: "SwitchUp", winner: { name: "Soul" } },
      { name: "SwitchUpVariation", winner: { name: "Topside" } },
    ];
    expect(nameTrick(data).parsed).toBe("Soul to 540 AO Top Soul");
  });
});
