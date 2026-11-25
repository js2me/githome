import { withPropsViewModel } from 'mobx-view-model-react';
import { createContext, type ReactNode, useContext } from 'react';
import { cn } from '@/shared/lib/cn';
import { PopupVM } from './model';

const panelClassName =
  'glass-overlay absolute top-[calc(100%+6px)] z-50 rounded-xl p-4';

interface PopupContextValue {
  isOpen: boolean;
  setTriggerRef: (node: HTMLElement | null) => void;
  setPopupRef: (node: HTMLDivElement | null) => void;
}

const PopupContext = createContext<PopupContextValue | null>(null);

const usePopupContext = () => {
  const context = useContext(PopupContext);

  if (!context) {
    throw new Error('Popup compound components must be used within Popup');
  }

  return context;
};

const PopupRoot = withPropsViewModel(PopupVM, ({ model }) => {
  const { isOpen, className, children } = model.payload;
  return (
    <PopupContext.Provider
      value={{ isOpen, setTriggerRef: model.trigger, setPopupRef: model.panel }}
    >
      <div className={cn('relative', className)}>{children}</div>
    </PopupContext.Provider>
  );
});

const PopupTrigger = ({
  children,
}: {
  children: (setTriggerRef: (node: HTMLElement | null) => void) => ReactNode;
}) => {
  const { setTriggerRef } = usePopupContext();

  return children(setTriggerRef);
};

interface PopupPanelProps {
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}

const PopupPanel = ({ ariaLabel, className, children }: PopupPanelProps) => {
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

export const Popup = Object.assign(PopupRoot, {
  Trigger: PopupTrigger,
  Panel: PopupPanel,
});
