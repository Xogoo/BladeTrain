import { describe, expect, it } from "vitest";
import { matchSamples, SAMPLE_FILES } from "../useSpeech.js";

const has = (key) => key in SAMPLE_FILES;

describe("matchSamples", () => {
  it("splits a trick into known sample keys", () => {
    expect(matchSamples("True Top Soul", has)).toEqual(["true", "top soul"]);
  });

  it("prefers multi-word samples over single words", () => {
    expect(matchSamples("Top Soul", has)).toEqual(["top soul"]);
    expect(matchSamples("Top Mizou", has)).toEqual(["top", "mizou"]);
  });

  it("skips tokens without a recorded sample", () => {
    expect(
      matchSamples("Soul to Narnia out", (key) => key === "soul")
    ).toEqual(["soul"]);
  });

  it("uses whole spin-out phrase samples, longest first", () => {
    expect(matchSamples("Soul to 180 out", has)).toEqual([
      "soul",
      "to 180 out",
    ]);
    expect(matchSamples("Mizou to 540 rewind out", has)).toEqual([
      "mizou",
      "to 540 rewind out",
    ]);
    expect(matchSamples("BS Royale to Fakie out", has)).toEqual([
      "backside",
      "royale",
      "to fakie out",
    ]);
  });

  it("speaks AO as Alley-Oop", () => {
    expect(matchSamples("AO Mizou", has)).toEqual(["alley-oop", "mizou"]);
  });

  it("expands BS/FS to Backside/Frontside", () => {
    expect(matchSamples("BS Royale", has)).toEqual(["backside", "royale"]);
    expect(matchSamples("FS Torque", has)).toEqual(["frontside", "torque"]);
  });

  it("uses phrase samples for fixed word pairs", () => {
    expect(matchSamples("Fakie Hot Dog", has)).toEqual(["fakie", "hot dog"]);
    expect(matchSamples("BS Cab driver", has)).toEqual([
      "backside",
      "cab driver",
    ]);
    expect(matchSamples("Sunny Day to 450 out", has)).toEqual([
      "sunny day",
      "to 450 out",
    ]);
  });

  it("matches numbers used by spin samples", () => {
    expect(matchSamples("540 Soul", has)).toEqual(["540", "soul"]);
  });
});
