import {
  BookOpen,
  ChartLine,
  Code,
  CodePullRequest,
  Timeline,
} from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { useViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import type { LayoutVM } from '../model/layout-vm';

export const ProjectSections = observer(() => {
  const model = useViewModel<LayoutVM>();
  const { routes } = model.globals;
  if (!routes.repository.isOpened && !routes.repository.hasOpenedChildren)
    return null;
  if (!model.projectIdParam) return null;

  const sections = [
    {
      label: t('workbench.overview'),
      icon: BookOpen,
      current:
        routes.repository.isOpened && !routes.repository.hasOpenedChildren,
      open: model.openRepository,
    },
    {
      label: t('common.files'),
      icon: Code,
      current: routes.files.isOpened,
      open: model.openFiles,
    },
    {
      label: t('common.mergeRequests'),
      icon: CodePullRequest,
      current: routes.mergeRequests.isOpened || routes.mergeRequest.isOpened,
      open: model.openMergeRequests,
    },
    {
      label: t('pipelines.pipelines'),
      icon: Timeline,
      current: routes.pipelines.isOpened,
      open: model.openPipelines,
    },
    {
      label: t('analytics.analytics'),
      icon: ChartLine,
      current: routes.analytics.isOpened,
      open: model.openAnalytics,
    },
  ];

  return (
    <nav
      aria-label={t('repository.projectSections')}
      className="workbench-sections"
    >
      {sections.map(({ label, icon: Icon, current, open }) => (
        <button
          type="button"
          key={label}
          aria-current={current ? 'page' : undefined}
          onClick={open}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </nav>
  );
});
