import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { usePopupContext } from './popup-context';

const panelClassName =
  'glass-overlay absolute top-[calc(100%+6px)] z-50 rounded-xl p-4';

interface PopupPanelProps {
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}

export const PopupPanel = ({
  ariaLabel,
  className,
  children,
}: PopupPanelProps) => {
  const { isOpen, setPopupRef } = usePopupContext();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={setPopupRef}
      className={cn(panelClassName, className)}
      role="dialog"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};
