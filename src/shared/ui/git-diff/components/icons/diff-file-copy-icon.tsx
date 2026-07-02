import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export const DiffFileCopyIcon = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <svg
    aria-hidden="true"
    className={cn("h-3.5 w-3.5", className)}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);
