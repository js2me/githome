import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const script = readFileSync(new URL('../content/project.js', import.meta.url), 'utf8');
const origin = 'https://gitlab.example.com';
const path = '/platform/tools/example-sdk';
const projectDataset = {
  page: 'projects:show',
  projectId: '42',
  projectFullPath: path.slice(1),
};

async function openProject(
  href: string,
  dataset: typeof projectDataset,
  settings = { origin, auto: true },
) {
  const url = new URL(href);
  const location = { href, origin: url.origin, pathname: url.pathname };
  await runInNewContext(script, {
    chrome: { storage: { local: { get: async () => settings } } },
    document: { body: { dataset } },
    location,
  });
  return location.href;
}

describe('Chrome project homepage detection', () => {
  it('hands off a nested project homepage on the configured GitLab', async () => {
    const url = `${origin}${path}/?view=overview#readme`;
    const handoff = new URL(await openProject(url, projectDataset));
    expect(handoff.host).toBe('open-project');
    expect(handoff.searchParams.get('url')).toBe(url);
  });

  it('does not redirect groups, subpages, other hosts or manual mode', async () => {
    const project = origin + path;
    const group = origin + '/platform/tools';
    const branch = project + '/-/tree/main';
    const anotherHost = 'https://another.example.com' + path;
    expect(await openProject(group, { ...projectDataset, page: 'groups:show' })).toBe(group);
    expect(await openProject(branch, projectDataset)).toBe(branch);
    expect(await openProject(anotherHost, projectDataset)).toBe(anotherHost);
    expect(await openProject(project, projectDataset, { origin, auto: false })).toBe(project);
  });
});
