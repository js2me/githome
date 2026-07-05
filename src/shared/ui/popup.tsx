import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { cn } from "@/shared/lib/cn";

const panelClassName =
  "absolute top-[calc(100%+6px)] z-50 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-gray-900";

interface PopupContextValue {
  isOpen: boolean;
  setTriggerRef: (node: HTMLElement | null) => void;
  setPopupRef: (node: HTMLDivElement | null) => void;
}

const PopupContext = createContext<PopupContextValue | null>(null);

const usePopupContext = () => {
  const context = useContext(PopupContext);

  if (!context) {
    throw new Error("Popup compound components must be used within Popup");
  }

  return context;
};

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

const PopupRoot = ({ isOpen, onClose, className, children }: PopupProps) => {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const setTriggerRef = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);

  const setPopupRef = useCallback((node: HTMLDivElement | null) => {
    popupRef.current = node;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        popupRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }

      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <PopupContext.Provider value={{ isOpen, setTriggerRef, setPopupRef }}>
      <div className={cn("relative", className)}>{children}</div>
    </PopupContext.Provider>
  );
};

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
