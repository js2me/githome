import { beforeEach, describe, expect, it, vi } from "vitest";

const { gitlabPostMock } = vi.hoisted(() => ({
  gitlabPostMock: vi.fn(),
}));

vi.mock("../client", () => ({
  gitlabPost: gitlabPostMock,
}));

import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import type { GitLabProjectDC } from "../data-contracts";
import { createMergeRequestDiscussionNote } from "./create-merge-request-discussion-note";

describe("createMergeRequestDiscussionNote", () => {
  beforeEach(() => {
    gitlabPostMock.mockReset();
  });

  it("posts the reply to the selected discussion notes endpoint", async () => {
    const connection = {} as GitLabConnection;
    const project = { id: 42 } as GitLabProjectDC;
    const note = { id: 7, body: "Thanks" };
    gitlabPostMock.mockResolvedValue(note);

    await expect(
      createMergeRequestDiscussionNote(
        connection,
        project,
        13,
        "discussion/id",
        "Thanks",
      ),
    ).resolves.toBe(note);

    expect(gitlabPostMock).toHaveBeenCalledWith(
      connection,
      "/projects/42/merge_requests/13/discussions/discussion%2Fid/notes",
      { body: "Thanks" },
      undefined,
    );
  });
});
