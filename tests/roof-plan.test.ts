import { describe, expect, it } from "vitest";

import { project } from "@/lib/roof-plan";

const triangle = [
  { lat: 51.5, lng: -0.12 },
  { lat: 51.5001, lng: -0.12 },
  { lat: 51.5001, lng: -0.119 },
];

describe("project()", () => {
  it("projects a valid triangle", () => {
    const result = project(triangle);
    expect(result).not.toBeNull();
    expect(result!.points.split(" ")).toHaveLength(3);
    expect(result!.widthM).toBeGreaterThan(0);
  });

  it("rejects a string", () => {
    expect(project("not-an-array" as unknown)).toBeNull();
  });

  it("rejects a number", () => {
    expect(project(42 as unknown)).toBeNull();
  });

  it("rejects null", () => {
    expect(project(null)).toBeNull();
  });

  it("rejects an empty array", () => {
    expect(project([])).toBeNull();
  });

  it("rejects points missing lat", () => {
    expect(
      project([{ lng: -0.12 }, { lat: 51.5, lng: -0.11 }, { lat: 51.51, lng: -0.1 }]),
    ).toBeNull();
  });

  it("rejects NaN coordinates", () => {
    expect(
      project([
        { lat: NaN, lng: -0.12 },
        { lat: 51.5, lng: -0.11 },
        { lat: 51.51, lng: -0.1 },
      ]),
    ).toBeNull();
  });

  it("caps a 200k-point payload without throwing", () => {
    const huge = Array.from({ length: 200_000 }, (_, i) => ({
      lat: 51.5 + (i % 100) * 0.00001,
      lng: -0.12 + (i % 100) * 0.00001,
    }));
    expect(() => project(huge)).not.toThrow();
    const result = project(huge);
    // Cap is 512; a varied rectangle still projects.
    expect(result).not.toBeNull();
  });

  it("rejects all-identical points (zero span)", () => {
    const same = [
      { lat: 51.5, lng: -0.12 },
      { lat: 51.5, lng: -0.12 },
      { lat: 51.5, lng: -0.12 },
      { lat: 51.5, lng: -0.12 },
    ];
    expect(project(same)).toBeNull();
  });
});
