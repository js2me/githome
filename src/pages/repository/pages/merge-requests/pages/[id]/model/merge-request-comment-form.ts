import { actionBound, observable, runInAction } from 'mobx';
import { VM } from '@/shared/lib/view-models/vm';

export class MergeRequestCommentFormVM extends VM<{
  projectId: number;
  canComment: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (body: string) => Promise<boolean>;
  onClearSubmitError: () => void;
}> {
  @observable accessor body = '';

  @actionBound
  change(body: string) {
    this.body = body;
    if (this.payload.submitError) this.payload.onClearSubmitError();
  }

  @actionBound
  async submit() {
    const body = this.body;
    const ok = await this.payload.onSubmit(body);
    if (ok && !this.unmountSignal.aborted && this.body === body) {
      runInAction(() => {
        this.body = '';
      });
    }
  }
}
