import { environmentManager, isServer } from "@tanstack/query-core";
import { queryClient } from "mobx-tanstack-query/preset";
import { afterEach, expect, it, vi } from "vitest";
import type { Globals } from "@/globals";
import { InboxPageRowsVM } from "./inbox-page-rows";
import type { InboxRow } from "./review-inbox";

const connection = { id: "work", gitlabUrl: "https://gitlab.example", gitToken: "test" };
const globals = { stores: { settings: { activeConnection: connection } } } as Globals;
const row = (projectId: number, iid: number, detailed_merge_status?: string) => ({
  project_id: projectId, iid, projectPath: `group/${projectId}`, detailed_merge_status,
}) as InboxRow;

let model: InboxPageRowsVM;
afterEach(() => {
  model?.unmount();
  queryClient.clear();
  environmentManager.setIsServer(() => isServer);
  vi.unstubAllGlobals();
});

it("keeps approvals, change requests, and thread counts separate for equal IIDs in different projects", async () => {
  environmentManager.setIsServer(() => false);
  const countRequests: string[] = [];
  const reviewerRequests: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string, options: RequestInit) => {
    if (input.endsWith("/graphql")) {
      const { projectPath, iids } = JSON.parse(String(options.body)).variables;
      countRequests.push(projectPath);
      return Response.json({ data: { project: { mergeRequests: { nodes: iids.map((iid: string) => ({
        iid, resolvableDiscussionsCount: 2, resolvedDiscussionsCount: projectPath === "group/1" ? 2 : 1,
      })) } } } });
    }
    if (input.endsWith("/reviewers")) {
      reviewerRequests.push(input);
      return Response.json(input.includes("/projects/1/")
        ? [{ state: "unreviewed" }, { state: "requested_changes" }]
        : [{ state: "unreviewed" }]);
    }
    if (input.endsWith("/approvals")) {
      return Response.json(input.includes("/projects/1/")
        ? { approved_by: [{ user: { id: 2 } }], approvals_left: 0 }
        : { approved_by: [], approvals_left: 1 });
    }
    throw new Error("Unexpected endpoint");
  }));

  const rows = [row(1, 3), row(2, 3), row(1, 4, "requested_changes")];
  model = new InboxPageRowsVM(globals, { id: "inbox-page", payload: { rows, onSelect: vi.fn() } });
  model.mount();
  await vi.waitFor(() => {
    expect(model.statusesFor(rows[0])).toEqual({
      approval: { approved: true, count: 1 }, discussions: { total: 2, resolved: 2 }, review: "requested",
    });
    expect(model.statusesFor(rows[1])).toEqual({
      approval: { approved: false, count: 0 }, discussions: { total: 2, resolved: 1 }, review: "waiting",
    });
  });
  expect(model.statusesFor(rows[2]).review).toBe("requested");
  expect(countRequests.sort()).toEqual(["group/1", "group/2"]);
  expect(reviewerRequests).toHaveLength(2);
});
