import { cn } from "@/shared/lib/cn";

export const LoadingState = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "flex min-h-[60vh] flex-col items-center justify-center",
      className,
    )}
  >
    <div
      className="size-32 animate-spin rounded-full border-4 border-slate-200 border-t-brand dark:border-slate-700"
      role="status"
      aria-label="Загрузка"
    />
    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{children}</p>
  </div>
);
