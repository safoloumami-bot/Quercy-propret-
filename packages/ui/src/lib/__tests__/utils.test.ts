import { describe, expect, it } from "vitest";

import { cn } from "../utils";

describe("cn", () => {
  it("résout les conflits de classes Tailwind", () => {
    expect(cn("px-2 text-sm", "px-4")).toBe("text-sm px-4");
  });

  it("ignore les valeurs fausses", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
