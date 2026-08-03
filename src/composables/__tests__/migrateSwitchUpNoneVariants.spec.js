import { describe, expect, it, vi } from "vitest";

// The composables persist to localStorage, which does not exist in the
// node test environment.
const store = new Map();
vi.stubGlobal("localStorage", {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
});

const { useSettings, migrateSwitchUpNoneVariants } = await import("../useSettings.js");

function countSwitchUpVariants(customFamilies) {
  let total = 0;
  let withNone = 0;
  let withoutNone = 0;
  for (const family of customFamilies) {
    for (const entry of family.entries) {
      if (entry.switchUpGrindName) {
        total += 1;
        if (entry.switchSpinName === "None") {
          withNone += 1;
        } else {
          withoutNone += 1;
        }
      }
    }
  }
  return { total, withNone, withoutNone };
}

describe("migrateSwitchUpNoneVariants", () => {
  // The actual regression: a bug in enumeratePossibleTricks (see
  // trickGenerator.js's own test) let a live-session-only setting
  // strip every "no extra spin" switch-up variant out of a personal
  // family at build time — including the 14 families shipped with the
  // app itself, which is why even a brand new install could show a
  // forced rotation "everywhere" between the two grinds of a
  // switch-up. This migration runs at load time (see useSettings.js's
  // loadSettings), backup restore, and family import, so it must heal
  // the shipped defaults on a fresh install with nothing else on top.
  it("heals the shipped default families on a fresh install", () => {
    const { settings } = useSettings();
    const { withNone, withoutNone } = countSwitchUpVariants(settings.customFamilies);
    expect(withNone).toBeGreaterThan(0);
    expect(withoutNone).toBeGreaterThan(0);
  });

  // The core guarantee this bug's fix depends on: existing, already-
  // landed-on entries in a saved family must NEVER be removed or
  // altered — a player's progress lives on the exact identity of those
  // entries. Only the missing sibling gets added, as a brand new
  // (unlanded) entry, on the SAME family object (same id).
  it("adds the missing sibling without touching the original entry", () => {
    const original = {
      grindName: "Soul",
      variationName: "None",
      approach: "Forwards",
      spinToName: "None",
      spinOffName: "None",
      switchUpGrindName: "Backside",
      switchUpVariationName: null,
      switchSpinName: "Outspin 270",
    };
    const family = { id: "test-fam", name: "Test", entries: [{ ...original }] };
    const migrated = migrateSwitchUpNoneVariants({ customFamilies: [family] });

    expect(migrated.customFamilies[0].entries).toHaveLength(2);
    expect(migrated.customFamilies[0].entries).toContainEqual(original);
    expect(migrated.customFamilies[0].entries).toContainEqual({
      ...original,
      switchSpinName: "None",
    });
  });

  it("is idempotent — running it twice never duplicates entries", () => {
    const family = {
      id: "test-fam-2",
      name: "Test 2",
      entries: [
        {
          grindName: "Soul",
          variationName: "None",
          approach: "Forwards",
          spinToName: "None",
          spinOffName: "None",
          switchUpGrindName: "Backside",
          switchUpVariationName: null,
          switchSpinName: "Inspin 180",
        },
      ],
    };
    const once = migrateSwitchUpNoneVariants({ customFamilies: [family] });
    const twice = migrateSwitchUpNoneVariants(once);
    expect(twice.customFamilies[0].entries).toHaveLength(2);
  });

  it("leaves a family with no switch-up entries completely untouched", () => {
    const family = {
      id: "plain-fam",
      name: "Plain",
      entries: [
        {
          grindName: "Soul",
          variationName: "None",
          approach: "Forwards",
          spinToName: "None",
          spinOffName: "None",
        },
      ],
    };
    const migrated = migrateSwitchUpNoneVariants({
      customFamilies: [{ ...family, entries: [{ ...family.entries[0] }] }],
    });
    expect(migrated.customFamilies[0].entries).toEqual(family.entries);
  });
});