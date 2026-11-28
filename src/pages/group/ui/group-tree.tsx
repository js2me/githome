import { Link } from 'mobx-route/react';
import type { CSSProperties } from 'react';
import type { GroupContents } from '@/shared/api/gitlab/endpoints/groups/get-group-overview';
import { ProjectAvatar } from '@/shared/ui/project-avatar';
import type { GroupPageVM } from '../model/page-vm';
import { GroupTreeBranch } from './group-tree-branch';

export function GroupTree({
  contents,
  tree,
  depth = 0,
}: {
  contents: GroupContents;
  tree: GroupPageVM;
  depth?: number;
}) {
  return (
    <ul
      className="group-tree"
      style={{ '--group-depth': Math.min(depth, 8) } as CSSProperties}
    >
      {contents.subgroups.map((group) => (
        <GroupTreeBranch
          key={`group-${group.id}`}
          group={group}
          depth={depth}
          tree={tree}
        />
      ))}
      {contents.projects.map((project) => (
        <li key={`project-${project.id}`} className="group-tree-row">
          <div className="group-tree-name">
            <span className="group-tree-toggle-spacer" aria-hidden />
            <Link
              className="group-tree-link"
              href={tree.globals.routes.repository.createUrl({
                projectId: project.id,
              })}
              title={project.path_with_namespace}
            >
              <ProjectAvatar
                className="size-4 shrink-0 rounded-sm"
                id={project.id}
                avatarUrl={project.avatar_url}
                name={project.name}
              />
              <span className="truncate">{project.name}</span>
            </Link>
          </div>
          <span className="group-tree-path" title={project.path_with_namespace}>
            {project.path_with_namespace}
          </span>
        </li>
      ))}
    </ul>
  );
}
