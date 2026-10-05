const fs = require("node:fs");
const path = require("node:path");

exports.default = async (context) => {
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
