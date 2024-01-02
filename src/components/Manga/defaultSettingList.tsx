import MdOutlineFormatTextdirectionLToR from '@material-design-icons/svg/round/format_textdirection_l_to_r.svg';
import MdOutlineFormatTextdirectionRToL from '@material-design-icons/svg/round/format_textdirection_r_to_l.svg';

import { Show, type Component } from 'solid-js';

import { throttle } from 'throttle-debounce';
import { lang, setLang, t } from 'helper/i18n';
import { needDarkMode, clamp } from 'helper';
import { SettingsItem } from './components/SettingsItem';
import { SettingsItemSwitch } from './components/SettingsItemSwitch';
import { SettingHotkeys } from './components/SettingHotkeys';
import { SettingTranslation } from './components/SettingTranslation';
import { SettingsShowItem } from './components/SettingsShowItem';
import { SettingsItemSelect } from './components/SettingsItemSelect';
import {
  createStateSetFn,
  setOption,
  switchDir,
  updateImgLoadType,
  zoomScrollModeImg,
} from './actions';
import { _setState, setState, store } from './store';

import classes from './index.module.css';
import { SettingsItemNumber } from './components/SettingsItemNumber';
import { areaArrayMap } from './components/TouchArea';

export type SettingList = (
  | [string, Component]
  | [string, Component, boolean]
)[];

/** 默认菜单项 */
export const defaultSettingList: () => SettingList = () => [
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
        <SettingsItemSelect
          name={t('setting.option.scrollbar_position')}
          options={[
            ['auto', t('setting.option.scrollbar_position_auto')],
            ['right', t('setting.option.scrollbar_position_right')],
            ['top', t('setting.option.scrollbar_position_top')],
            ['bottom', t('setting.option.scrollbar_position_bottom')],
            ['hidden', t('setting.option.scrollbar_position_hidden')],
          ]}
          value={store.option.scrollbar.position}
          onChange={createStateSetFn('scrollbar.position')}
        />
        <SettingsShowItem when={store.option.scrollbar.position !== 'hidden'}>
          <Show when={!store.isMobile}>
            <SettingsItemSwitch
              name={t('setting.option.scrollbar_auto_hidden')}
              value={store.option.scrollbar.autoHidden}
              onChange={createStateSetFn('scrollbar.autoHidden')}
            />
          </Show>
          <SettingsItemSwitch
            name={t('setting.option.scrollbar_show_img_status')}
            value={store.option.scrollbar.showImgStatus}
            onChange={createStateSetFn('scrollbar.showImgStatus')}
          />
          <Show when={store.option.scrollMode}>
            <SettingsItemSwitch
              name={t('setting.option.scrollbar_easy_scroll')}
              value={store.option.scrollbar.easyScroll}
              onChange={createStateSetFn('scrollbar.easyScroll')}
            />
          </Show>
        </SettingsShowItem>
      </>
    ),
  ],
  [
    t('setting.option.paragraph_operation'),
    () => (
      <>
        <SettingsItemSwitch
          name={t('setting.option.jump_to_next_chapter')}
          value={store.option.jumpToNext}
          onChange={createStateSetFn('jumpToNext')}
        />

        <SettingsItemSwitch
          name={t('setting.option.show_clickable_area')}
          value={store.show.touchArea}
          onChange={() => _setState('show', 'touchArea', !store.show.touchArea)}
        />

        <SettingsItemSwitch
          name={t('setting.option.click_page_turn_enabled')}
          value={store.option.clickPageTurn.enabled}
          onChange={createStateSetFn('clickPageTurn.enabled')}
        />
        <SettingsShowItem when={store.option.clickPageTurn.enabled}>
          <SettingsItemSelect
            name={t('setting.option.click_page_turn_area')}
            options={Object.keys(areaArrayMap).map(
              (key) => [key, t(`touch_area.type.${key}`)] as [string, string],
            )}
            value={store.option.clickPageTurn.area}
            onChange={createStateSetFn('clickPageTurn.area')}
          />
          <SettingsItemSwitch
            name={t('setting.option.click_page_turn_swap_area')}
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
          name={t('setting.option.disable_auto_enlarge')}
          value={store.option.disableZoom}
          onChange={createStateSetFn('disableZoom')}
        />

        <Show when={store.option.scrollMode}>
          <SettingsItemNumber
            name={t('setting.option.scroll_mode_img_scale')}
            maxLength={3}
            suffix="%"
            step={5}
            onChange={(val) => {
              if (Number.isNaN(val)) return;
              zoomScrollModeImg(val / 100, true);
            }}
            value={Math.round(store.option.scrollModeImgScale * 100)}
          />
          <SettingsItemNumber
            name={t('setting.option.scroll_mode_img_spacing')}
            maxLength={5}
            onChange={(val) => {
              if (Number.isNaN(val)) return;
              setOption((draftOption) => {
                draftOption.scrollModeSpacing = clamp(0, val, Infinity);
              });
            }}
            value={Math.round(store.option.scrollModeSpacing)}
          />
        </Show>
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
          name={t('setting.option.show_comments')}
          value={store.option.showComment}
          onChange={createStateSetFn('showComment')}
        />

        <SettingsItemSwitch
          name={t('setting.option.swap_page_turn_key')}
          value={store.option.swapPageTurnKey}
          onChange={createStateSetFn('swapPageTurnKey')}
        />

        <SettingsItemNumber
          name={t('setting.option.preload_page_num')}
          maxLength={5}
          onChange={(val) => {
            if (Number.isNaN(val)) return;
            setOption((draftOption) => {
              draftOption.preloadPageNum = clamp(0, val, 99999);
            });
          }}
          value={store.option.preloadPageNum}
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
            ['zh', '中文'],
            ['en', 'English'],
            ['ru', 'Русский'],
          ]}
          value={lang()}
          onChange={setLang}
        />
      </>
    ),
    true,
  ],
];
