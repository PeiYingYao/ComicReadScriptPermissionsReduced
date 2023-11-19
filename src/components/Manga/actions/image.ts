import { debounce } from 'throttle-debounce';
import { createEffect, createMemo, createRoot, on } from 'solid-js';

import { clamp } from 'helper';
import { findFillIndex, handleComicData } from '../handleComicData';
import type { State } from '../store';
import { store, setState, refs } from '../store';
import { contentHeight, updateDrag } from './scrollbar';
import { setOption } from './helper';

export const { activeImgIndex, nowFillIndex, activePage, preloadNum } =
  createRoot(() => {
    const activePageMemo = createMemo(
      () => store.pageList[store.activePageIndex] ?? [],
    );

    const activeImgIndexMemo = createMemo(
      () => activePageMemo().find((i) => i !== -1) ?? 0,
    );

    const nowFillIndexMemo = createMemo(() =>
      findFillIndex(activeImgIndexMemo(), store.fillEffect),
    );

    const preloadNumMemo = createMemo(() => ({
      back: store.option.preloadPageNum,
      front: Math.floor(store.option.preloadPageNum / 2),
    }));

    return {
      /** 当前显示的第一张图片的 index */
      activeImgIndex: activeImgIndexMemo,
      /** 当前所处的图片流 */
      nowFillIndex: nowFillIndexMemo,
      /** 当前显示页面 */
      activePage: activePageMemo,
      /** 预加载页数 */
      preloadNum: preloadNumMemo,
    };
  });

type LoadImgDraft = { editNum: number; loadNum: number };
const loadImg = (state: State, index: number, draft: LoadImgDraft) => {
  if (index === -1) return false;
  const img = state.imgList[index];
  if (!img?.src) return false;
  if (img.loadType === 'wait') {
    img.loadType = 'loading';
    draft.editNum += 1;
  }
  return draft.editNum >= draft.loadNum;
};
const loadPage = (state: State, index: number, draft: LoadImgDraft) =>
  state.pageList[index]?.some((i) => loadImg(state, i, draft));

/**
 * 以当前显示页为基准，预加载附近指定页数的图片，并取消其他预加载的图片
 * @param state state
 * @param loadPageNum 加载页数
 * @param loadNum 加载图片的数量
 * @returns 返回是否成功加载了未加载图片
 */
const loadPageImg = (state: State, loadPageNum = Infinity, loadNum = 2) => {
  const draft: LoadImgDraft = { editNum: 0, loadNum };
  const targetPage = state.activePageIndex + loadPageNum;

  if (targetPage < state.activePageIndex) {
    const end = Math.max(0, targetPage);
    for (let i = state.activePageIndex; i >= end; i--)
      if (loadPage(state, i, draft)) break;
  } else {
    const end = Math.min(state.pageList.length, targetPage);
    for (let i = state.activePageIndex; i < end; i++)
      if (loadPage(state, i, draft)) break;
  }

  return draft.editNum > 0;
};

export const zoomScrollModeImg = (zoomLevel: number, set = false) => {
  setOption((draftOption) => {
    const newVal = set
      ? zoomLevel
      : // 放大到整数再运算，避免精度丢失导致的奇怪的值
        (store.option.scrollModeImgScale * 100 + zoomLevel * 100) / 100;

    draftOption.scrollModeImgScale = clamp(0.1, newVal, 3);
  });
  // 在调整图片缩放后使当前滚动进度保持不变
  refs.mangaFlow.scrollTo({
    top: contentHeight() * store.scrollbar.dragTop,
    behavior: 'instant',
  });
  setState(updateDrag);
};

/** 根据当前页数更新所有图片的加载状态 */
export const updateImgLoadType = debounce(100, (state: State) => {
  // 先将所有加载中的图片状态改为暂停
  state.imgList.forEach((img, i) => {
    if (img.loadType === 'loading') state.imgList[i].loadType = 'wait';
  });

  return (
    // 优先加载当前显示页
    loadPageImg(state, 1) ||
    // 再加载后面几页
    loadPageImg(state, preloadNum().back) ||
    // 再加载前面几页
    loadPageImg(state, -preloadNum().front) ||
    // 根据设置决定是否要继续加载其余图片
    (!state.option.alwaysLoadAllImg && state.imgList.length > 60) ||
    // 加载当前页后面的图片
    loadPageImg(state, Infinity, 5) ||
    // 加载当前页前面的图片
    loadPageImg(state, -Infinity, 5)
  );
});

/** 重新计算 PageData */
export const updatePageData = (state: State) => {
  const lastActiveImgIndex = activeImgIndex();
  const {
    imgList,
    fillEffect,
    option: { onePageMode, scrollMode },
    isMobile,
  } = state;

  if (onePageMode || scrollMode || isMobile || imgList.length <= 1)
    state.pageList = imgList.map((_, i) => [i]);
  else state.pageList = handleComicData(imgList, fillEffect);
  updateDrag(state);
  updateImgLoadType(state);

  // 在图片排列改变后自动跳转回原先显示图片所在的页数
  if (lastActiveImgIndex !== activeImgIndex())
    state.activePageIndex = state.pageList.findIndex((page) =>
      page.includes(lastActiveImgIndex),
    );
};
updatePageData.debounce = debounce(100, () => setState(updatePageData));

/** 更新渲染页面相关变量 */
export const updateRenderPage = (state: State, animation = false) => {
  state.memo.renderPageList = state.pageList.slice(
    Math.max(0, state.activePageIndex - 1),
    Math.min(state.pageList.length, state.activePageIndex + 2),
  );

  const i = state.memo.renderPageList.indexOf(
    state.pageList[state.activePageIndex],
  );

  state.page.offset.x.pct = 0;
  state.page.offset.y.pct = 0;
  if (store.page.vertical) state.page.offset.y.pct = i === -1 ? 0 : -i * 100;
  else state.page.offset.x.pct = i === -1 ? 0 : i * 100;

  state.page.anima = animation ? 'page' : '';
};

createRoot(() => {
  // 页数发生变动时
  createEffect(
    on(
      () => store.activePageIndex,
      () => {
        setState((state) => {
          updateImgLoadType(state);
          if (state.show.endPage) state.show.endPage = undefined;
        });
      },
      { defer: true },
    ),
  );

  createEffect(
    on(activePage, (page) => {
      // 如果当前显示页面有出错的图片，就重新加载一次
      page?.forEach((i) => {
        if (store.imgList[i]?.loadType !== 'error') return;
        setState((state) => {
          state.imgList[i].loadType = 'wait';
        });
      });

      if (store.option.scrollMode) return;
      // 在翻页时重新计算要渲染的页面
      if (!store.isDragMode) setState(updateRenderPage);
    }),
  );
});