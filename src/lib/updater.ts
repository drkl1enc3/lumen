import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import i18n from "../i18n";
import { isTauri } from "./tauri";

type Toast = (message: string, kind?: "info" | "success" | "error") => void;
type PendingUpdate = Awaited<ReturnType<typeof check>>;

let pending: PendingUpdate = null;

export async function checkForUpdates(interactive: boolean, toast: Toast): Promise<boolean> {
  if (!isTauri) {
    if (interactive) toast(i18n.t("settings.updateOnlyApp"), "error");
    return false;
  }
  try {
    const update = await check();
    if (!update) {
      pending = null;
      if (interactive) toast(i18n.t("toast.noUpdate"), "success");
      return false;
    }
    pending = update;
    toast(i18n.t("toast.updateAvailable", { version: update.version }), "info");
    return true;
  } catch (error) {
    if (interactive) toast(String(error), "error");
    return false;
  }
}

export async function installPendingUpdate(toast: Toast): Promise<void> {
  if (!isTauri) {
    toast(i18n.t("settings.updateOnlyApp"), "error");
    return;
  }
  try {
    if (!pending) {
      pending = await check();
    }
    if (!pending) {
      toast(i18n.t("toast.noUpdate"), "info");
      return;
    }
    toast(i18n.t("toast.updateDownloading"), "info");
    await pending.downloadAndInstall();
    await relaunch();
  } catch (error) {
    toast(String(error), "error");
  }
}
