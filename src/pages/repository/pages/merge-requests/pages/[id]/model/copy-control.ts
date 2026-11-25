import { actionBound } from 'mobx';
import { ClipboardFeedback } from '@/shared/lib/clipboard-feedback';
import { VM } from '@/shared/lib/view-models/vm';

export class CopyControlVM extends VM<{
  value: string;
  label: string;
  branch?: 'source' | 'target';
}> {
  readonly clipboard = new ClipboardFeedback(this.unmountSignal);

  @actionBound
  copy() {
    return this.clipboard.copy(() => this.payload.value);
  }
}
