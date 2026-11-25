import { cn } from "@/shared/lib/cn";

export const StatusMessage = ({
  error = false,
  className,
  children,
}: {
  error?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    role={error ? "alert" : "status"}
    className={cn(
      "glass-panel mt-5 rounded-xl px-4 py-3.5 text-sm",
      error
        ? "border-red-200 bg-red-50/85 text-red-700 dark:border-red-900 dark:bg-red-950/85 dark:text-red-300"
        : "text-fg-muted",
      className,
    )}
  >
    {children}
  </div>
);
