import { describe, expect, it, vi } from "vitest";
import type { Doc } from "../convex/_generated/dataModel";
import { search } from "../convex/creators";

vi.mock("@convex-dev/auth/server", () => ({
  getAuthUserId: vi.fn(async () => "signed-in-user"),
}));

const demoCreator = {
  _id: "demo-creator",
  _creationTime: 1,
  platform: "instagram",
  handle: "demo.creator",
  normalizedHandle: "democreator",
  displayName: "Demo Creator",
  followerCount: 5_000,
  categories: ["Lifestyle"],
  isVerified: true,
  isDemo: true,
  addedToRepositoryAt: 1,
  lastUpdatedAt: 1,
} as Doc<"creators">;

const realCreator = {
  ...demoCreator,
  _id: "real-creator",
  handle: "real.creator",
  normalizedHandle: "realcreator",
  displayName: "Real Creator",
  isDemo: false,
} as Doc<"creators">;

function searchContext() {
  const creatorResults = [demoCreator, realCreator];
  return {
    db: {
      query: (table: string) => table === "creators"
        ? {
            withIndex: () => ({ collect: async () => creatorResults }),
            withSearchIndex: () => ({ take: async () => creatorResults }),
          }
        : {
            withIndex: () => ({ collect: async () => [] }),
          },
    },
  };
}

describe("creator text search", () => {
  it("hides a known demo display name from a signed-in user but returns a real creator", async () => {
    const ctx = searchContext();
    const searchHandler = (search as unknown as {
      _handler(context: unknown, args: { query: string }): Promise<Array<{ displayName: string; isDemo: boolean }>>;
    })._handler;

    const demoResults = await searchHandler(ctx, { query: "Demo Creator" });
    const realResults = await searchHandler(ctx, { query: "Real Creator" });

    expect(demoResults).toEqual([]);
    expect(realResults).toHaveLength(1);
    expect(realResults[0]).toMatchObject({ displayName: "Real Creator", isDemo: false });
  });
});
