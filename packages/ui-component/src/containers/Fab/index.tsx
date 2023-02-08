import MdMenuBook from '@material-design-icons/svg/round/menu_book.svg';

import type { CSSProperties } from 'react';
import { useCallback, useRef, useState, useEffect } from 'react';
import { throttle } from 'throttle-debounce';

import classes from './index.module.css';

export interface FabProps {
  /** 百分比进度值，小数 */
  progress?: number;
  /** 提示文本 */
  tip?: string;
  /** 快速拨号按钮 */
  speedDial?: React.FC[];
  /** 是否显示。为空时将会根据滚动自动显隐 */
  show?: boolean;
  /** 初始时是否显示 */
  initShow?: boolean;

  children?: JSX.Element | JSX.Element[];
  style?: CSSProperties;
  onClick?: () => void;
}

/**
 * Fab 按钮
 */
export const Fab: React.FC<FabProps> = ({
  progress = 0,
  tip,
  speedDial,
  show: forceShow,
  initShow = true,
  children,
  style,
  onClick,
}) => {
  // 上次滚动位置
  const lastY = useRef(window.scrollY);
  const [show, setShow] = useState(initShow);

  // 绑定滚动事件
  useEffect(() => {
    window.addEventListener(
      'scroll',
      throttle(200, (e: Event) => {
        // 跳过非用户操作的滚动
        if (e.isTrusted === false) return;
        if (window.scrollY === lastY.current) return;
        setShow(window.scrollY - lastY.current < 0);
        lastY.current = window.scrollY;
      }),
    );
  }, []);

  // 将 forceShow 的变化同步到 show 上
  useEffect(() => {
    if (forceShow) setShow(forceShow);
  }, [forceShow]);

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <div
      className={classes.fabRoot}
      style={style}
      data-show={forceShow ?? show}
    >
      <button type="button" className={classes.fab} onClick={handleClick}>
        {children ?? <MdMenuBook />}

        {/* 环形进度条 */}
        <span
          className={classes.progress}
          role="progressbar"
          aria-valuenow={progress}
        >
          <svg
            viewBox="22 22 44 44"
            style={{ strokeDashoffset: `${(1 - progress) * 290}%` }}
          >
            <circle cx="44" cy="44" r="20.2" fill="none" strokeWidth="3.6" />
          </svg>
        </span>

        {tip ? <div className={classes.popper}>{tip}</div> : null}
      </button>

      {/* 快捷操作栏 */}
      {speedDial?.length ? (
        <div className={classes.speedDial}>
          <div className={classes.backdrop} />
          {speedDial?.map((SpeedDialItem, i) => (
            <div
              className={classes.speedDialItem}
              style={
                {
                  '--show-delay': `${i * 30}ms`,
                  '--hide-delay': `${(speedDial.length - 1 - i) * 50}ms`,
                } as CSSProperties
              }
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              data-i={i * 30}
            >
              <SpeedDialItem />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
