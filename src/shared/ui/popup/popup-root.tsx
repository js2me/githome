import { withPropsViewModel } from 'mobx-view-model-react';
import { cn } from '@/shared/lib/cn';
import { PopupVM } from './model';
import { PopupContext } from './popup-context';

export const PopupRoot = withPropsViewModel(PopupVM, ({ model }) => {
  const { isOpen, className, children } = model.payload;
  return (
    <PopupContext.Provider
      value={{ isOpen, setTriggerRef: model.trigger, setPopupRef: model.panel }}
    >
      <div className={cn('relative', className)}>{children}</div>
    </PopupContext.Provider>
  );
});
