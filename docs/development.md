# Разработка и релизы GitHome

## Разработка

В браузере (быстрая итерация по UI):

```bash
pnpm install
pnpm dev
```

Desktop-приложение с Chromium:

```bash
pnpm install
pnpm dev:electron
```

Если Electron не стартует с ошибкой `Electron failed to install correctly`, переустановите бинарник:

```bash
pnpm rebuild electron
```

## Архитектура интерфейса

Слой `app` собирает рабочее пространство, маршруты и хранилища. Страницы в `pages` объединяют виджеты из `widgets`, пользовательские действия из `features` и сущности GitLab из `entities`. В `shared` находятся клиент GitLab, базовая ViewModel и общие компоненты. Между слайсами используйте их публичный `index.ts` или `index.tsx`.

ViewModel в `model` хранит состояние экрана, задаёт параметры запросов и вызывает готовые операции. React-компонент отображает данные модели и вызывает её методы. Biome проверяет запрет на импорт `useState`, `useRef` и `useEffect`.

GitLab-специфичные HTTP-вызовы, фабрики запросов, мутации и обновления кеша находятся в `src/shared/api/gitlab`. Не собирайте пути API и ключи кеша в моделях экранов. Ключи строятся из идентификатора подключения и ревизии учётных данных, без токена.

Запросы, мутации и аутентификация GitHub и Bitbucket Cloud находятся в `src/shared/api/github` и `src/shared/api/bitbucket` соответственно. Общий контракт провайдера находится в `src/shared/api/forge/contracts.ts`. Адаптер отвечает за аутентификацию, пейджинг и преобразование ответа в общие сущности. Запросы и мутации общего сценария находятся в `src/shared/lib/forge` и не зависят от формата ответа конкретного сервера.

Рабочая область GitHub использует REST API для файлов, дифов и комментариев, а GraphQL — для отметок просмотра и разрешения тредов. Строки списка PR, дерево изменений, редактор GitDiff и подсветка исходников общие с GitLab.

При выборе аккаунта `SettingsStore` один раз подбирает адаптер и хранит его в активной сессии. Общие query и mutations используют адаптер из сессии. Список подключений отображает сохранённые записи без запросов к невыбранным аккаунтам.

Для проверки интерфейса на моках запустите Vite и выполните `pnpm check:browser` для GitLab или `pnpm check:browser:forge` для GitHub и Bitbucket. Если Vite работает не на порту 1420, передайте URL через `BASE`.

## Сборка Electron

```bash
pnpm install
pnpm build:electron
```

Для упаковки macOS запускайте сборку на Mac с установленными Xcode Command Line Tools. Упаковщик компилирует системный обработчик ссылок через `xcrun swiftc`.

Артефакты появятся в `release/`:

| Платформа | Форматы |
|---|---|
| Linux | `.deb`, `.AppImage` |
| macOS | `.dmg` |
| Windows | `.exe` (NSIS installer) |

## Сборка Android APK

Для локальной сборки нужны Node.js LTS, pnpm, JDK 21 и Android SDK (API 36):

```bash
pnpm install
pnpm build:android
```

Устанавливаемый debug APK появится в `android/app/build/outputs/apk/debug/app-debug.apk`.
Сборка поддерживает Android 7.0 (API 24) и новее. В GitHub Actions APK также
прикладывается к релизу.

Команда собирает APK с debug-подписью для локальной проверки. Для обновления
поверх установленной версии оба APK должны быть подписаны одним ключом.
Первый релиз с постоянной подписью нужно установить вручную. Если на устройстве
уже стоит APK с другой подписью, перед удалением старой версии сохраните данные
подключений.

### Установка `.deb` на Ubuntu

Пакет называется `git-home` (как у старой Tauri-сборки) — обновление через apt/dpkg должно проходить без конфликтов.

Если раньше ставили `.deb` из раннего Electron-релиза с именем `githome`, удалите оба пакета и поставьте заново:

```bash
sudo apt remove git-home githome
sudo dpkg -i git-home_*.deb
sudo apt -f install
```

Или используйте `.AppImage` — он не конфликтует с системными пакетами.

### Требования для локальной сборки

- **Linux / macOS / Windows:** Node.js LTS, pnpm
- **Windows:** Visual Studio Build Tools с **Desktop development with C++**
- **macOS:** Xcode Command Line Tools

Сборка web-only (без Electron):

```bash
pnpm build
```

## CI и релизы (GitHub Actions)

Workflow `.github/workflows/release.yml` запускается при каждом push в `main` (и вручную через **Actions → Release → Run workflow**):

1. **build-app** (один раз на Ubuntu) — `tsc` + Vite: `dist/` и `dist-electron/`
2. **package** (matrix) — скачивает bundle и собирает installers:
   - Ubuntu → `.AppImage`, `.deb`
   - Windows → `.exe`
   - macOS → универсальные `.dmg` и `.zip`
3. **android** — собирает APK с возрастающим `versionCode` по номеру workflow.
4. **release** — публикует установщики и метаданные с тегом `v0.1.<github.run_number>`.

Для создания релизов в репозитории нужны права **Settings → Actions → General → Workflow permissions → Read and write permissions**.

## IDE

- [VS Code](https://code.visualstudio.com/) + [Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)

Проверить исходники можно командой `pnpm lint:check`, применить автоматические исправления — `pnpm lint:fix`.

### Обновление приложения

Откройте **Настройки → Обновления** и нажмите **Проверить обновления**. Если
доступна новая версия, скачайте и установите её из этого же окна. Linux `.deb`
может запросить системные права. На Android установку подтверждает системный
установщик. В браузерной сборке доступны проверка версии и ссылка на релизы.

Для публикации APK с постоянной подписью (`githome-android.apk`) задайте в GitHub
Actions секреты `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS` и `ANDROID_KEY_PASSWORD`. Без ключа workflow публикует
`app-debug.apk` для ручной установки. Приложение проверяет размер, SHA-256,
идентификатор пакета, версию и совпадение подписи перед передачей APK установщику.

Для автообновления macOS нужен подписанный и нотарифицированный пакет. Задайте
секреты `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD` и `APPLE_TEAM_ID`. Electron использует `.zip` и
`latest-mac.yml`. Windows и Linux используют `latest.yml` и `latest-linux.yml`.
