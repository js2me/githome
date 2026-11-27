import { describe, expect, it } from 'vitest';
import type {
  NavTreeGroup,
  NavTreeItem,
} from '@/shared/lib/navigation/nav-tree';
import { buildWorkspaceTree } from './workspace-tree';

describe('buildWorkspaceTree', () => {
  it('nests projects within namespaces without mixing GitLab connections', () => {
    const projects = [
      ['a', 'group/subgroup/one'],
      ['a', 'group/three'],
      ['b', 'group/subgroup/two'],
      ['a', 'group/empty'],
      ['a', 'user/personal', true],
    ] as const;
    const groups: NavTreeGroup[] = [];
    const items: NavTreeItem[] = [];
    for (const [
      index,
      [connectionId, title, personalNamespace],
    ] of projects.entries()) {
      const groupId = `repository:${connectionId}:${index}`;
      groups.push({
        id: groupId,
        title,
        kind: 'repository',
        payload: { connectionId, projectId: index, personalNamespace },
      });
      if (title.endsWith('/empty')) continue;
      items.push({
        id: `mr:${index}`,
        groupId,
        kind: 'merge-request',
        title: 'Review',
        payload: {
          connectionId,
          projectId: index,
          projectPath: title,
          mergeRequestIid: 1,
        },
      });
    }
    expect(buildWorkspaceTree({ groups, items })).toMatchObject([
      {
        label: 'group',
        path: 'group',
        connectionId: 'a',
        children: [
          {
            label: 'subgroup',
            path: 'group/subgroup',
            children: [{ label: 'one', items: [{ id: 'mr:0' }] }],
          },
          { label: 'three', items: [{ id: 'mr:1' }] },
        ],
      },
      {
        label: 'group',
        connectionId: 'b',
        children: [
          {
            label: 'subgroup',
            children: [{ label: 'two', items: [{ id: 'mr:2' }] }],
          },
        ],
      },
      { label: 'user/personal', items: [{ id: 'mr:4' }] },
    ]);
  });
});
