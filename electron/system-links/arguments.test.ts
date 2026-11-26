import { describe, expect, it } from "vitest";
import { readOpenMergeRequestArgument } from "./arguments";

const url = "https://gitlab.example.com/team/project/-/merge_requests/42/diffs?view=parallel#note_1";

describe("--open-mr", () => {
  it("accepts both flag syntaxes without changing the link", () => {
    expect(readOpenMergeRequestArgument(["--open-mr", url])).toBe(url);
    expect(readOpenMergeRequestArgument(["--flag", `--open-mr=${url}`])).toBe(url);
  });

  it("distinguishes normal launches from invalid explicit requests", () => {
    expect(readOpenMergeRequestArgument([url])).toBeUndefined();
    expect(readOpenMergeRequestArgument(["--open-mr"])).toBe("");
    expect(readOpenMergeRequestArgument(["--open-mr", url.replace("merge_requests", "issues")])).toBe("");
    expect(readOpenMergeRequestArgument(["--open-mr=file:///example"])).toBe("");
  });
});
