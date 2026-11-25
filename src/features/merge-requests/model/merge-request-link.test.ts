import { describe, expect, it } from "vitest";
import { resolveMergeRequestLink } from "./merge-request-link";

const host = { id: "main", gitlabUrl: "gitlab.example", gitToken: "fixture" };
const team = { ...host, id: "team", gitlabUrl: "https://gitlab.example/team/" };
const teamAccount = { ...team, id: "second-account" };

describe("resolveMergeRequestLink", () => {
  it("matches GitLab installations by base path and prefers the active account on that installation", () => {
    const url = "https://gitlab.example/team/org/subgroup/my-project/-/merge_requests/42/diffs?view=parallel#note_123";
    expect(resolveMergeRequestLink(url, [host, team, teamAccount], teamAccount.id)).toEqual({
      connection: teamAccount,
      projectPath: "org/subgroup/my-project",
      iid: 42,
    });
    expect(resolveMergeRequestLink(url, [host, team], host.id).connection).toBe(team);
  });

  it("accepts encoded project names and older GitLab links", () => {
    const url = "https://gitlab.example/teamwork/project%20name/merge_requests/5";
    expect(resolveMergeRequestLink(url, [host, team], team.id)).toEqual({
      connection: host,
      projectPath: "teamwork/project name",
      iid: 5,
    });
  });

  it.each([
    "https://gitlab.example.other/group/project/-/merge_requests/42",
    "https://gitlab.example@other.example/group/project/-/merge_requests/42",
    "http://gitlab.example/group/project/-/merge_requests/42",
    "https://gitlab.example/group/project/-/issues/42",
    "https://gitlab.example/group/project/-/merge_requests/0",
    "https://gitlab.example/group/project/-/merge_requests/9007199254740992",
    "an invalid link",
  ])("rejects an unknown instance or invalid MR link %s", (url) => {
    expect(() => resolveMergeRequestLink(url, [host], host.id)).toThrow();
  });
});
