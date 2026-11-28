import { observer } from 'mobx-react-lite';
import type { MergeRequestDetailVM } from '../../../../model/merge-request-detail';
import { MrProjectPath } from '../../navigation/mr-project-path';
import { MrLifecycleActions } from '../lifecycle/mr-lifecycle-actions';
import { MergeRequestOverview } from '../merge-request-overview';
import { MergeRequestReactions } from './merge-request-reactions';

export const MergeRequestHeader = observer(
  ({ model }: { model: MergeRequestDetailVM }) => {
    const page = model.parentViewModel;
    const info = page.mrInfo;
    const detail = info.detailView;
    if (!detail) return null;
    const { mergeRequest } = detail;
    return (
      <MergeRequestOverview
        mergeRequest={mergeRequest}
        jira={page.jiraSummary}
        projectPath={<MrProjectPath model={model} trailingSeparator />}
        reactions={<MergeRequestReactions model={info.reactions} />}
        actions={
          <MrLifecycleActions
            key={`lifecycle-${mergeRequest.web_url}`}
            model={model}
          />
        }
      />
    );
  },
);
