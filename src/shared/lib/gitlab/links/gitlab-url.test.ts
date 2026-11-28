import { describe, expect, it } from 'vitest';
import { resolveGitlabQuickLink } from './gitlab-url';

describe('resolveGitlabQuickLink', () => {
  it('keeps a pasted GitLab URL and its fragment', () => {
    const url =
      'https://gitlab.example/group/project/-/merge_requests/42/diffs#note_7';
    expect(resolveGitlabQuickLink(` ${url} `)).toBe(url);
  });

  it('resolves nested MR shorthand relative to the active instance', () => {
    expect(
      resolveGitlabQuickLink('group/team/project!42', 'gitlab.example/gitlab/'),
    ).toBe(
      'https://gitlab.example/gitlab/group/team/project/-/merge_requests/42',
    );
  });

  it('leaves search terms and bare IIDs to the search', () => {
    for (const term of ['beta deployment', 'group/project', '!42', '42']) {
      expect(resolveGitlabQuickLink(term, 'https://gitlab.example')).toBe('');
    }
    expect(resolveGitlabQuickLink('group/project!42')).toBe('');
  });
});
