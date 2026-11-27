import { describe, expect, it } from "vitest";
import { readExplicitGitHomeLink, readGitHomeLink, readOpenMergeRequestArgument } from "./arguments";

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
    expect(readExplicitGitHomeLink(["--flag", link])).toBe(url);
  });

  it("preserves the complete raw URL from a Chrome redirect", () => {
    const mr = `${url.replace("#", "&other=%2B#")}`;
    const link = `githome://open-mr?raw=${mr}`;
    expect(readGitHomeLink(link)).toBe(mr);
    expect(readExplicitGitHomeLink([link])).toBe(mr);
    expect(readGitHomeLink("githome://open-mr?raw=githome://open-mr")).toBe("");
    expect(readGitHomeLink(`githome://open-mr?raw=${mr.replace("https:", "http:")}`)).toBe("");
  });

  it("accepts a pipeline through Chrome and the manual opening page", () => {
    const pipeline = "https://gitlab.example.com/group/nested/project/-/pipelines/987?ref=main#jobs";
    expect(readGitHomeLink(`githome://open-pipeline?raw=${pipeline}`)).toBe(pipeline);
    expect(readGitHomeLink(`githome://open-pipeline?url=${encodeURIComponent(pipeline)}`)).toBe(pipeline);
    expect(readGitHomeLink(`githome://open-mr?raw=${pipeline}`)).toBe("");
    expect(readGitHomeLink(`githome://open-pipeline?raw=${url}`)).toBe("");
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
