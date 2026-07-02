import { StatusMessage } from "@/shared/ui/status-message";
import { GitDiffFile } from "./components/git-diff-file";
import "./styles.css";
import { withPropsViewModel } from "mobx-view-model";
import { GitDiffVM } from "./model/git-diff-vm";

export const GitDiff = withPropsViewModel(
  GitDiffVM,
  ({ model: { payload: { changes }, filesGitDiffs } }) => {
    if (changes.length === 0) {
      return (
        <StatusMessage>Изменения в merge request не найдены.</StatusMessage>
      );
    }

    return (
      <div className="git-diff flex flex-col gap-4 overflow-x-auto">
        {filesGitDiffs.map((fileModel) => (
          <GitDiffFile key={fileModel.fileKey} model={fileModel} />
        ))}
      </div>
    );
  },
);
