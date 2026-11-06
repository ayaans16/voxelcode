/**
 * The problem registry. To add a problem: create a file in ./data that
 * `export default defineProblem({...})`, then add one import line below.
 * (A bundler-friendly explicit list beats a dynamic glob: it works the same in
 * Next, Vitest and workers, and typos fail loudly.)
 */
import type { Problem } from "./schema";
import { starterFor } from "./define";
import { speciesForPatterns } from "@/engine/species";
import type { SpeciesId } from "@/engine/types";

import budgetPair from "./data/budget-pair";
import gondolaPairing from "./data/gondola-pairing";
import garlandRun from "./data/garland-run";
import rotatedLedger from "./data/rotated-ledger";
import echoDetector from "./data/echo-detector";
import consecutiveChain from "./data/consecutive-chain";
import bracketBookkeeper from "./data/bracket-bookkeeper";
import nextWarmerDay from "./data/next-warmer-day";
import orgChartDepth from "./data/org-chart-depth";
import pondCounter from "./data/pond-counter";
import fewestHops from "./data/fewest-hops";
import hopCount from "./data/hop-count";
import changeMaker from "./data/change-maker";
import morphCost from "./data/morph-cost";
import bookingMerge from "./data/booking-merge";
import rangeTally from "./data/range-tally";
import topFrequent from "./data/top-frequent";
import lonelyNumber from "./data/lonely-number";
import waterBasins from "./data/water-basins";
import tripletZero from "./data/triplet-zero";
import rainTrap from "./data/rain-trap";
import bestStockDay from "./data/best-stock-day";
import noRepeatStretch from "./data/no-repeat-stretch";
import minCoverWindow from "./data/min-cover-window";
import tapeCalculator from "./data/tape-calculator";
import histogramRect from "./data/histogram-rect";
import sortedGridFind from "./data/sorted-grid-find";
import treeDiameter from "./data/tree-diameter";
import courseOrder from "./data/course-order";
import connectedClusters from "./data/connected-clusters";
import spreadingMold from "./data/spreading-mold";
import robStreet from "./data/rob-street";
import longestRising from "./data/longest-rising";
import commonRun from "./data/common-run";
import canReachEnd from "./data/can-reach-end";
import fuelCircuit from "./data/fuel-circuit";
import fewestRemovals from "./data/fewest-removals";
import queensCount from "./data/queens-count";
import bracketWeave from "./data/bracket-weave";
import kthLargest from "./data/kth-largest";
import fastPower from "./data/fast-power";

/** Order here is the order inside each roadmap section. */
export const PROBLEMS: readonly Problem[] = [
  rangeTally,
  topFrequent,
  lonelyNumber,
  waterBasins,
  tripletZero,
  rainTrap,
  bestStockDay,
  noRepeatStretch,
  minCoverWindow,
  tapeCalculator,
  histogramRect,
  sortedGridFind,
  treeDiameter,
  courseOrder,
  connectedClusters,
  spreadingMold,
  robStreet,
  longestRising,
  commonRun,
  canReachEnd,
  fuelCircuit,
  fewestRemovals,
  queensCount,
  bracketWeave,
  kthLargest,
  fastPower,
  budgetPair,
  gondolaPairing,
  garlandRun,
  echoDetector,
  consecutiveChain,
  bracketBookkeeper,
  nextWarmerDay,
  rotatedLedger,
  orgChartDepth,
  pondCounter,
  fewestHops,
  hopCount,
  changeMaker,
  morphCost,
  bookingMerge,
];

const bySlug = new Map(PROBLEMS.map((p) => [p.slug, p] as const));

export function getProblem(slug: string): Problem | undefined {
  return bySlug.get(slug);
}

export function speciesForProblem(problem: Pick<Problem, "patterns">): SpeciesId {
  return speciesForPatterns(problem.patterns);
}

export { starterFor };
