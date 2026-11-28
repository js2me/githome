import { ChevronRight, Folder, FolderOpen } from '@gravity-ui/icons';
import { Link } from 'mobx-route/react';
import { withPropsViewModel } from 'mobx-view-model-react';
import { useId } from 'react';
import { t } from '@/shared/lib/i18n';
import { GroupBranchVM } from '../model/group-branch';
import { GroupTree } from './group-tree';

export const GroupTreeBranch = withPropsViewModel(
  GroupBranchVM,
  ({ model }) => {
    const id = useId();
    const { group, tree, depth } = model.payload;
    const { expanded, contents } = model;
    const Icon = expanded ? FolderOpen : Folder;
    const data = contents.data;

    return (
      <li className="min-w-0">
        <div className="group-tree-row" data-expanded={expanded}>
          <div className="group-tree-name">
            <button
              type="button"
              className="group-tree-toggle"
              aria-label={t(
                expanded
                  ? 'navigation.collapseBranch'
                  : 'navigation.expandBranch',
                { v1: group.name },
              )}
              aria-expanded={expanded}
              aria-controls={id}
              onClick={model.toggle}
            >
              <ChevronRight className="size-3.5" aria-hidden />
            </button>
            <Link
              className="group-tree-link group-tree-group-link"
              href={tree.globals.routes.group.createUrl({
                groupPath: group.full_path,
              })}
              title={group.full_path}
            >
              <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden />
              <span className="truncate">{group.name}</span>
            </Link>
          </div>
          <span className="group-tree-path" title={group.full_path}>
            {group.full_path}
          </span>
        </div>
        <div id={id} className="group-tree-branch" hidden={!expanded}>
          {expanded &&
            (contents.isLoading ? (
              <p className="group-tree-branch-status" role="status">
                {t('group.loadingGroup')}
              </p>
            ) : contents.error ? (
              <div className="group-tree-branch-status" role="alert">
                {t('group.couldNotLoadTheGroup')} {contents.error.message}{' '}
                <button
                  type="button"
                  className="cursor-pointer underline"
                  onClick={() => void contents.refetch()}
                >
                  {t('common.retry')}
                </button>
              </div>
            ) : data && (data.subgroups.length || data.projects.length) ? (
              <GroupTree contents={data} tree={tree} depth={depth + 1} />
            ) : data ? (
              <p className="group-tree-branch-status">
                {t('group.thisGroupHasNoSubgroupsOrRepositories')}
              </p>
            ) : null)}
        </div>
      </li>
    );
  },
);
