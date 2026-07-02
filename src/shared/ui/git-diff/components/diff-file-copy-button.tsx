import { memo, type ReactNode, useCallback, useState } from "react";
import { cva } from "yummies/css";
import { CopiedIcon } from "./icons/copied-icon";
import { CopyFailedIcon } from "./icons/copy-failed-icon";

const diffFileCopyButtonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center rounded transition disabled:cursor-wait disabled:opacity-60",
  {
    variants: {
      compact: {
        true: "h-5 w-5 text-[var(--color-fg-subtle)] hover:bg-[var(--color-accent-emphasis-hover)] hover:text-[var(--diff-code-text)] dark:text-[var(--color-fg-muted)] dark:hover:bg-[var(--color-canvas-muted)] [&_svg]:h-3 [&_svg]:w-3",
        false:
          "h-7 w-7 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-canvas-default dark:text-slate-300 dark:hover:bg-slate-800",
      },
    },
    defaultVariants: {
      compact: false,
    },
  },
);

export const DiffFileCopyButton = memo(
  ({
    label,
    icon,
    getValue,
    compact = false,
  }: {
    label: string;
    icon: ReactNode;
    getValue: () => string | Promise<string>;
    compact?: boolean;
  }) => {
    const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

    const handleCopy = useCallback(async () => {
      setStatus("idle");

      try {
        const value = await getValue();
        await navigator.clipboard.writeText(value);
        setStatus("copied");
        window.setTimeout(() => setStatus("idle"), 1200);
      } catch {
        setStatus("failed");
        window.setTimeout(() => setStatus("idle"), 1600);
      }
    }, [getValue]);

    return (
      <button
        className={diffFileCopyButtonVariants({ compact })}
        type="button"
        title={
          status === "copied"
            ? "Скопировано"
            : status === "failed"
              ? "Не удалось скопировать"
              : label
        }
        aria-label={label}
        disabled={status === "copied"}
        onClick={() => {
          void handleCopy();
        }}
      >
        {status === "copied"
          ? <CopiedIcon />
          : status === "failed"
            ? <CopyFailedIcon />
            : icon}
      </button>
    );
  },
);
