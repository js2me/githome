import { cn } from "@/shared/lib/cn";

export const LoadingState = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    role="status"
    className={cn(
      "glass-panel flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl p-8",
      className,
    )}
  >
    <div
      className="size-6 rounded-full border-2 border-[var(--glass-border)] border-t-[var(--glass-accent)] motion-safe:animate-spin"
      aria-hidden
    />
    <p className="text-sm text-fg-muted">{children}</p>
  </div>
);
