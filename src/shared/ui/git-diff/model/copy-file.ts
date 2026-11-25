import type { ReactNode } from 'react';
import { ClipboardFeedback } from '@/shared/lib/clipboard-feedback';
import { VM } from '@/shared/lib/view-models/vm';

export class DiffFileCopyVM extends VM<{
  label: string;
  icon: ReactNode;
  getValue: () => string | Promise<string>;
  compact?: boolean;
}> {
  readonly clipboard = new ClipboardFeedback(this.unmountSignal);

  readonly copy = () => this.clipboard.copy(this.payload.getValue);
}
