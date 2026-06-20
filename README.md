# GitHome

Desktop-клиент для GitLab на базе Tauri + React + TypeScript.

## Разработка

```bash
pnpm install
pnpm tauri:dev
```

## Сборка Tauri

### Ubuntu / Debian

1. Установите системные зависимости:

```bash
sudo ./scripts/install-linux-deps.sh
```

2. Соберите приложение:

```bash
pnpm install
./scripts/build-tauri.sh linux
# или
pnpm tauri:build
```

Артефакты появятся в `src-tauri/target/release/bundle/` (`.deb`, `.AppImage`).

### macOS

Нужны Xcode Command Line Tools:

```bash
xcode-select --install
```

Сборка универсального бинарника (Apple Silicon + Intel):

```bash
pnpm install
./scripts/build-tauri.sh macos-universal
# или
pnpm tauri:build:macos-universal
```

Артефакты появятся в `src-tauri/target/universal-apple-darwin/release/bundle/` (`.dmg`, `.app`).

### Windows

1. Установите [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) с компонентом **Desktop development with C++**.
2. Установите [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Evergreen Bootstrapper), если его ещё нет в системе.
3. Установите [Rust](https://www.rust-lang.org/tools/install) и [Node.js LTS](https://nodejs.org/).

Сборка:

```powershell
pnpm install
pnpm tauri:build
# или
pwsh ./scripts/build-tauri.ps1
```

Артефакты появятся в `src-tauri/target/release/bundle/` (`.msi`, `.exe` NSIS installer).

### CI (GitHub Actions)

Workflow `.github/workflows/tauri-build.yml` собирает приложение на `ubuntu-22.04`, `macos-latest` и `windows-latest`, затем загружает bundle-артефакты. Запускается при push/PR в `main` и вручную через **Actions → Build Tauri → Run workflow**.

## IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
