import { describe, expect, it } from "vitest";
import { lerpColor, lightingForHour } from "./daynight";

describe("lightingForHour", () => {
  it("is dark at night and bright at noon", () => {
    expect(lightingForHour(2).daylight).toBe(0);
    expect(lightingForHour(12).daylight).toBe(1);
    expect(lightingForHour(12).sunIntensity).toBeGreaterThan(lightingForHour(2).sunIntensity);
  });
  it("wraps around midnight and stays in range", () => {
    expect(lightingForHour(25).daylight).toBe(lightingForHour(1).daylight);
    for (let h = 0; h < 24; h += 0.25) {
      const l = lightingForHour(h);
      expect(l.daylight).toBeGreaterThanOrEqual(0);
      expect(l.daylight).toBeLessThanOrEqual(1);
    }
  });
  it("lerpColor interpolates channels", () => {
    expect(lerpColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(lerpColor(0xff0000, 0x00ff00, 0)).toBe(0xff0000);
  });
});
