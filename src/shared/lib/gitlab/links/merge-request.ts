import { parseWebUrl } from './gitlab-url';

export function parseMergeRequestLocation(input: string) {
  const url = parseWebUrl(input.trim());
  if (!url || url.username || url.password) return;

  const match = url.pathname.match(
    /^\/(.+?)\/(?:-\/)?merge_requests\/(\d+)(?:\/.*)?$/,
  );
  const iid = Number(match?.[2]);
  if (!match || !Number.isSafeInteger(iid) || iid < 1) return;

  return { origin: url.origin, path: `/${match[1]}`, iid };
}
