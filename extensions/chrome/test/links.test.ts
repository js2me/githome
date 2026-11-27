import { describe, expect, it } from 'vitest';
import {
  appLink,
  gitlabOrigin,
  isMergeRequest,
  mergeRequestFilter,
  navigationRules,
  permissionPattern,
} from '../links.js';

const origin = 'https://gitlab.example.com';
const mr = `${origin}/group/subgroup/project/-/merge_requests/155/diffs?left=1&right=2#note_4`;

describe('GitHome Chrome links', () => {
  it('accepts only HTTPS GitLab origins and asks Chrome for that host alone', () => {
    expect(gitlabOrigin(' gitlab.example.com ')).toBe(origin);
    expect(gitlabOrigin('https://gitlab.example.com:8443/')).toBe(`${origin}:8443`);
    expect(permissionPattern(`${origin}:8443`)).toBe('https://gitlab.example.com/*');
    expect(gitlabOrigin('http://gitlab.example.com')).toBeNull();
    expect(gitlabOrigin('https://gitlab.example.com/group')).toBeNull();
    expect(gitlabOrigin('https://user@gitlab.example.com')).toBeNull();
  });

  it('uses the desktop protocol directly in automatic mode', () => {
    const bridge = 'chrome-extension://fixture/open.html';
    const automatic = navigationRules(origin, true, bridge).addRules[0];
    const manual = navigationRules(origin, false, bridge).addRules[0];
    expect(automatic?.action.redirect.regexSubstitution).toBe('githome://open-mr?raw=\\0');
    expect(manual?.action.redirect.regexSubstitution).toBe(`${bridge}?url=\\0`);
    expect(navigationRules(null, true, bridge).addRules).toEqual([]);
  });

  it('only matches MR navigations on the configured origin and preserves the link', () => {
    const rule = new RegExp(mergeRequestFilter(origin));
    expect(rule.test(mr)).toBe(true);
    expect(isMergeRequest(mr, origin)).toBe(true);
    for (const url of [
      mr.replace(origin, `${origin}.example.org`),
      mr.replace('merge_requests', 'issues'),
      mr.replace('/155/', '/0/'),
      `${origin}/-/merge_requests/155`,
    ]) {
      expect(rule.test(url)).toBe(false);
      expect(isMergeRequest(url, origin)).toBe(false);
    }
    expect(new URL(appLink(mr)).searchParams.get('url')).toBe(mr);
  });
});
