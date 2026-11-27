import { describe, expect, it } from 'vitest';
import {
  appLink,
  gitlabOrigin,
  gitlabLinkKind,
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
    const rule = new RegExp(navigationRules(origin, true, '').addRules[0]!.condition.regexFilter);
    expect(rule.test(mr)).toBe(true);
    expect(gitlabLinkKind(mr, origin)).toBe('open-mr');
    for (const url of [
      mr.replace(origin, `${origin}.example.org`),
      mr.replace('merge_requests', 'issues'),
      mr.replace('/155/', '/0/'),
      `${origin}/-/merge_requests/155`,
    ]) {
      expect(rule.test(url)).toBe(false);
      expect(gitlabLinkKind(url, origin)).toBeNull();
    }
    expect(new URL(appLink(mr, 'open-mr')).searchParams.get('url')).toBe(mr);
  });

  it('opens individual pipelines directly or through the manual page', () => {
    const pipeline = `${origin}/group/sub/project/-/pipelines/987?ref=main#jobs`;
    const bridge = 'chrome-extension://fixture/open.html';
    const automatic = navigationRules(origin, true, bridge);
    const manual = navigationRules(origin, false, bridge);
    const rule = automatic.addRules[1]!;
    const filter = new RegExp(rule.condition.regexFilter);
    expect(automatic.removeRuleIds).toEqual([1, 2]);
    expect(rule.action.redirect.regexSubstitution).toBe('githome://open-pipeline?raw=\\0');
    expect(manual.addRules[1]?.action.redirect.regexSubstitution).toBe(`${bridge}?url=\\0`);
    expect(filter.test(pipeline)).toBe(true);
    expect(gitlabLinkKind(pipeline, origin)).toBe('open-pipeline');
    expect(new URL(appLink(pipeline, 'open-pipeline')).searchParams.get('url')).toBe(pipeline);
    for (const url of [pipeline.replace('/987', ''), pipeline.replace('/987', '/0'), pipeline.replace(origin, `${origin}.example.org`), mr]) {
      expect(filter.test(url)).toBe(false);
    }
  });
});
