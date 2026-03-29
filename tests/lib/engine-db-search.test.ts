import { describe, expect, it } from "vitest";
import { searchCollections } from "@/lib/engine-db";

describe("searchCollections", () => {
  it("returns an empty array for very short queries", () => {
    expect(searchCollections("a")).toEqual([]);
  });
});
