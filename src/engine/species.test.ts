import { describe, expect, it } from "vitest";
import { speciesForPatterns } from "./species";

describe("speciesForPatterns", () => {
  it.each([
    ["two-pointers", "bamboo"],
    ["sliding-window", "willow"],
    ["binary-search", "pine"],
    ["trees", "oak"],
    ["graphs", "banyan"],
    ["dp", "weeping-willow"],
    ["hashing", "cherry"],
    ["stack", "cypress"],
  ])("%s -> %s", (pattern, species) => {
    expect(speciesForPatterns([pattern])).toBe(species);
  });
  it("falls back to oak for unmapped patterns", () => {
    expect(speciesForPatterns(["greedy"])).toBe("oak");
    expect(speciesForPatterns([])).toBe("oak");
  });
  it("the first mapped pattern wins", () => {
    expect(speciesForPatterns(["greedy", "stack", "dp"])).toBe("cypress");
  });
});
