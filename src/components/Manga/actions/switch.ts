import { createRootMemo } from 'helper/solidJs';

import { refs, setState, store } from '../store';

import { zoom } from './zoom';
import { scrollTo, setOption } from './helper';
import { updatePageData } from './image';
import { setImgTranslationEnbale } from './translation';
import {
  activeImgIndex,
  contentHeight,
  imgTopList,
  nowFillIndex,
  scrollTop,
  activePage,
} from './memo';

/** 切换页面填充 */
export const switchFillEffect = () => {
  setState((state) => {
    // 如果当前页不是双页显示的就跳过，避免在显示跨页图的页面切换却没看到效果的疑惑
    if (state.pageList[state.activePageIndex].length !== 2) return;

    state.fillEffect[nowFillIndex()] = Number(
      !state.fillEffect[nowFillIndex()],
    );
    updatePageData(state);
  });
};

/** 切换卷轴模式 */
export const switchScrollMode = () => {
  zoom(100);
  setOption((draftOption, state) => {
    draftOption.scrollMode = !draftOption.scrollMode;
    draftOption.onePageMode = draftOption.scrollMode;
    updatePageData(state);
  });
  // 切换到卷轴模式后自动定位到对应页
  if (store.option.scrollMode) scrollTo(imgTopList()[store.activePageIndex]);
};

/** 切换单双页模式 */
export const switchOnePageMode = () => {
  setOption((draftOption, state) => {
    draftOption.onePageMode = !draftOption.onePageMode;
    updatePageData(state);
  });
};

/** 切换阅读方向 */
export const switchDir = () => {
  setOption((draftOption) => {
    draftOption.dir = draftOption.dir === 'rtl' ? 'ltr' : 'rtl';
  });
};

/** 切换网格模式 */
export const switchGridMode = () => {
  zoom(100);
  setState((state) => {
    state.gridMode = !state.gridMode;
    if (state.zoom.scale !== 100) zoom(100);
    state.page.anima = '';
  });
  // 切换到网格模式后自动定位到当前页
  if (store.gridMode)
    requestAnimationFrame(() => {
      refs.mangaFlow.children[activeImgIndex()]?.scrollIntoView({
        block: 'center',
        inline: 'center',
      });
    });
};

/** 切换卷轴模式下图片适应宽度 */
export const switchFitToWidth = () => {
  const top = scrollTop();
  const height = contentHeight();

  setOption((draftOption) => {
    draftOption.scrollModeFitToWidth = !draftOption.scrollModeFitToWidth;
  });

  // 滚回之前的位置
  scrollTo((top / height) * contentHeight());
};

/** 当前显示的图片是否正在翻译 */
export const isTranslatingImage = createRootMemo(() =>
  activePage().some(
    (i) =>
      store.imgList[i]?.translationType &&
      store.imgList[i].translationType !== 'hide',
  ),
);

/** 切换当前页的翻译状态 */
export const switchTranslation = () =>
  setImgTranslationEnbale(activePage(), !isTranslatingImage());
