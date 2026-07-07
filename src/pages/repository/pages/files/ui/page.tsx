import { withViewModel } from "mobx-view-model-react";
import { StatusMessage } from "@/shared/ui/status-message";
import { FilesPageVM } from "../model";
import { BranchPicker } from "./components/branch-picker";
import { CommitPicker } from "./components/commit-picker";
import { FilesSearch } from "./components/files-search";
import { FileTree } from "./components/file-tree";
import { FileViewer } from "./components/file-viewer";

export const FilesPage = withViewModel(FilesPageVM, ({ model }) => {
  if (!model.ref) {
    return (
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-[22px] font-semibold">Files</h2>
          <BranchPicker model={model} />
          <CommitPicker model={model} />
          <FilesSearch model={model} />
        </div>
        <StatusMessage>
          {model.project ? "Загружаем ветку..." : "Загружаем репозиторий..."}
        </StatusMessage>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-[22px] font-semibold">Files</h2>
        <BranchPicker model={model} />
        <CommitPicker model={model} />
        <FilesSearch model={model} />
      </div>

      <div className="flex gap-4">
        <div className="w-[min(100%,320px)] shrink-0 self-start">
          <div className="sticky top-4">
            <FileTree treeModel={model.treeModel} />
          </div>
        </div>

        <FileViewer model={model} />
      </div>
    </section>
  );
});
