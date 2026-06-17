import type { GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import {
  clampChangesFileTreeWidth,
  estimateChangesFileTreeWidth,
} from "@/shared/lib/changes-file-tree-width";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const getChangesKey = (changes: GitLabMergeRequestChangeDC[]) =>
  changes.map((change) => `${change.old_path}\0${change.new_path}`).join("\n");

export const useChangesFileTreeWidth = (
  changes: GitLabMergeRequestChangeDC[],
) => {
  const changesKey = useMemo(() => getChangesKey(changes), [changes]);
  const autoWidth = useMemo(
    () => estimateChangesFileTreeWidth(changes),
    [changesKey],
  );

  const [width, setWidth] = useState(autoWidth);
  const userAdjustedRef = useRef(false);

  useEffect(() => {
    userAdjustedRef.current = false;
    setWidth(autoWidth);
  }, [changesKey, autoWidth]);

  useEffect(() => {
    const handleResize = () => {
      setWidth((current) => clampChangesFileTreeWidth(current));
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();

      const startX = event.clientX;
      const startWidth = width;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const next = clampChangesFileTreeWidth(
          startWidth + moveEvent.clientX - startX,
        );
        userAdjustedRef.current = true;
        setWidth(next);
      };

      const handlePointerUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    },
    [width],
  );

  return { width, handleResizePointerDown };
};

export {
  clampChangesFileTreeWidth,
  estimateChangesFileTreeWidth,
  getMaxChangesFileTreeWidthForViewport,
} from "@/shared/lib/changes-file-tree-width";
