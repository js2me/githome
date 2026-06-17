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

### CI (GitHub Actions)

Workflow `.github/workflows/tauri-build.yml` собирает приложение на `ubuntu-22.04` и `macos-latest` и загружает bundle-артефакты. Запускается при push/PR в `main` и вручную через **Actions → Build Tauri → Run workflow**.

## IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
