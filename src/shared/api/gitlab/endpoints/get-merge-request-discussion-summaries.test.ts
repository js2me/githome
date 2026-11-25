import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import type { GitLabProjectDC } from "../data-contracts";
import { getMergeRequestDiscussionSummaries } from "./get-merge-request-discussion-summaries";

const project = { id: 1, path_with_namespace: "group/repo" } as GitLabProjectDC;
const fetchMock = vi.fn<typeof fetch>();
const json = (value: unknown, status = 200, headers?: Record<string, string>) =>
  new Response(JSON.stringify(value), { status, headers });
const node = (iid: string, total: number | null, resolved: number | null) => ({
  iid, resolvableDiscussionsCount: total, resolvedDiscussionsCount: resolved,
});
const response = (nodes: unknown[], endCursor: string | null = null) =>
  json({ data: { project: { mergeRequests: {
    nodes, pageInfo: { hasNextPage: Boolean(endCursor), endCursor },
  } } } });
const missingField = {
  message: "Field 'resolvableDiscussionsCount' doesn't exist on type 'MergeRequest'",
  extensions: { code: "undefinedField", typeName: "MergeRequest", fieldName: "resolvableDiscussionsCount" },
};
const args = (init?: RequestInit) => JSON.parse(String(init?.body)).variables;

describe("getMergeRequestDiscussionSummaries", () => {
  let connection: GitLabConnection;
  beforeEach(() => {
    connection = { id: "test", gitlabUrl: "https://gitlab.example", gitToken: "token" };
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads exact counts in one request and omits inaccessible or incomplete rows", async () => {
    fetchMock.mockResolvedValue(response([
      node("1", 0, 0), node("2", 3, 1), node("3", 2, 2),
      node("4", null, null), node("5", 1, 2), node("6", 2, null), null,
    ]));
    const result = await getMergeRequestDiscussionSummaries(connection, project, [1, 2, 3, 2, 4, 5, 6, 7]);
    expect(result).toEqual({
      1: { total: 0, resolved: 0 }, 2: { total: 3, resolved: 1 }, 3: { total: 2, resolved: 2 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/graphql$/);
    expect(args(init)).toEqual({ projectPath: "group/repo", first: 7, after: null, iids: ["1","2","3","4","5","6","7"] });
  });

  it("follows a smaller server page size and chunks a long IID list at the GitLab limit", async () => {
    const iids = Array.from({ length: 101 }, (_, i) => i + 1);
    fetchMock
      .mockResolvedValueOnce(response([node("1", 1, 0)], "cursor-1"))
      .mockResolvedValueOnce(response([node("99", 1, 1)]))
      .mockResolvedValueOnce(response([node("101", 4, 3)]));
    expect(await getMergeRequestDiscussionSummaries(connection, project, iids)).toEqual({
      1: { total: 1, resolved: 0 }, 99: { total: 1, resolved: 1 }, 101: { total: 4, resolved: 3 },
    });
    expect(fetchMock.mock.calls.map(([, init]) => [args(init).first, args(init).after]))
      .toEqual([[100, null], [100, "cursor-1"], [1, null]]);
  });

  it("uses all REST pages for an older server and counts only resolvable threads", async () => {
    const resolved = { id: "thread-1", notes: [{ resolvable: true, resolved: true }] };
    const unresolved = { id: "thread-2", notes: [{ resolvable: true, resolved: false }] };
    const comment = { id: "comment", notes: [{ resolvable: false }] };
    fetchMock
      .mockResolvedValueOnce(json({ errors: [missingField] }, 400))
      .mockResolvedValueOnce(json([resolved, comment], 200, { "X-Next-Page": "2" }))
      .mockResolvedValueOnce(json([unresolved]));
    expect(await getMergeRequestDiscussionSummaries(connection, project, [1])).toEqual({ 1: { total: 2, resolved: 1 } });
    expect(fetchMock.mock.calls.slice(1).map(([url]) => new URL(String(url), connection.gitlabUrl).searchParams.get("page")))
      .toEqual(["1", "2"]);

    // With no pagination headers a full page can still be followed by an open thread.
    fetchMock
      .mockResolvedValueOnce(json(Array.from({ length: 100 }, (_, id) => ({ ...resolved, id: String(id) }))))
      .mockResolvedValueOnce(json([unresolved]));
    expect(await getMergeRequestDiscussionSummaries(connection, project, [2])).toEqual({ 2: { total: 101, resolved: 100 } });
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/graphql"))).toHaveLength(1);
  });

  it("keeps incomplete REST notes and inaccessible merge requests unknown", async () => {
    fetchMock.mockResolvedValueOnce(json({ errors: [missingField] }))
      .mockResolvedValueOnce(json([{ id: "unknown", notes: [{ resolvable: true }] }]))
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json({}, 403))
      .mockResolvedValueOnce(json([]));
    expect(await getMergeRequestDiscussionSummaries(connection, project, [1, 2, 3, 4]))
      .toEqual({ 4: { total: 0, resolved: 0 } });
  });

  it("rejects broken pagination instead of marking partially loaded discussions as resolved", async () => {
    fetchMock.mockResolvedValueOnce(response([node("1", 3, 3)], "stuck"))
      .mockResolvedValueOnce(response([node("1", 3, 3)], "stuck"));
    await expect(getMergeRequestDiscussionSummaries(connection, project, [1])).rejects.toThrow();

    fetchMock.mockResolvedValueOnce(json({ errors: [missingField] }))
      .mockResolvedValueOnce(json([{ id: "1", notes: [{ resolvable: true, resolved: true }] }], 200, { "X-Next-Page": "3" }));
    await expect(getMergeRequestDiscussionSummaries(connection, project, [1])).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("does not fan out after authentication, rate-limit, transport, or unrelated schema errors", async () => {
    const otherField = { message: "Field 'other' doesn't exist on type 'MergeRequest'" };
    for (const reply of [json({}, 401), json({}, 429), json({ errors: [missingField, otherField] })]) {
      fetchMock.mockResolvedValueOnce(reply);
      await expect(getMergeRequestDiscussionSummaries(connection, project, [1, 2])).rejects.toThrow();
    }
    fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"));
    await expect(getMergeRequestDiscussionSummaries(connection, project, [1, 2])).rejects.toThrow("Network unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("propagates cancellation between REST pages without publishing partial counts", async () => {
    const controller = new AbortController();
    fetchMock
      .mockResolvedValueOnce(json({ errors: [missingField] }))
      .mockImplementationOnce(async () => {
        controller.abort();
        return json([{ id: "1", notes: [{ resolvable: true, resolved: true }] }], 200, { "X-Next-Page": "2" });
      });
    await expect(getMergeRequestDiscussionSummaries(connection, project, [1], controller.signal)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
