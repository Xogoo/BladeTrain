// Computes a full accent palette { red, redHi, redDeep, ctaText } from
// any hue (0-359°), for either theme — same method used to generate
// the original fixed accent list (see git history), just runnable live
// instead of precomputed once in Python. Lets the color wheel picker
// support any hue, not just a fixed set of named accents.
//
// Contrast is checked and corrected the same way the original fixed
// palette was: the CTA button text needs to read clearly against all
// three gradient stops (redHi, red, redDeep) in `.btn--go`, and redHi
// needs to read as plain text against the app's own backgrounds.

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function hexToRgbString(hex) {
  return hexToRgb(hex).join(", ");
}

function luminance([r, g, b]) {
  const channel = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(hexA, hexB) {
  const lA = luminance(hexToRgb(hexA)) + 0.05;
  const lB = luminance(hexToRgb(hexB)) + 0.05;
  return Math.max(lA, lB) / Math.min(lA, lB);
}

function lerpColor(fromHex, toHex, t) {
  const a = hexToRgb(fromHex);
  const b = hexToRgb(toHex);
  const toHexPart = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${toHexPart(a[0] + (b[0] - a[0]) * t)}${toHexPart(a[1] + (b[1] - a[1]) * t)}${toHexPart(
    a[2] + (b[2] - a[2]) * t
  )}`;
}

// Nudges `deep` towards `red` (and past it, towards `redHi`, if still
// not enough) until it holds at least `target` contrast against `cta`
// — same fix applied to the original fixed accents after the CTA
// button text turned out unreadable on a few of them.
function fixDeepForContrast(deep, red, redHi, cta, target = 5.0) {
  for (const to of [red, redHi]) {
    for (let i = 0; i <= 100; i++) {
      const candidate = lerpColor(deep, to, i / 100);
      if (contrast(cta, candidate) >= target) {
        return candidate;
      }
    }
  }
  return deep;
}

// `saturation` (0-1) comes from how far from the wheel's center the
// player picked — 1 = full vivid color at the rim, lower values fade
// towards a pale/neutral center, matching the reference wheel's radial
// fade. Clamped to a floor so it never fully desaturates to gray (the
// hue would become meaningless / contrast maths below assume some
// color is still there).
export function computeAccentPalette(hue, isLight, saturation = 1) {
  const s = Math.max(0.12, Math.min(1, saturation));
  if (isLight) {
    let redHi = hslToHex(hue, 0.75 * s, 0.28 + (1 - s) * 0.5);
    // redHi doubles as plain text color — hold up against the
    // lightest background too (#e2e2e2), not just against white.
    for (let l = 0.28; l > 0.05 && contrast(redHi, "#e2e2e2") < 4.6; l -= 0.01) {
      redHi = hslToHex(hue, 0.75 * s, l);
    }
    let red = hslToHex(hue, 0.75 * s, 0.42 + (1 - s) * 0.4);
    // red is the CTA gradient's middle stop — hold up against white.
    for (let l = 0.42; l > 0.05 && contrast("#ffffff", red) < 4.6; l -= 0.01) {
      red = hslToHex(hue, 0.75 * s, l);
    }
    let redDeep = hslToHex(hue, 0.65 * s, 0.22 + (1 - s) * 0.5);
    const ctaText = "#ffffff";
    redDeep = fixDeepForContrast(redDeep, red, redHi, ctaText);
    return { red, redHi, redDeep, ctaText };
  }

  const redHi = hslToHex(hue, 0.95 * s, 0.72 + (1 - s) * 0.15);
  let red = hslToHex(hue, 0.95 * s, 0.62 + (1 - s) * 0.2);
  let redDeep = hslToHex(hue, 0.75 * s, 0.4 + (1 - s) * 0.3);
  const ctaText = hslToHex(hue, 0.55 * s, 0.1);
  // The middle stop can land too close in luminance to ctaText in the
  // blue/indigo band specifically — nudge it towards redHi if so.
  if (contrast(ctaText, red) < 4.6) {
    red = fixDeepForContrast(red, redHi, redHi, ctaText, 4.6);
  }
  redDeep = fixDeepForContrast(redDeep, red, redHi, ctaText);
  return { red, redHi, redDeep, ctaText };
}

// Glow shadows follow the exact format used by the original fixed
// accent CSS blocks.
export function computeAccentGlow(palette, isLight) {
  const redRgb = hexToRgbString(palette.red);
  const hiRgb = hexToRgbString(palette.redHi);
  if (isLight) {
    return {
      glowRed: `0 0 12px rgba(${redRgb}, 0.35), 0 0 30px rgba(${redRgb}, 0.15)`,
      glowRedHi: `0 0 12px rgba(${hiRgb}, 0.45), 0 0 34px rgba(${hiRgb}, 0.2)`,
    };
  }
  return {
    glowRed: `0 0 12px rgba(${redRgb}, 0.45), 0 0 36px rgba(${redRgb}, 0.18)`,
    glowRedHi: `0 0 12px rgba(${hiRgb}, 0.6), 0 0 36px rgba(${hiRgb}, 0.28)`,
  };
}