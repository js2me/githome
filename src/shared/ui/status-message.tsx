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
    className={cn(
      "mt-5 rounded-xl border px-4 py-3.5 text-sm",
      error
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200"
        : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-gray-900 dark:text-slate-300",
      className,
    )}
  >
    {children}
  </div>
);
