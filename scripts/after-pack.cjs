const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

exports.default = async (context) => {
  if (context.electronPlatformName === "darwin") {
    const { Arch } = require("electron-builder");
    const helpers = path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
      "Contents",
      "Helpers",
    );
    const helper = path.join(helpers, "link-handler");
    if (context.arch === Arch.universal) {
      // electron-builder merges the two Mach-O helpers before this final hook.
      fs.accessSync(helper, fs.constants.X_OK);
      return;
    }
    const arch = { [Arch.x64]: "x86_64", [Arch.arm64]: "arm64" }[context.arch];
    if (!arch) throw new Error("Unsupported architecture for the macOS link handler");
    fs.mkdirSync(helpers, { recursive: true });
    execFileSync("xcrun", [
      "swiftc",
      "-O",
      "-target", `${arch}-apple-macos12.0`,
      path.join(__dirname, "macos-link-handler.swift"),
      "-o", helper,
    ], { stdio: "inherit" });
    return;
  }

  if (context.electronPlatformName !== "linux") {
    return;
  }

  const executablePath = path.join(
    context.appOutDir,
    context.packager.executableName,
  );
  const realExecutablePath = `${executablePath}-bin`;
  const launcherPath = path.join(__dirname, "linux-launcher.sh");

  if (!fs.existsSync(executablePath)) {
    throw new Error(`Packaged Electron executable not found: ${executablePath}`);
  }

  fs.renameSync(executablePath, realExecutablePath);
  fs.copyFileSync(launcherPath, executablePath);
  fs.chmodSync(executablePath, 0o755);
};
