import { environmentManager, isServer } from "@tanstack/query-core";
import { queryClient } from "mobx-tanstack-query/preset";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Globals } from "@/globals";
import type { GitLabMergeRequestVersionDC, GitLabProjectDC } from "@/shared/api/gitlab";
import { MrInfoModel } from "./mr-info";

const project = { id: 42, path_with_namespace: "group/project" } as GitLabProjectDC;
const connection = { id: "gitlab", gitlabUrl: "https://gitlab.example", gitToken: "test" };
const makeVersion = (id: number): GitLabMergeRequestVersionDC => ({
  id,
  base_commit_sha: "base",
  start_commit_sha: "start",
  head_commit_sha: `head-${id}`,
  created_at: `2026-01-0${id}T00:00:00Z`,
});
const makeDiff = (id: number) => Response.json({
  diff_files: [{ old_path: "same.ts", new_path: "same.ts", diff: `+version ${id}` }],
});

describe("MR diff freshness", () => {
  let abortController: AbortController;
  let latestId: number;
  let title: string;
  let latestDiff: Promise<Response> | undefined;
  let versions: Promise<Response> | undefined;
  let diffRequests: number[];
  let versionRequests: number;

  beforeEach(() => {
    vi.useFakeTimers();
    environmentManager.setIsServer(() => false);
    abortController = new AbortController();
    latestId = 2;
    title = "Old title";
    latestDiff = undefined;
    versions = undefined;
    diffRequests = [];
    versionRequests = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input), connection.gitlabUrl);
      const path = url.pathname;
      if (path.endsWith("/versions")) {
        versionRequests++;
        return versions ?? Response.json(Array.from({ length: latestId }, (_, index) => makeVersion(latestId - index)));
      }
      if (path.endsWith("/diffs_batch.json")) {
        const id = url.searchParams.get("diff_id");
        diffRequests.push(id ? Number(id) : latestId);
        return id ? makeDiff(Number(id)) : latestDiff ?? makeDiff(latestId);
      }
      if (path.endsWith("/merge_requests/13")) {
        return Response.json({
          title,
          updated_at: `${title}-${latestId}`,
          diff_refs: { base_sha: "base", start_sha: "start", head_sha: `head-${latestId}` },
        });
      }
      if (path.endsWith("/user")) return Response.json({ id: 1 });
      if (path.endsWith("/approvals")) return Response.json({ approved_by: [] });
      if (/\/(discussions|reviewers)$/.test(path)) return Response.json([]);
      throw new Error(`Unexpected request to ${path}`);
    }));
  });

  afterEach(() => {
    abortController.abort();
    queryClient.clear();
    environmentManager.setIsServer(() => isServer);
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const openMr = async () => {
    const model = new MrInfoModel({
      globals: { stores: { settings: { activeConnection: connection } } } as Globals,
      abortSignal: abortController.signal,
      params: () => ({ project, mergeRequestIid: 13 }),
    });
    await vi.advanceTimersByTimeAsync(0);
    return model;
  };

  it("refreshes latest diff and versions after a push without reopening the MR", async () => {
    const model = await openMr();
    const initialRevision = model.detailView?.diffRevision;
    expect(model.detailView?.changes[0]?.diff).toBe("+version 2");

    title = "New title";
    await vi.advanceTimersByTimeAsync(20_000);
    expect(model.detailView?.mergeRequest.title).toBe("New title");
    expect(model.detailView?.diffRevision).toBe(initialRevision);
    expect(diffRequests).toEqual([2]);
    expect(versionRequests).toBe(1);

    latestId = 3;
    const pending = Promise.withResolvers<Response>();
    latestDiff = pending.promise;
    await vi.advanceTimersByTimeAsync(20_000);

    expect(model.detailView).toMatchObject({
      mergeRequest: { diff_refs: { head_sha: "head-3" } },
      isPreparingDiffs: true,
      canCommentOnDiff: false,
      changes: [],
      diffVersions: [{ id: 3 }, { id: 2 }, { id: 1 }],
    });
    expect(model.detailView?.diffRevision).not.toBe(initialRevision);
    expect(diffRequests).toEqual([2, 3]);

    pending.resolve(makeDiff(3));
    await vi.advanceTimersByTimeAsync(0);
    expect(model.detailView?.changes[0]?.diff).toBe("+version 3");
    expect(model.detailView?.canCommentOnDiff).toBe(true);
  });

  it("keeps an explicitly selected historical diff while GitLab returns a new latest version", async () => {
    const model = await openMr();
    model.selectDiffVersion(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(model.detailView?.changes[0]?.diff).toBe("+version 1");
    const historicalRevision = model.detailView?.diffRevision;

    latestId = 3;
    const pending = Promise.withResolvers<Response>();
    versions = pending.promise;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(model.detailView?.selectedDiffVersion?.head_commit_sha).toBe("head-1");
    expect(model.detailView?.diffVersions.map(({ id }) => id)).toEqual([2, 1]);
    expect(model.detailView?.diffRevision).toBe(historicalRevision);
    expect(model.detailView?.changes[0]?.diff).toBe("+version 1");
    expect(diffRequests).toEqual([2, 1]);

    pending.resolve(Response.json([makeVersion(3), makeVersion(2), makeVersion(1)]));
    model.selectDiffVersion(null);
    await vi.advanceTimersByTimeAsync(0);
    expect(model.detailView?.changes[0]?.diff).toBe("+version 3");
    expect(diffRequests).toEqual([2, 1, 3]);
  });

  it("does not replace a newer diff when a previous revision's request finishes late", async () => {
    const model = await openMr();
    latestId = 3;
    const pending = Promise.withResolvers<Response>();
    latestDiff = pending.promise;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(model.detailView?.isPreparingDiffs).toBe(true);

    latestId = 4;
    latestDiff = undefined;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(model.detailView?.changes[0]?.diff).toBe("+version 4");

    pending.resolve(makeDiff(3));
    await vi.advanceTimersByTimeAsync(0);
    expect(model.detailView?.changes[0]?.diff).toBe("+version 4");
    expect(diffRequests).toEqual([2, 3, 4]);
  });
});
