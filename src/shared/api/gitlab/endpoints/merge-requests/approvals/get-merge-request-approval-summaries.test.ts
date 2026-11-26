import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import type { GitLabProjectDC } from '../../../data-contracts';
import { getMergeRequestApprovalSummaries } from './get-merge-request-approval-summaries';

const connection: GitLabConnection = {
  id: 'gitlab',
  gitlabUrl: 'https://gitlab.example',
  gitToken: 'fake-token',
};
const project: GitLabProjectDC = {
  id: 42,
  name: 'project',
  path_with_namespace: 'group/project',
  web_url: 'https://gitlab.example/group/project',
};
const vote = { user: { id: 1, name: 'Ada', username: 'ada' } };

describe('getMergeRequestApprovalSummaries', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    {
      rule: 'satisfied',
      fields: { approvals_required: 2, approvals_left: 0 },
      votes: [vote],
      expected: true,
    },
    {
      rule: 'partially satisfied',
      fields: { approvals_required: 2, approvals_left: 1 },
      votes: [vote],
      expected: false,
    },
    {
      rule: 'remaining despite the approved flag',
      fields: { approvals_left: 1, approved: true },
      votes: [vote],
      expected: false,
    },
    {
      rule: 'optional with a vote',
      fields: { approvals_required: 0 },
      votes: [vote],
      expected: true,
    },
    {
      rule: 'explicitly blocked despite an optional vote',
      fields: { approvals_required: 0, approved: false },
      votes: [vote],
      expected: false,
    },
    {
      rule: 'optional without votes',
      fields: { approvals_required: 0, approved: true },
      votes: [],
      expected: false,
    },
    {
      rule: 'explicitly approved',
      fields: { approved: true },
      votes: [vote],
      expected: true,
    },
    {
      rule: 'explicitly not approved',
      fields: { approved: false },
      votes: [vote],
      expected: false,
    },
    {
      rule: 'unknown eligibility',
      fields: { approvals_required: 1 },
      votes: [vote],
      expected: null,
    },
    { rule: 'missing rules', fields: {}, votes: [vote], expected: null },
    { rule: 'no votes', fields: {}, votes: [], expected: false },
  ])(
    'keeps the original count for a $rule rule',
    async ({ fields, votes, expected }) => {
      fetchMock.mockResolvedValueOnce(
        Response.json({ ...fields, approved_by: votes }),
      );

      await expect(
        getMergeRequestApprovalSummaries(connection, project, [9]),
      ).resolves.toEqual({
        9: { count: votes.length, approved: expected },
      });
    },
  );

  it('omits unavailable and incomplete responses while keeping known results, once per MR', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(Response.json({ approved: true }))
      .mockResolvedValueOnce(
        Response.json({ approved_by: [vote], approvals_left: 0 }),
      );
    const signal = new AbortController().signal;

    await expect(
      getMergeRequestApprovalSummaries(
        connection,
        project,
        [7, 8, 9, 7],
        signal,
      ),
    ).resolves.toEqual({
      9: { count: 1, approved: true },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [index, [url, options]] of fetchMock.mock.calls.entries()) {
      expect(new URL(String(url), connection.gitlabUrl).pathname).toMatch(
        new RegExp(
          `/api/v4/projects/42/merge_requests/${index + 7}/approvals$`,
        ),
      );
      expect(options?.signal).toBe(signal);
    }
  });

  it('propagates cancellation instead of returning an empty summary', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(async () => {
      controller.abort();
      throw controller.signal.reason;
    });

    await expect(
      getMergeRequestApprovalSummaries(
        connection,
        project,
        [9],
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
