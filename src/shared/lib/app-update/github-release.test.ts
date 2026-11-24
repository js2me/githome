import { expect, it } from "vitest";
import { getAndroidUpdateAsset, isNewerRelease } from "./github-release";

it("compares stable releases numerically", () => {
  expect(isNewerRelease("v0.1.10", "0.1.9")).toBe(true);
  expect(isNewerRelease("v1.0.0", "0.10.22")).toBe(true);
  expect(isNewerRelease("v0.1.8", "0.1.9")).toBe(false);
  expect(isNewerRelease("v0.1.9", "0.1.9")).toBe(false);
  expect(isNewerRelease("v0.2.0-rc.1", "0.1.9")).toBe(false);
});

it("selects the release APK only when GitHub provides its SHA-256 digest", () => {
  const digest = `sha256:${"a".repeat(64)}`;
  const release = { tag_name: "v0.1.43", draft: false, prerelease: false, assets: [] };
  const apk = { name: "githome-android.apk", size: 100, digest };
  expect(getAndroidUpdateAsset({ ...release, assets: [apk] }))
    .toEqual({ tag: "v0.1.43", size: 100, digest });
  expect(getAndroidUpdateAsset({ ...release, assets: [{ ...apk, name: "app-debug.apk" }] })).toBeUndefined();
  expect(getAndroidUpdateAsset({ ...release, assets: [{ ...apk, digest: null }] })).toBeUndefined();
});
