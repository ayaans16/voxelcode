/**
 * Local time -> lighting. Pure (no three imports) so it can be unit tested.
 */
export interface Lighting {
  /** 0 = deep night, 1 = full day. */
  daylight: number;
  ambientColor: number;
  ambientIntensity: number;
  sunColor: number;
  sunIntensity: number;
  /** Sun direction angles in radians. elevation 0 = horizon. */
  sunElevation: number;
  sunAzimuth: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255,
    ag = (a >> 8) & 255,
    ab = a & 255;
  const br = (b >> 16) & 255,
    bg = (b >> 8) & 255,
    bb = b & 255;
  return (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t));
}

/** Hour is fractional local hours, 0..24. */
export function lightingForHour(hour: number): Lighting {
  const h = ((hour % 24) + 24) % 24;
  // Daylight curve: 0 before 5:30, ramps to 1 by 9:00, holds, ramps down after 16:30, 0 by 20:00.
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const up = smooth(clamp01((h - 5.5) / 3.5));
  const down = smooth(clamp01((20 - h) / 3.5));
  const daylight = Math.min(up, down);

  // Warm tint near the horizon (sunrise/sunset), neutral at noon.
  const warmth = 1 - Math.abs(daylight * 2 - 1) ** 0.6; // peaks at daylight ~ 0.5
  const day = lerpColor(0xfff4e0, 0xffa860, warmth);
  const night = 0x7f93ff;
  const sunColor = lerpColor(night, day, Math.min(1, daylight * 1.6));
  const ambientColor = lerpColor(0x4a5688, 0xdfe8ff, daylight);

  const sunElevation = lerp(0.35, 1.0, daylight);
  // Azimuth sweeps east -> west over the day.
  const sunAzimuth = lerp(-0.9, 2.3, clamp01((h - 6) / 14));
  return {
    daylight,
    ambientColor,
    ambientIntensity: lerp(0.55, 0.95, daylight),
    sunColor,
    sunIntensity: lerp(0.5, 2.1, daylight),
    sunElevation,
    sunAzimuth,
  };
}

export function lightingForDate(date: Date): Lighting {
  return lightingForHour(date.getHours() + date.getMinutes() / 60);
}
