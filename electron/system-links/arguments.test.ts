import { describe, expect, it } from "vitest";
import { readExplicitMergeRequest, readGitHomeLink, readOpenMergeRequestArgument } from "./arguments";

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

describe("githome://", () => {
  const encoded = encodeURIComponent(url);

  it("opens an MR from the OS without changing its URL", () => {
    const link = `githome://open-mr?url=${encoded}`;
    expect(readGitHomeLink(link)).toBe(url);
    expect(readExplicitMergeRequest(["--flag", link])).toBe(url);
  });

  it("does not accept arbitrary actions, non-MR URLs, or multiple payloads", () => {
    expect(readGitHomeLink(url)).toBeUndefined();
    for (const link of [
      `githome://shell?url=${encoded}`,
      "githome://open-mr?url=file%3A%2F%2F%2Fetc%2Fhosts",
      `githome://open-mr?url=${encoded}&url=${encoded}`,
      `githome://open-mr:444?url=${encoded}`,
    ]) {
      expect(readGitHomeLink(link)).toBe("");
    }
  });
});
