import { createEffect, createMemo, createRoot, on } from 'solid-js';
import { getImgSize, plimit, singleThreaded } from 'helper';
import type { State } from '../store';
import { refs, setState, store } from '../store';
import { updateDrag } from './scrollbar';
import { isWideImg } from '../handleComicData';
import { resetImgState, updatePageData } from './image';
import { checkImgTypeCount } from './helper';

/** 根据比例更新图片类型。返回是否修改了图片类型 */
const updateImgType = (state: State, draftImg: ComicImg) => {
  const { width, height, type } = draftImg;
  if (!width || !height || !state.memo.size.width || !state.memo.size.height)
    return false;

  const imgRatio = width / height;
  if (imgRatio <= state.proportion.单页比例) {
    draftImg.type = imgRatio < state.proportion.条漫比例 ? 'vertical' : '';
  } else {
    draftImg.type = imgRatio > state.proportion.横幅比例 ? 'long' : 'wide';
  }

  return type !== draftImg.type;
};

/** 更新图片尺寸 */
export const updateImgSize = (i: number, width: number, height: number) => {
  setState((state) => {
    const img = state.imgList[i];
    if (!img) return;
    img.width = width;
    img.height = height;
    let isEdited = updateImgType(state, img);

    switch (img.type) {
      // 连续出现多张跨页图后，将剩余未加载图片类型设为跨页图
      case 'long':
      case 'wide': {
        if (state.flag.autoWide || !checkImgTypeCount(state, isWideImg)) break;
        state.imgList.forEach((comicImg, index) => {
          if (comicImg.loadType === 'wait' && comicImg.type === '')
            state.imgList[index].type = 'wide';
        });
        state.flag.autoWide = true;
        isEdited = true;
        break;
      }

      // 连续出现多张长图后，自动开启卷轴模式
      case 'vertical': {
        if (
          !state.flag.autoScrollMode ||
          !checkImgTypeCount(state, ({ type }) => type === 'vertical')
        )
          break;
        state.option.scrollMode = true;
        state.flag.autoScrollMode = false;
        isEdited = true;
        break;
      }
    }

    if (!isEdited) return updateDrag(state);

    Reflect.deleteProperty(state.fillEffect, i);
    updatePageData(state);
  });
};

export const { placeholderSize } = createRoot(() => {
  // 预加载所有图片的尺寸
  createEffect(
    on(
      () => store.imgList,
      singleThreaded((state) =>
        plimit(
          store.imgList.map((img, i) => async () => {
            if (state.continueRun) return;
            if (img.loadType !== 'wait' || img.width || img.height || !img.src)
              return;

            const size = await getImgSize(img.src, () => state.continueRun);
            if (state.continueRun) return;
            if (size) updateImgSize(i, ...size);
          }),
          undefined,
          Math.max(store.option.preloadPageNum, 1),
        ),
      ),
    ),
  );

  // 处理显示窗口的长宽变化
  createEffect(
    on(
      () => store.memo.size,
      ({ width, height }) =>
        setState((state) => {
          state.proportion.单页比例 = Math.min(width / 2 / height, 1);
          state.proportion.横幅比例 = width / height;
          state.proportion.条漫比例 = state.proportion.单页比例 / 2;

          let isEdited = false;
          for (let i = 0; i < state.imgList.length; i++) {
            if (!updateImgType(state, state.imgList[i])) continue;
            isEdited = true;
            Reflect.deleteProperty(state.fillEffect, i);
          }
          if (isEdited) resetImgState(state);
          updatePageData(state);
        }),
      { defer: true },
    ),
  );

  /** 获取图片列表中指定属性的中位数 */
  const getImgMedian = (
    sizeFn: (value: ComicImg) => number,
    fallback: number,
  ) => {
    if (!store.option.scrollMode) return 0;
    const list = store.imgList
      .filter((img) => img.loadType === 'loaded' && img.width)
      .map(sizeFn)
      .sort();
    if (!list.length) return fallback;
    return list[Math.floor(list.length / 2)];
  };

  const placeholderSizeMemo = createMemo(() => ({
    width: getImgMedian((img) => img.width!, refs.root?.offsetWidth),
    height: getImgMedian((img) => img.height!, refs.root?.offsetHeight),
  }));

  return {
    /** 图片占位尺寸 */
    placeholderSize: placeholderSizeMemo,
  };
});
