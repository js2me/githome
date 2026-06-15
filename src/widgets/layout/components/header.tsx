import { observer } from "mobx-react-lite";
import { useViewModel } from "mobx-view-model-react";
import { LayoutVM } from "../model/layout-vm";

export const Header = observer(() => {
  const model = useViewModel(LayoutVM);
  const settings = model.globals.stores.settings;

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__logo" aria-hidden>
          GH
        </div>
        <h1 className="app-header__title">GitHome</h1>
      </div>

      <label className="app-header__field">
        <span className="app-header__label">Связка</span>
        <select
          className="app-header__input app-header__select"
          value={settings.activeId ?? ""}
          onChange={(event) => model.selectConnection(event.target.value)}
        >
          <option value="">Новая связка</option>
          {settings.connectionOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="app-header__field app-header__field--wide">
        <span className="app-header__label">GitLab URL</span>
        <input
          className="app-header__input"
          type="url"
          placeholder="https://gitlab.com"
          value={model.draftGitlabUrl}
          onChange={(event) => model.setDraftGitlabUrl(event.target.value)}
          autoComplete="off"
        />
      </label>

      <label className="app-header__field">
        <span className="app-header__label">Git Token</span>
        <input
          className="app-header__input"
          type="password"
          placeholder="glpat-..."
          value={model.draftGitToken}
          onChange={(event) => model.setDraftGitToken(event.target.value)}
          autoComplete="off"
        />
      </label>

      <div className="app-header__actions">
        <button
          className="app-header__button"
          type="button"
          disabled={!model.canAdd}
          onClick={() => model.addConnection()}
        >
          Добавить
        </button>
        <button
          className="app-header__button app-header__button--secondary"
          type="button"
          disabled={!model.canSave}
          onClick={() => model.saveConnection()}
        >
          Сохранить
        </button>
        <button
          className="app-header__button app-header__button--danger"
          type="button"
          disabled={!model.canRemove}
          onClick={() => model.removeConnection()}
        >
          Удалить
        </button>
      </div>
    </header>
  );
});
