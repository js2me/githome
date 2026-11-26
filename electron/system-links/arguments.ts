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
