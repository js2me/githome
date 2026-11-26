import { createContext, useContext } from 'react';

interface PopupContextValue {
  isOpen: boolean;
  setTriggerRef: (node: HTMLElement | null) => void;
  setPopupRef: (node: HTMLDivElement | null) => void;
}

export const PopupContext = createContext<PopupContextValue | null>(null);

export const usePopupContext = () => {
  const context = useContext(PopupContext);

  if (!context) {
    throw new Error('Popup compound components must be used within Popup');
  }

  return context;
};
