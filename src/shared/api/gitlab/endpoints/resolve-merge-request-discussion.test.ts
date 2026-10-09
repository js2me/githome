import { beforeEach, describe, expect, it, vi } from "vitest";

const { gitlabPutMock } = vi.hoisted(() => ({
  gitlabPutMock: vi.fn(),
}));

vi.mock("../client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../client")>();
  return { ...actual, gitlabPut: gitlabPutMock };
});

import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import type { GitLabProjectDC } from "../data-contracts";
import { resolveMergeRequestDiscussion } from "./resolve-merge-request-discussion";

describe("resolveMergeRequestDiscussion", () => {
  beforeEach(() => {
    gitlabPutMock.mockReset();
  });

  it("sends the discussion status as a GitLab API query parameter", async () => {
    const connection = {} as GitLabConnection;
    const project = { id: 42 } as GitLabProjectDC;
    const discussion = { id: "discussion/id" };
    gitlabPutMock.mockResolvedValue(discussion);

    await expect(
      resolveMergeRequestDiscussion(
        connection,
        project,
        13,
        "discussion/id",
        true,
      ),
    ).resolves.toBe(discussion);

    expect(gitlabPutMock).toHaveBeenCalledWith(
      connection,
      "/projects/42/merge_requests/13/discussions/discussion%2Fid?resolved=true",
      { resolved: true },
      undefined,
    );
  });
});
