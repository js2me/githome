import { parseMergeRequestLocation } from "../../src/shared/lib/gitlab/links/merge-request";

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
  const rawPrefix = "githome://open-mr?raw=";
  if (input.startsWith(rawPrefix)) {
    // A Chrome redirect cannot percent-encode its capture. The entire suffix is the HTTPS URL.
    const url = input.slice(rawPrefix.length);
    return /^https:\/\//i.test(url) && parseMergeRequestLocation(url) ? url : "";
  }
  if (!URL.canParse(input)) return "";
  const link = new URL(input);
  if (
    link.host !== "open-mr" || (link.pathname && link.pathname !== "/") ||
    link.username || link.password || link.hash || link.searchParams.size !== 1
  ) return "";
  const url = link.searchParams.get("url") ?? "";
  return parseMergeRequestLocation(url) ? url : "";
}

export function readExplicitMergeRequest(argv: readonly string[]): string | undefined {
  const flag = readOpenMergeRequestArgument(argv);
  if (flag !== undefined) return flag;
  const link = argv.find((arg) => /^githome:/i.test(arg));
  return link === undefined ? undefined : readGitHomeLink(link);
}
