import MdOutlineFormatTextdirectionLToR from '@material-design-icons/svg/round/format_textdirection_l_to_r.svg';
import MdOutlineFormatTextdirectionRToL from '@material-design-icons/svg/round/format_textdirection_r_to_l.svg';

import { type Component } from 'solid-js';

import { throttle } from 'throttle-debounce';
import { lang, setLang, t } from 'helper/i18n';
import { SettingsItem } from './components/SettingsItem';
import { SettingsItemSwitch } from './components/SettingsItemSwitch';
import { SettingHotkeys } from './components/SettingHotkeys';
import { SettingTranslation } from './components/SettingTranslation';
import {
  createStateSetFn,
  setOption,
  switchDir,
  updateImgLoadType,
} from './hooks/useStore/slice';
import { setState, store } from './hooks/useStore';
import { needDarkMode } from '../../helper';

import classes from './index.module.css';
import { SettingsShowItem } from './components/SettingsShowItem';
import { SettingsItemSelect } from './components/SettingsItemSelect';

export type SettingList = (
  | [string, Component]
  | [string, Component, boolean]
)[];

/** 默认菜单项 */
export const defaultSettingList: SettingList = [
  [
    t('setting.option.paragraph_dir'),
    () => (
      <SettingsItem
        name={
          store.option.dir === 'rtl'
            ? t('setting.option.dir_rtl')
            : t('setting.option.dir_ltr')
        }
      >
        <button
          class={classes.SettingsItemIconButton}
          type="button"
          on:click={switchDir}
        >
          {store.option.dir === 'rtl' ? (
            <MdOutlineFormatTextdirectionRToL />
          ) : (
            <MdOutlineFormatTextdirectionLToR />
          )}
        </button>
      </SettingsItem>
    ),
  ],
  [
    t('setting.option.paragraph_scrollbar'),
    () => (
      <>
        <SettingsItemSwitch
          name={t('setting.option.scrollbar_show')}
          value={store.option.scrollbar.enabled}
          onChange={createStateSetFn('scrollbar.enabled')}
        />
        <SettingsShowItem when={store.option.scrollbar.enabled}>
          <SettingsItemSwitch
            name={t('setting.option.scrollbar_auto_hidden')}
            value={store.option.scrollbar.autoHidden}
            onChange={createStateSetFn('scrollbar.autoHidden')}
          />
          <SettingsItemSwitch
            name={t('setting.option.scrollbar_show_img_status')}
            value={store.option.scrollbar.showImgStatus}
            onChange={createStateSetFn('scrollbar.showImgStatus')}
          />
        </SettingsShowItem>
      </>
    ),
  ],
  [
    t('setting.option.paragraph_operation'),
    () => (
      <>
        <SettingsItemSwitch
          name={t('setting.option.jump_to_next')}
          value={store.option.jumpToNext}
          onChange={createStateSetFn('jumpToNext')}
        />

        <SettingsItemSwitch
          name={t('setting.option.click_page_turn_enabled')}
          value={store.option.clickPageTurn.enabled}
          onChange={createStateSetFn('clickPageTurn.enabled')}
        />
        <SettingsItemSwitch
          name={t('setting.option.click_page_turn_vertical')}
          value={store.option.clickPageTurn.vertical}
          onChange={createStateSetFn('clickPageTurn.vertical')}
        />
        <SettingsItemSwitch
          name={t('setting.option.show_touch_area')}
          value={store.showTouchArea}
          onChange={() => {
            setState((state) => {
              state.showTouchArea = !state.showTouchArea;
            });
          }}
        />
        <SettingsShowItem when={store.option.clickPageTurn.enabled}>
          <SettingsItemSwitch
            name={t('setting.option.click_page_turn_lr_reverse')}
            value={store.option.clickPageTurn.reverse}
            onChange={createStateSetFn('clickPageTurn.reverse')}
          />
        </SettingsShowItem>
      </>
    ),
  ],
  [
    t('setting.option.paragraph_display'),
    () => (
      <>
        <SettingsItemSwitch
          name={t('setting.option.dark_mode')}
          value={store.option.darkMode}
          onChange={createStateSetFn('darkMode')}
        />

        <SettingsItemSwitch
          name={t('setting.option.disable_zoom_in')}
          value={store.option.disableZoom}
          onChange={createStateSetFn('disableZoom')}
        />
      </>
    ),
  ],
  [t('setting.option.paragraph_hotkeys'), SettingHotkeys, true],
  [t('setting.option.paragraph_translation'), SettingTranslation, true],
  [
    t('setting.option.paragraph_other'),
    () => (
      <>
        <SettingsItemSwitch
          name={t('setting.option.always_load_all_img')}
          value={store.option.alwaysLoadAllImg}
          onChange={(val) => {
            setOption((draftOption) => {
              draftOption.alwaysLoadAllImg = val;
            });
            setState(updateImgLoadType);
          }}
        />

        <SettingsItemSwitch
          name={t('setting.option.first_page_fill')}
          value={store.option.firstPageFill}
          onChange={createStateSetFn('firstPageFill')}
        />

        <SettingsItemSwitch
          name={t('setting.option.show_comment')}
          value={store.option.showComment}
          onChange={createStateSetFn('showComment')}
        />

        <SettingsItemSwitch
          name={t('setting.option.reverse_page_turn_key')}
          value={store.option.reversePageTurnKey}
          onChange={createStateSetFn('reversePageTurnKey')}
        />

        <SettingsItem name={t('setting.option.background_color')}>
          <input
            type="color"
            style={{ width: '2em', 'margin-right': '.4em' }}
            value={
              store.option.customBackground ??
              (store.option.darkMode ? '#000000' : '#ffffff')
            }
            on:input={throttle(20, (e) => {
              if (!e.target.value) return;
              setOption((draftOption) => {
                // 在拉到纯黑或纯白时改回初始值
                draftOption.customBackground =
                  e.target.value === '#000000' || e.target.value === '#ffffff'
                    ? undefined
                    : e.target.value;
                if (draftOption.customBackground)
                  draftOption.darkMode = needDarkMode(
                    draftOption.customBackground,
                  );
              });
            })}
          />
        </SettingsItem>

        <SettingsItemSelect
          name={t('setting.language')}
          options={[
            ['zh', t('language.zh')],
            ['en', t('language.en')],
          ]}
          value={lang()}
          onChange={setLang}
        />
      </>
    ),
    true,
  ],
];
