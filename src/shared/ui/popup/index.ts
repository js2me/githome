import { PopupPanel } from './popup-panel';
import { PopupRoot } from './popup-root';
import { PopupTrigger } from './popup-trigger';

export const Popup = Object.assign(PopupRoot, {
  Trigger: PopupTrigger,
  Panel: PopupPanel,
});
