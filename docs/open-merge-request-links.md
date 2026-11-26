# Как открывать ссылки на MR в GitHome

Если Paseo, почта или другое приложение открывает обычную HTTPS-ссылку в Chrome, расширение может передать её в GitHome. Chrome при этом остаётся браузером по умолчанию. Остальные ссылки открываются как обычно.

## 1. Проверьте GitHome

Установите сборку GitHome с поддержкой `--open-mr` и добавьте подключение к своему GitLab. На Ubuntu/Debian используйте пакет `.deb`, на macOS установите приложение в папку `/Applications`.

Перед настройкой расширения проверьте запуск из терминала. Замените ссылку в примерах на ссылку на доступный вам MR.

**Ubuntu/Debian**

```bash
/opt/GitHome/githome --open-mr 'https://gitlab.example.com/team/project/-/merge_requests/42'
```

В исправленном пакете `.deb` можно использовать короткую команду `githome --open-mr '…'`.

**macOS**

```bash
/Applications/GitHome.app/Contents/MacOS/GitHome --open-mr 'https://gitlab.example.com/team/project/-/merge_requests/42'
```

Откроется окно GitHome с указанным MR. Если приложение уже запущено, MR откроется в нём же.

## 2. Настройте Chrome

1. Установите [External Application Launcher](https://chromewebstore.google.com/detail/external-application-laun/bifmfjgpgndemajpeeopbeilbaifdo).
2. Откройте настройки расширения → **Native Integration**. Нажмите **Check Connection**. Если помощник не установлен, нажмите **Download Native Client**, распакуйте архив и запустите `./install.sh` из распакованной папки. Затем снова нажмите **Check Connection**.
3. Перейдите в **Application Setup** и заполните поля.

   | Поле | Значение |
   | --- | --- |
   | **Display Name** | `GitHome` |
   | **Executable Name** | `/opt/GitHome/githome` на Ubuntu/Debian или `/Applications/GitHome.app/Contents/MacOS/GitHome` на macOS |
   | **Arguments** | `--open-mr [HREF]` |
   | **Placement → Navigation** | Включите **Activate when a link navigation matches one of the redirect patterns** и введите `https://gitlab.example.com/*/-/merge_requests/*`, заменив домен на адрес своего GitLab |

4. Нажмите **Add Application** и проверьте обычную HTTPS-ссылку на MR из Paseo. В GitHome оставьте выключенной системную опцию **Настройки → Оформление → Открывать ссылки на MR из других приложений**.

## Если не работает

- **Терминал пишет `/usr/bin/githome-bin: not found`.** Это ошибка лаунчера в старом пакете `.deb`. Он ищет бинарник рядом с символьной ссылкой `/usr/bin/githome`. Переустановите обновлённый пакет. Пока это не сделано, для запуска приложения используйте полный путь `/opt/GitHome/githome`. Для открытия MR также нужна сборка с `--open-mr`.
- **Команда работает, а Chrome не открывает GitHome.** Проверьте соединение в **Native Integration**, галочку **Navigation** и адрес в шаблоне. В **Executable Name** должен быть полный путь, а `[HREF]` — частью поля **Arguments**.
- **GitHome не находит подключение.** Добавьте в настройках GitHome сервер, к которому относится MR.
- **Chrome сообщает, что он не браузер по умолчанию.** Выключите системную обработку ссылок в GitHome и, если Chrome не восстановился автоматически, снова выберите его браузером по умолчанию в настройках ОС.

## Вариант без расширения

На macOS и Ubuntu/Debian с пакетом `.deb` можно включить **Настройки → Оформление → Открывать ссылки на MR из других приложений**. GitHome станет системным обработчиком HTTPS и будет передавать обычные ссылки прежнему браузеру. При таком варианте Chrome может сообщать, что он больше не браузер по умолчанию. Чтобы вернуть прежний браузер, выключите эту опцию.
