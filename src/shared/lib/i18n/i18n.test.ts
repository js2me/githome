import { autorun } from 'mobx';
import { afterEach, describe, expect, it } from 'vitest';
import { getLanguage, getLocale, readLanguage, setLanguage, t } from './index';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import zhCN from './locales/zh-CN.json';
import { LocalizedError } from './localized-error';

afterEach(() => setLanguage('en'));

describe('interface localization', () => {
  it('defaults to English and restores only supported saved languages', () => {
    expect(readLanguage({ getItem: () => null })).toBe('en');
    expect(readLanguage({ getItem: () => 'de' })).toBe('en');
    expect(readLanguage({ getItem: () => 'zh-CN' })).toBe('zh-CN');
    expect(
      readLanguage({
        getItem: () => {
          throw new Error('Storage unavailable');
        },
      }),
    ).toBe('en');

    setLanguage('fr');
    setLanguage('invalid');
    expect(getLanguage()).toBe('fr');
    expect(getLocale()).toBe('fr-FR');
  });

  it('reacts to changes even for messages created before switching languages', () => {
    const error = new LocalizedError('review.pasteAGitlabMergeRequestLink');
    const messages: string[] = [];
    const dispose = autorun(() => messages.push(t('settings.title')));
    setLanguage('ru');
    setLanguage('fr');
    setLanguage('zh-CN');
    dispose();

    expect(messages).toEqual(['Settings', 'Настройки', 'Paramètres', '设置']);
    expect(error.message).toContain('GitLab');
    expect(error.message).toContain('链接');
  });

  it('has the same messages and interpolation variables in every catalog', () => {
    const withoutPluralSuffix = (key: string) =>
      key.replace(/_(one|few|many|other)$/, '');
    const variables = (value: string) =>
      [...value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
    const messages = (catalog: Record<string, string>) =>
      Object.fromEntries(
        Object.entries(catalog).map(([key, value]) => [
          withoutPluralSuffix(key),
          variables(value),
        ]),
      );
    for (const catalog of [ru, fr, zhCN]) {
      expect(messages(catalog)).toEqual(messages(en));
    }
  });

  it('uses each language’s plural rules for hidden diff lines', () => {
    expect(t('diff.hiddenLineCount', { count: 1 })).toBe(
      '1 unchanged line hidden',
    );
    expect(t('diff.hiddenLineCount', { count: 2 })).toBe(
      '2 unchanged lines hidden',
    );
    setLanguage('ru');
    expect(t('diff.hiddenLineCount', { count: 2 })).toBe(
      'Скрыты 2 строки без изменений',
    );
    expect(t('diff.hiddenLineCount', { count: 5 })).toBe(
      'Скрыто 5 строк без изменений',
    );
    setLanguage('zh-CN');
    expect(t('diff.hiddenLineCount', { count: 2 })).toBe(
      '已隐藏 2 行未更改的内容',
    );
  });
});
