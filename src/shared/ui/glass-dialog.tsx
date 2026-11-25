import { type DialogHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/shared/lib/cn';

export const GlassDialog = forwardRef<
  HTMLDialogElement,
  DialogHTMLAttributes<HTMLDialogElement>
>(function GlassDialog({ className, children, ...props }, ref) {
  return (
    <dialog
      {...props}
      ref={ref}
      className={cn(
        'glass-overlay fixed inset-0 m-auto rounded-2xl text-fg-default',
        className,
      )}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          event.currentTarget.close();
      }}
    >
      {children}
    </dialog>
  );
});
