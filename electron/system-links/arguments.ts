import { parseMergeRequestLocation } from "../../src/shared/lib/gitlab/links/merge-request";
import { parsePipelineLocation } from "../../src/shared/lib/gitlab/links/pipeline";

import { parseProjectLocation } from "../../src/shared/lib/gitlab/links/project";

const actions = {
  "open-mr": parseMergeRequestLocation,
  "open-pipeline": parsePipelineLocation,
  "open-project": parseProjectLocation,
};

export const isSupportedGitlabLink = (input: string) =>
  Object.values(actions).some((parse) => Boolean(parse(input)));

const openMergeRequestFlag = "--open-mr";

// Undefined means normal app launch. An empty string means the flag was used
// without a valid MR link, which must not be handed back to the browser.
export function readOpenMergeRequestArgument(argv: readonly string[]): string | undefined {
  const index = argv.findIndex((arg) =>
    arg === openMergeRequestFlag || arg.startsWith(`${openMergeRequestFlag}=`),
  );
  if (index < 0) return;
  const arg = argv[index] ?? "";
  const url = (
    arg === openMergeRequestFlag ? argv[index + 1] ?? "" : arg.slice(openMergeRequestFlag.length + 1)
  ).trim();
  return parseMergeRequestLocation(url) ? url : "";
}

export function readGitHomeLink(input: string): string | undefined {
  if (!/^githome:/i.test(input)) return;
  const raw = input.match(/^githome:\/\/(open-mr|open-pipeline|open-project)\?raw=(.*)$/s);
  const parse = (action: string, url: string) => {
    if (!Object.hasOwn(actions, action)) return "";
    return actions[action as keyof typeof actions](url) ? url : "";
  };
  if (raw) {
    // A Chrome redirect cannot percent-encode its capture. The entire suffix is the HTTPS URL.
    return /^https:\/\//i.test(raw[2]) ? parse(raw[1], raw[2]) : "";
  }
  if (!URL.canParse(input)) return "";
  const link = new URL(input);
  if (
    (link.pathname && link.pathname !== "/") ||
    link.username || link.password || link.hash || link.searchParams.size !== 1
  ) return "";
  return parse(link.host, link.searchParams.get("url") ?? "");
}

export function readExplicitGitHomeLink(argv: readonly string[]): string | undefined {
  const flag = readOpenMergeRequestArgument(argv);
  if (flag !== undefined) return flag;
  const link = argv.find((arg) => /^githome:/i.test(arg));
  return link === undefined ? undefined : readGitHomeLink(link);
}
