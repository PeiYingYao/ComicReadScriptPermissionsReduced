import MdLooksOne from '@material-design-icons/svg/round/looks_one.svg';
import MdLooksTwo from '@material-design-icons/svg/round/looks_two.svg';
import MdViewDay from '@material-design-icons/svg/round/view_day.svg';
import MdQueue from '@material-design-icons/svg/round/queue.svg';
import MdSettings from '@material-design-icons/svg/round/settings.svg';

import { useMemo, useCallback, useState } from 'react';
import { useStore } from './hooks/useStore';
import { IconBotton } from '../IconBotton';
import { SettingPanel } from './components/SettingPanel';

import classes from './index.module.css';

interface DefaultSettingsButtonProps {
  /** 触发鼠标离开工具栏的事件 */
  onMouseLeave: () => void;
}

export type DefaultButtonList = [
  string,
  React.FC<DefaultSettingsButtonProps>,
][];

// FIXME: ESlint 莫名把这列表当成了 jsdoc，等之后更新修复再删除这个注释
// eslint-disable-next-line jsdoc/require-param
/** 工具栏的默认按钮列表 */
export const defaultButtonList: DefaultButtonList = [
  [
    '单页模式',
    () => {
      const isOnePageMode = useStore((state) => state.option.onePageMode);
      const swiper = useStore((state) => state.swiper);
      const handleClick = useCallback(() => {
        useStore.setState((draftState) => {
          // 在卷轴模式下切换单页模式时自动退出卷轴模式
          if (draftState.option.scrollMode)
            draftState.option.scrollMode = false;
          draftState.option.onePageMode = !draftState.option.onePageMode;
          draftState.img.updateSlideData((state) => {
            const newSlideIndex = state.option.onePageMode
              ? state.activeImgIndex
              : state.slideData.findIndex((slide) =>
                  slide.some((img) => img.index === state.activeImgIndex),
                );
            setTimeout(() => {
              swiper?.slideTo(newSlideIndex, 0);
            });
          });
        });
      }, [swiper]);

      return (
        <IconBotton tip="单页模式" onClick={handleClick}>
          {isOnePageMode ? <MdLooksOne /> : <MdLooksTwo />}
        </IconBotton>
      );
    },
  ],
  [
    '卷轴模式',
    () => {
      const enabled = useStore((state) => state.option.scrollMode);

      const handleClick = useCallback(() => {
        useStore.setState((draftState) => {
          draftState.option.scrollMode = !draftState.option.scrollMode;
          draftState.option.onePageMode = draftState.option.scrollMode;

          draftState.img.updateSlideData();

          const [swiper, panzoom] = draftState.initSwiper({
            // 启用自由模式
            freeMode: {
              enabled: draftState.option.scrollMode,
              sticky: false,
              // 稍微减少一点自由模式下的滑动距离
              momentumRatio: 0.7,
            },
            // 使用自带的鼠标滚轮模块
            mousewheel: draftState.option.scrollMode
              ? { eventsTarget: `.${classes.mangaFlow}` }
              : false,
            // 保持当前显示页面不变
            initialSlide: draftState.swiper?.activeIndex,
          });

          draftState.swiper = swiper;
          draftState.panzoom = panzoom;
        });
      }, []);

      return (
        <IconBotton tip="卷轴模式" enabled={enabled} onClick={handleClick}>
          <MdViewDay />
        </IconBotton>
      );
    },
  ],
  [
    '页面填充',
    () => {
      const enabled = useStore(
        (state) => state.fillEffect.get(state.nowFillIndex)!,
      );
      const isOnePageMode = useStore((state) => state.option.onePageMode);

      const handleClick = useStore((state) => state.img.switchFillEffect);

      return (
        <IconBotton
          tip="页面填充"
          enabled={enabled}
          hidden={isOnePageMode}
          onClick={handleClick}
        >
          <MdQueue />
        </IconBotton>
      );
    },
  ],
  ['分隔', () => <div style={{ height: '1em' }} />],
  [
    '设置',
    ({ onMouseLeave }) => {
      const [showPanel, setShowPanel] = useState(false);

      const handleClick = useCallback(() => {
        useStore.setState((draftState) => {
          draftState.showToolbar = !showPanel;
        });
        setShowPanel(!showPanel);
      }, [showPanel]);

      const popper = useMemo(
        () => (
          <>
            <SettingPanel />
            <div
              className={classes.closeCover}
              onClick={() => {
                handleClick();
                onMouseLeave();
              }}
              role="button"
              tabIndex={-1}
              aria-label="关闭设置弹窗的遮罩"
            />
          </>
        ),
        [handleClick, onMouseLeave],
      );

      return (
        <IconBotton
          tip="设置"
          enabled={showPanel}
          showTip={showPanel}
          onClick={handleClick}
          popperClassName={showPanel && classes.SettingPanelPopper}
          popper={showPanel && popper}
        >
          <MdSettings />
        </IconBotton>
      );
    },
  ],
];
