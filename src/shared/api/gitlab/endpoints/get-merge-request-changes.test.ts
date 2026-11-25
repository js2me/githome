import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import type { GitLabMergeRequestDC, GitLabProjectDC } from "../data-contracts";
import { getMergeRequestChanges } from "./get-merge-request-changes";

const connection: GitLabConnection = {
  id: "gitlab",
  gitlabUrl: "https://gitlab.example",
  gitToken: "fake+token",
};
const project = { id: 42, path_with_namespace: "group/project" } as GitLabProjectDC;
const firstDiff = {
  old_path: "first.ts",
  new_path: "first.ts",
  diff: "+first",
  new_file: false,
  renamed_file: false,
  deleted_file: false,
};
const secondDiff = {
  ...firstDiff,
  old_path: "second.ts",
  new_path: "second.ts",
  diff: "+second",
};

describe("getMergeRequestChanges", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const requestUrl = (index: number) =>
    new URL(String(fetchMock.mock.calls[index][0]), connection.gitlabUrl);

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the latest web diffs without HTTP cache and reads all JSON pages", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ diff_files: [firstDiff], pagination: { total_pages: 2 } }),
      )
      .mockResolvedValueOnce(
        Response.json({ diff_files: [secondDiff], pagination: { total_pages: 2 } }),
      );

    const changes = await getMergeRequestChanges(connection, project, 13);

    expect(changes).toEqual([
      expect.objectContaining(firstDiff),
      expect.objectContaining(secondDiff),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (let index = 0; index < 2; index++) {
      const url = requestUrl(index);
      expect(url.pathname).toMatch(/group\/project\/-\/merge_requests\/13\/diffs_batch\.json$/);
      expect(url.searchParams.get("diff_head")).toBe("true");
      expect(url.searchParams.get("private_token")).toBe(connection.gitToken);
      expect(url.searchParams.get("page")).toBe(String(index + 1));
      expect(fetchMock.mock.calls[index][1]?.cache).toBe("no-store");
    }
  });

  it("reads the historical REST version's diffs when the web endpoint is unavailable", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ id: 8, diffs: [firstDiff] }));

    await expect(getMergeRequestChanges(connection, project, 13, 8)).resolves.toEqual([
      firstDiff,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestUrl(0).searchParams.get("diff_id")).toBe("8");
    expect(requestUrl(0).searchParams.get("private_token")).toBe(connection.gitToken);
    expect(requestUrl(1).pathname).toMatch(/\/api\/v4\/projects\/42\/merge_requests\/13\/versions\/8$/);
    expect(requestUrl(1).searchParams.toString()).toBe("unidiff=true");
  });

  it("does not fetch the latest diff if a historical version cannot be loaded", async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 404 }));

    await expect(getMergeRequestChanges(connection, project, 13, 8)).rejects.toThrow(
      "Failed to fetch merge request changes",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses the supplied detail's head for compare without re-fetching it", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ diffs: [secondDiff] }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const detail = {
      state: "opened",
      target_branch: "main",
      diff_refs: { start_sha: "base", head_sha: "new-head" },
    } as GitLabMergeRequestDC;

    await expect(
      getMergeRequestChanges(connection, project, 13, null, null, undefined, detail),
    ).resolves.toEqual([secondDiff]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(requestUrl(1).pathname).toMatch(/\/merge_requests\/13\/diffs$/);
    expect(fetchMock.mock.calls[1][1]?.cache).toBe("no-store");
    expect(requestUrl(2).pathname).toMatch(/\/repository\/compare$/);
    expect(requestUrl(2).searchParams.get("from")).toBe("main");
    expect(requestUrl(2).searchParams.get("to")).toBe("new-head");
    expect(fetchMock.mock.calls[2][1]?.cache).toBe("no-store");
  });
});
