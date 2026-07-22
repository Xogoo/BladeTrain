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
