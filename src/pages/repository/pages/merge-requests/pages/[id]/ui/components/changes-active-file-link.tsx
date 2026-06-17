import { memo, useLayoutEffect, useState } from "react";
import { getDiffFileElementId } from "@/shared/lib/diff-search";
import { findChangesTreeFileItem } from "@/shared/lib/scroll-into-container";
import "./changes-active-file-link.css";

interface ConnectorPath {
  d: string;
}

const buildConnectorPath = (
  x1: number,
  y1: number,
  cardRect: DOMRect,
) => {
  const x2 = cardRect.left;

  if (y1 >= cardRect.top && y1 <= cardRect.bottom) {
    return `M ${x1} ${y1} H ${x2}`;
  }

  const endY = y1 < cardRect.top ? cardRect.top : cardRect.bottom;
  const midX = x1 + (x2 - x1) / 2;

  return `M ${x1} ${y1} H ${midX} V ${endY} H ${x2}`;
};

const getConnectorPath = (activeFileKey: string): ConnectorPath | null => {
  const nav = document.querySelector<HTMLElement>(".changes-file-tree__nav");
  if (!nav) {
    return null;
  }

  const treeItem = findChangesTreeFileItem(nav, activeFileKey);
  if (!treeItem) {
    return null;
  }

  const diffCard = document.getElementById(getDiffFileElementId(activeFileKey));
  if (!diffCard) {
    return null;
  }

  const treeRect = treeItem.getBoundingClientRect();
  const cardRect = diffCard.getBoundingClientRect();

  if (treeRect.height === 0 || cardRect.height === 0) {
    return null;
  }

  return {
    d: buildConnectorPath(
      treeRect.right,
      treeRect.top + treeRect.height / 2,
      cardRect,
    ),
  };
};

export const ChangesActiveFileLink = memo(
  ({ activeFileKey }: { activeFileKey: string | null }) => {
    const [path, setPath] = useState<ConnectorPath | null>(null);

    useLayoutEffect(() => {
      if (!activeFileKey) {
        setPath(null);
        return;
      }

      let rafId: number | null = null;
      let cancelled = false;
      let teardown: (() => void) | null = null;

      const update = () => {
        if (cancelled) {
          return;
        }

        setPath(getConnectorPath(activeFileKey));
      };

      const scheduleUpdate = () => {
        if (rafId !== null) {
          return;
        }

        rafId = requestAnimationFrame(() => {
          rafId = null;
          update();
        });
      };

      const attach = () => {
        if (cancelled) {
          return;
        }

        const diffCard = document.getElementById(
          getDiffFileElementId(activeFileKey),
        );

        if (!diffCard) {
          rafId = requestAnimationFrame(attach);
          return;
        }

        update();

        const nav = document.querySelector<HTMLElement>(
          ".changes-file-tree__nav",
        );
        const tree = document.querySelector<HTMLElement>(".changes-file-tree");

        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate, { passive: true });
        document.addEventListener("scroll", scheduleUpdate, {
          passive: true,
          capture: true,
        });
        nav?.addEventListener("scroll", scheduleUpdate, { passive: true });

        const resizeObserver = new ResizeObserver(scheduleUpdate);
        resizeObserver.observe(diffCard);
        if (nav) {
          resizeObserver.observe(nav);
        }
        if (tree) {
          resizeObserver.observe(tree);
        }

        teardown = () => {
          resizeObserver.disconnect();
          window.removeEventListener("scroll", scheduleUpdate);
          window.removeEventListener("resize", scheduleUpdate);
          document.removeEventListener("scroll", scheduleUpdate, {
            capture: true,
          });
          nav?.removeEventListener("scroll", scheduleUpdate);
        };
      };

      attach();

      return () => {
        cancelled = true;
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        teardown?.();
      };
    }, [activeFileKey]);

    if (!path) {
      return null;
    }

    return (
      <svg className="changes-active-file-link" aria-hidden="true">
        <path className="changes-active-file-link__line" d={path.d} fill="none" />
      </svg>
    );
  },
);
