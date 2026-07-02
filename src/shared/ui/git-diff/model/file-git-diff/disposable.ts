import type { IReactionDisposer } from "mobx";

export abstract class DisposableModel {
  protected readonly disposers: IReactionDisposer[] = [];

  dispose() {
    for (const dispose of this.disposers) {
      dispose();
    }
    this.disposers.length = 0;
    this.onDispose();
  }

  protected onDispose() {}
}
