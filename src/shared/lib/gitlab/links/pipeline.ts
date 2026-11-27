import { parseWebUrl } from './gitlab-url';

export function parsePipelineLocation(input: string) {
  const url = parseWebUrl(input.trim());
  if (!url || url.username || url.password) return;

  const match = url.pathname.match(/^\/(.+?)\/-\/pipelines\/(\d+)\/?$/);
  const id = Number(match?.[2]);
  if (!match || !Number.isSafeInteger(id) || id < 1) return;

  return { origin: url.origin, path: `/${match[1]}`, id };
}
