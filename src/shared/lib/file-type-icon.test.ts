import { describe, expect, it } from "vitest";
import { getFileTypeIconUrl, resolveFileTypeIcon } from "./file-type-icon";

describe("Material file icons", () => {
  it.each([
    ["src/Card.JSX", "react"],
    ["src/Card.tsx", "react_ts"],
    ["src/card.ts", "typescript"],
    ["src/card.d.ts", "typescript-def"],
    ["src/Card.stories.tsx", "storybook"],
    ["src/Card.module.css", "css"],
    ["docs/Card.mdx", "mdx"],
    ["nested/package.json", "nodejs"],
    ["nested/.config/postcssrc.json", "postcss"],
    [".gitignore", "git"],
    ["src/constructor", "file"],
    ["src/asset.unknown-format", "file"],
  ])("resolves %s to %s", (path, icon) => {
    expect(resolveFileTypeIcon(path)).toBe(icon);
    expect(getFileTypeIconUrl(icon)).toBeDefined();
  });

  it.each([
    ["src", "folder-src"],
    ["project/.github/workflows", "folder-gh-workflows"],
    ["src/unnamed-folder", "folder"],
  ])("uses closed and open artwork for %s", (path, icon) => {
    expect(resolveFileTypeIcon(path, true)).toBe(icon);
    expect(resolveFileTypeIcon(path, true, true)).toBe(icon + "-open");
    expect(getFileTypeIconUrl(icon + "-open")).toBeDefined();
  });

  it("uses the theme's filenames for generated icons and light variants", () => {
    expect(getFileTypeIconUrl(resolveFileTypeIcon("card.component.ts"))).toMatch(/angular-component\.clone\.svg$/);
    expect(getFileTypeIconUrl("next_light")).toMatch(/next_light\.svg$/);
  });
});
