import { Capacitor } from "@capacitor/core";
import { actionBound, computed, observable, observableRef, runInAction } from "mobx";
import { androidUpdater } from "@/shared/lib/app-update/android-updater";
import { getAndroidUpdateAsset, getLatestRelease, isNewerRelease, type AndroidUpdateAsset } from "@/shared/lib/app-update/github-release";
import type { AppUpdateState } from "@/shared/lib/app-update/types";

export class AppUpdates {
  @observableRef accessor state: AppUpdateState = {
    status: "idle",
    version: import.meta.env.VITE_APP_VERSION,
  };
  @observable accessor isInitializing = true;
  @observable accessor isInvoking = false;

  readonly isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  private readonly desktop = window.githomeDesktop?.updates;
  private asset?: AndroidUpdateAsset;

  @computed
  get isBusy() {
    return this.isInitializing || this.isInvoking ||
      ["checking", "downloading", "installing"].includes(this.state.status);
  }

  @actionBound
  async connect(signal: AbortSignal) {
    let receivedEvent = false;
    const unsubscribe = this.desktop?.subscribe((state) => {
      receivedEvent = true;
      this.setState(state);
    });
    if (unsubscribe) signal.addEventListener("abort", unsubscribe, { once: true });

    try {
      const state = this.desktop
        ? await this.desktop.getState()
        : this.isAndroid
          ? { status: "idle" as const, ...await androidUpdater.getInfo() }
          : this.state;

      if (!signal.aborted && !receivedEvent) this.setState(state);
    } catch {
      if (!signal.aborted && !receivedEvent) {
        this.setState({
          status: "error",
          version: this.state.version,
          message: "Не удалось получить текущую версию GitHome.",
        });
      }
    } finally {
      if (!signal.aborted) runInAction(() => { this.isInitializing = false; });
    }
  }

  @actionBound
  async perform() {
    if (this.isBusy) return;
    const { status, version, nextVersion } = this.state;
    this.isInvoking = true;

    try {
      if (this.desktop) {
        const command = status === "ready" ? "install" : status === "available" ? "download" : "check";
        await this.desktop[command]();
        this.setState(await this.desktop.getState());
      } else if (this.isAndroid && status === "ready") {
        this.setState({ status: "installing", version, nextVersion });
        const { message } = await androidUpdater.install();
        this.setState({ status: "ready", version, nextVersion, message });
      } else if (this.isAndroid && status === "available" && this.asset) {
        this.setState({ status: "downloading", version, nextVersion, progress: 0 });
        const listener = await androidUpdater.addListener("progress", ({ percent }) => {
          this.setState({ status: "downloading", version, nextVersion, progress: percent });
        });
        try {
          await androidUpdater.download(this.asset);
          this.setState({ status: "ready", version, nextVersion });
        } finally {
          void listener.remove().catch(console.error);
        }
      } else {
        this.asset = undefined;
        this.setState({ status: "checking", version });
        const release = await getLatestRelease();
        if (!isNewerRelease(release.tag_name, version)) {
          this.setState({ status: "current", version });
          return;
        }

        const latestVersion = release.tag_name.replace(/^v/, "");
        this.asset = this.isAndroid ? getAndroidUpdateAsset(release) : undefined;
        this.setState(this.asset
          ? { status: "available", version, nextVersion: latestVersion }
          : {
              status: "manual",
              version,
              nextVersion: latestVersion,
              message: this.isAndroid
                ? "В этом релизе пока нет APK для обновления поверх установленной версии."
                : "Установщики новой версии доступны на GitHub.",
            });
      }
    } catch (error) {
      const apkMissing = error instanceof Error && "code" in error && error.code === "APK_MISSING";
      const androidInstallFailed = this.isAndroid && status === "ready" && !apkMissing;
      this.setState({
        status: androidInstallFailed ? "ready" : "error",
        version,
        nextVersion,
        message: (this.isAndroid && (status === "ready" || status === "available") &&
          error instanceof Error && error.message) ||
          "Не удалось обновить GitHome. Проверьте соединение и попробуйте снова.",
      });
    } finally {
      runInAction(() => { this.isInvoking = false; });
    }
  }

  @actionBound
  private setState(state: AppUpdateState) {
    this.state = state;
  }
}
