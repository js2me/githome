import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { useChangesFileTreeWidth } from "../hooks/use-changes-file-tree-width";

export const ChangesTreeLayout = ({
  changes,
  tree,
  connector,
  children,
}: {
  changes: GitLabMergeRequestChangeDC[];
  tree: ReactNode;
  connector: ReactNode;
  children: ReactNode;
}) => {
  const { width, handleResizePointerDown } = useChangesFileTreeWidth(changes);

  return (
    <div className="changes-tree-layout flex min-w-0 flex-col gap-4 lg:flex-row">
      <div className="changes-tree-layout__sidebar relative z-10 w-full shrink-0 self-stretch lg:w-auto" style={{ width }}>
        <div className="changes-tree-layout__sticky relative lg:sticky lg:top-4">
          {tree}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={width}
            aria-label="Изменить ширину дерева файлов"
            className={cn(
              "changes-tree-layout__resize-handle absolute -right-2 top-0 z-10 h-full w-4 cursor-col-resize touch-none select-none",
              "after:absolute after:left-1/2 after:top-0 after:h-full after:w-px after:-translate-x-1/2 after:bg-[var(--file-tree-border)]",
              "hover:after:w-0.5 hover:after:bg-accent-blue",
            )}
            onPointerDown={handleResizePointerDown}
          />
        </div>
      </div>

      {connector}

      <div className="relative z-20 flex min-w-0 flex-1 flex-col gap-5">
        {children}
      </div>
    </div>
  );
};
