import { describe, expect, it } from "vitest";
import { findJiraKeys, getJiraProjectUrl, splitJiraText } from "./jira-links";

describe("Jira keys", () => {
  it("deduplicates keys in order across a title and a branch, including mixed case", () => {
    expect(findJiraKeys("[NovaSup-1215] Fix SLA_2-39 and novasup-1215\nfeat/NOVASUP-1215_fix"))
      .toEqual(["NOVASUP-1215", "SLA_2-39"]);
  });

  it("preserves exact text, punctuation, and repeated occurrences", () => {
    const text = "feat/NoVa-42_fix (NOVA-42), QA-7.";
    const parts = splitJiraText(text);
    expect(parts).toEqual([
      { text: "feat/" }, { text: "NoVa-42", key: "NOVA-42" },
      { text: "_fix (" }, { text: "NOVA-42", key: "NOVA-42" },
      { text: "), " }, { text: "QA-7", key: "QA-7" }, { text: "." },
    ]);
    expect(parts.map(part => part.text).join("")).toBe(text);
  });

  it("ignores incomplete keys and matches embedded in longer identifiers", () => {
    expect(findJiraKeys("A-1 2XY-4 XY-55a XY- XY999")).toEqual([]);
    expect(splitJiraText("обычный текст")).toEqual([{ text: "обычный текст" }]);
    expect(splitJiraText("")).toEqual([]);
  });
});

describe("getJiraProjectUrl", () => {
  it("links to the Jira project while preserving the deployment path and port", () => {
    expect(getJiraProjectUrl("https://tools.test:8443/company/jira/browse/NOVASUP-1215/?q=1#comment", "novasup-1215"))
      .toBe("https://tools.test:8443/company/jira/browse/NOVASUP");
    expect(getJiraProjectUrl("http://jira.test/browse/AS_2%2D37", "AS_2-37")).toBe("http://jira.test/browse/AS_2");
  });

  it.each([
    "https://jira.test/browse/NOVA-1", "https://jira.test/issue/NOVASUP-1215",
    "https://jira.test/browse/NOVASUP-1215/comment", "https://jira.test/?issue=NOVASUP-1215",
    "https://jira.test/browse/%ZZ", "https://user:pass@jira.test/browse/NOVASUP-1215",
    "ftp://jira.test/browse/NOVASUP-1215", "javascript:alert(1)", "//jira.test/browse/NOVASUP-1215",
  ])("ignores an invalid or unrelated issue URL %s", url => {
    expect(getJiraProjectUrl(url, "NOVASUP-1215")).toBeUndefined();
  });
});
