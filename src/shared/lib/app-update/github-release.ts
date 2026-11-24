export const releasesUrl = "https://github.com/js2me/githome/releases/latest";
const latestReleaseApi = "https://api.github.com/repos/js2me/githome/releases/latest";
const stableTag = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export interface AndroidUpdateAsset {
  tag: string;
  size: number;
  digest: string;
}

interface GitHubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string; size: number; digest: string | null }[];
}

export async function getLatestRelease(): Promise<GitHubRelease> {
  const response = await fetch(latestReleaseApi, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`GitHub Releases: HTTP ${response.status}`);

  const release = (await response.json()) as GitHubRelease;
  if (release.draft || release.prerelease || !stableTag.test(release.tag_name)) {
    throw new Error("Invalid release version");
  }
  return release;
}

export function isNewerRelease(tag: string, installedVersion: string): boolean {
  const latest = stableTag.exec(tag);
  const installed = stableTag.exec(installedVersion);
  if (!latest || !installed) return false;

  for (let i = 1; i <= 3; i++) {
    const difference = Number(latest[i]) - Number(installed[i]);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

export function getAndroidUpdateAsset(release: GitHubRelease): AndroidUpdateAsset | undefined {
  const asset = release.assets.find(({ name }) => name === "githome-android.apk");
  if (!asset || !Number.isSafeInteger(asset.size) || asset.size <= 0 ||
      !asset.digest || !/^sha256:[0-9a-f]{64}$/.test(asset.digest)) {
    return undefined;
  }
  return { tag: release.tag_name, size: asset.size, digest: asset.digest };
}
