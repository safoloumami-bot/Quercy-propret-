import { describe, expect, it } from "vitest";

import { removeBackground } from "../image-tools";

/** Image 10×10 : fond blanc, carré rouge au centre (dont un pixel blanc intérieur). */
function sample() {
  const width = 10;
  const height = 10;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inside = x >= 3 && x <= 6 && y >= 3 && y <= 6;
      const hole = x === 4 && y === 4;
      data.set(inside && !hole ? [220, 30, 30, 255] : [252, 252, 250, 255], i);
    }
  return { width, height, data, colorSpace: "srgb" } as unknown as ImageData;
}

describe("removeBackground", () => {
  it("rend le fond transparent et garde l'objet, y compris ses zones claires intérieures", () => {
    const out = removeBackground(sample());
    const alpha = (x: number, y: number) => out.data[(y * 10 + x) * 4 + 3];
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(9, 5)).toBe(0);
    expect(alpha(3, 3)).toBe(255);
    expect(alpha(4, 4)).toBe(255);
  });
});
