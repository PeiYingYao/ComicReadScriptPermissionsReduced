/* eslint-disable solid/reactivity */
import { debounce, throttle } from 'throttle-debounce';
import { createEffect, onCleanup } from 'solid-js';

import { assign, isEqualArray } from 'helper';
import type { MangaProps } from '..';
import { refs, setState, store } from '../store';
import {
  defaultHotkeys,
  focus,
  handleResize,
  updatePageData,
} from '../actions';
import type { Option } from '../store/option';
import { autoCloseFill } from '../handleComicData';
import { playAnimation } from '../helper';

const createComicImg = (url: string): ComicImg => ({
  type: store.flag.autoWide ? 'wide' : '',
  src: url || '',
  loadType: 'wait',
});

/** 初始化 */
export const useInit = (props: MangaProps) => {
  // 初始化配置
  createEffect(() => {
    setState((state) => {
      if (props.option)
        state.option = assign(state.option, props.option as Option);
      state.hotkeys = {
        ...JSON.parse(JSON.stringify(defaultHotkeys)),
        ...props.hotkeys,
      };
      state.commentList = props.commentList;
    });
  });

  // 初始化页面比例
  handleResize(refs.root.scrollWidth, refs.root.scrollHeight);
  // 在 rootDom 的大小改变时更新比例，并重新计算图片类型
  const resizeObserver = new ResizeObserver(
    throttle<ResizeObserverCallback>(100, ([{ contentRect }]) => {
      handleResize(contentRect.width, contentRect.height);
    }),
  );
  resizeObserver.disconnect();
  resizeObserver.observe(refs.root);
  onCleanup(() => resizeObserver.disconnect());

  createEffect(() => {
    setState((state) => {
      state.prop.Exit = props.onExit
        ? (isEnd?: boolean | Event) => {
            playAnimation(refs.exit);
            props.onExit?.(!!isEnd);
            if (isEnd) state.activePageIndex = 0;
            state.show.endPage = undefined;
          }
        : undefined;
      state.prop.Prev = props.onPrev
        ? debounce(
            1000,
            () => {
              playAnimation(refs.prev);
              props.onPrev?.();
            },
            { atBegin: true },
          )
        : undefined;
      state.prop.Next = props.onNext
        ? debounce(
            1000,
            () => {
              playAnimation(refs.next);
              props.onNext?.();
            },
            { atBegin: true },
          )
        : undefined;

      if (props.editButtonList)
        state.prop.editButtonList = props.editButtonList;
      if (props.editSettingList)
        state.prop.editSettingList = props.editSettingList;

      state.prop.Loading = props.onLoading
        ? debounce(100, props.onLoading)
        : undefined;
      state.prop.OptionChange = props.onOptionChange
        ? debounce(100, props.onOptionChange)
        : undefined;
      state.prop.HotkeysChange = props.onHotkeysChange
        ? debounce(100, props.onHotkeysChange)
        : undefined;
    });
  });

  // 处理 imgList fillEffect 参数的初始化和修改
  createEffect(() => {
    setState((state) => {
      if (props.fillEffect) state.fillEffect = props.fillEffect;

      if (
        isEqualArray(
          props.imgList,
          state.imgList.map(({ src }) => src),
        )
      )
        return state.prop.Loading?.(state.imgList);

      state.show.endPage = undefined;

      /** 判断是否是初始化 */
      const isInit =
        !state.imgList.length ||
        state.imgList.filter(({ src }) => props.imgList.includes(src)).length <=
          2;

      // 处理初始化
      if (isInit) {
        state.flag.autoScrollMode = true;
        state.flag.autoWide = true;
        autoCloseFill.clear();

        if (!state.option.firstPageFill || props.imgList.length <= 3)
          state.fillEffect[-1] = false;
        state.imgList = [...props.imgList].map(createComicImg);
        updatePageData(state);
        state.prop.Loading?.(state.imgList);
        state.activePageIndex = 0;
        return;
      }

      for (let i = 0; i < state.imgList.length; i++) {
        const img = state.imgList[i];
        // 将被删除图片的 fillEffect 记录删掉
        if (!props.imgList.includes(img.src))
          Reflect.deleteProperty(state.fillEffect, i);
      }

      /** 修改前的当前显示图片 */
      const oldActiveImg =
        state.pageList[state.activePageIndex]?.map(
          (i) => state.imgList?.[i]?.src,
        ) ?? [];

      state.imgList = [...props.imgList].map(
        (imgUrl) =>
          state.imgList.find((img) => img.src === imgUrl) ??
          createComicImg(imgUrl),
      );
      updatePageData(state);
      state.prop.Loading?.(state.imgList);

      if (state.pageList.length === 0) {
        state.activePageIndex = 0;
        return;
      }

      // 尽量使当前显示的图片在修改后依然不变
      oldActiveImg.some((imgUrl) => {
        // 跳过填充页和已被删除的图片
        if (!imgUrl || props.imgList.includes(imgUrl)) return false;

        const newPageIndex = state.pageList.findIndex((page) =>
          page.some((index) => state.imgList?.[index]?.src === imgUrl),
        );
        if (newPageIndex === -1) return false;

        state.activePageIndex = newPageIndex;
        return true;
      });

      // 如果已经翻到了最后一页，且最后一页的图片被删掉了，那就保持在末页显示
      if (state.activePageIndex > state.pageList.length - 1)
        state.activePageIndex = state.pageList.length - 1;
    });
  });
  focus();
};
