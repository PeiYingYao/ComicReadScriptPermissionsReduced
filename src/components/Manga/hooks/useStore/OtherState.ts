import type { ToolbarButtonList } from '../../defaultButtonList';
import type { SettingList } from '../../defaultSettingList';

export const OtherState = {
  /** 是否强制显示侧边栏 */
  showToolbar: false,
  /** 是否强制显示滚动条 */
  showScrollbar: false,
  /** 是否显示结束页 */
  showEndPage: false,
  /** 结束页状态。showEndPage 更改时自动计算 */
  endPageType: undefined as undefined | 'start' | 'end',

  /** 点击结束页按钮时触发的回调 */
  onExit: undefined as ((isEnd?: boolean) => void) | undefined | null,
  /** 点击上一话按钮时触发的回调 */
  onPrev: undefined as (() => void) | undefined,
  /** 点击下一话按钮时触发的回调 */
  onNext: undefined as (() => void) | undefined,
  /** 图片加载状态发生变化时触发的回调 */
  onLoading: undefined as
    | ((img: ComicImg, imgList: ComicImg[]) => void | Promise<void>)
    | undefined,

  editButtonList: (list: ToolbarButtonList) => list,
  editSettingList: (list: SettingList) => list,
};
