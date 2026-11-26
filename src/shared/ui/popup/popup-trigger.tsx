import type { ReactNode } from 'react';
import { usePopupContext } from './popup-context';

export const PopupTrigger = ({
  children,
}: {
  children: (setTriggerRef: (node: HTMLElement | null) => void) => ReactNode;
}) => {
  const { setTriggerRef } = usePopupContext();

  return children(setTriggerRef);
};
