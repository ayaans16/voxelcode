import type { CSSProperties } from "react";

/**
 * Tiny pixel-art icons drawn as SVG rects. Everything is procedural: no image
 * assets, no icon fonts, no emoji. Letters map to theme colors.
 */
const COLORS: Record<string, string> = {
  c: "currentColor",
  g: "var(--leaf)",
  G: "var(--leaf-dark)",
  b: "var(--bark)",
  d: "var(--soil)",
  o: "var(--accent)",
  y: "var(--gold)",
  p: "var(--blossom)",
  k: "var(--line-strong)",
};

const ICONS = {
  seed: [
    "........",
    "...g....",
    "..gg....",
    "...b....",
    "..bbb...",
    ".bbdbb..",
    "..bbb...",
    "........",
  ],
  sapling: [
    ".........",
    "....g....",
    "...ggg...",
    "..ggGgg..",
    "...gGg...",
    "....b....",
    "....b....",
    "..ddddd..",
    ".........",
  ],
  tree: [
    "...ggg...",
    ".ggGgggg.",
    "gggggGggg",
    ".ggGgggg.",
    "..ggggg..",
    "....b....",
    "....b....",
    "....b....",
    ".ddddddd.",
  ],
  logo: [
    "...oo...",
    "..oooo..",
    ".oo..oo.",
    "oooooooo",
    ".oooooo.",
    "...bb...",
    "...bb...",
    "..bbbb..",
  ],
  check: ["......c", ".....cc", "c...cc.", "cc.cc..", ".ccc...", "..c...."],
  cross: ["c.....c", ".c...c.", "..c.c..", "...c...", "..c.c..", ".c...c.", "c.....c"],
  clock: [
    "..ccc..",
    ".c...c.",
    "c..c..c",
    "c..cc.c",
    "c.....c",
    ".c...c.",
    "..ccc..",
  ],
  lock: ["..ccc..", ".c...c.", ".c...c.", "ccccccc", "cc.c.cc", "cc.c.cc", "ccccccc"],
  play: ["c.....", "cc....", "ccc...", "cccc..", "ccc...", "cc....", "c....."],
  chevron: ["c....", ".c...", "..c..", ".c...", "c...."],
  chevronDown: ["c.....c", ".c...c.", "..c.c..", "...c..."],
  arrowUpRight: ["...cccc", "....ccc", "...c.cc", "..c..c.", ".c.....", "c......"],
  panelRight: ["ccccccc", "c.....c", "c...c.c", "c...c.c", "c.....c", "ccccccc"],
  spark: ["...y...", "...y...", ".y.y.y.", "yyyyyyy", ".y.y.y.", "...y...", "...y..."],
  leaf: ["....gg", "...ggg", "..gGgg", ".gGgg.", "gGgg..", "bg...."],
  flame: ["...o...", "..oo...", "..ooo..", ".ooyoo.", ".oyyyo.", "..yyy.."],
  bolt: ["...cc", "..cc.", ".ccc.", "..cc.", "..c..", ".c..."],
  blossom: ["..p.p..", ".ppypp.", "pp.y.pp", ".ppypp.", "..p.p..", "...g...", "...g..."],
  sun: ["...y...", ".y.y.y.", "..yyy..", "yyyyyyy", "..yyy..", ".y.y.y.", "...y..."],
  snow: ["...c...", "c..c..c", ".c.c.c.", "..ccc..", "ccccccc", "..ccc..", ".c.c.c.", "c..c..c", "...c..."],
  dot: ["cc", "cc"],
} as const;

export type PixelIconName = keyof typeof ICONS;

interface Props {
  name: PixelIconName;
  /** Pixel size of one cell. */
  px?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function PixelIcon({ name, px = 2, className, style, title }: Props) {
  const rows: readonly string[] = ICONS[name];
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === ".") continue;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={COLORS[ch] ?? "currentColor"} />);
    }
  });
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * px}
      height={h * px}
      shapeRendering="crispEdges"
      className={className}
      style={style}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {rects}
    </svg>
  );
}
