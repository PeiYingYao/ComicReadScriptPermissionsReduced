import Color from 'color';

// TODO: Color 这个依赖可能可以删掉？

declare global {
  interface StateStyles {
    color: string;
    backgroundColor: string;
  }

  interface CssVar {
    /** 背景色 */
    backgroundColor: string;

    /** 侧边栏按钮的颜色 */
    buttonColor: string;
    /** 侧边栏按钮的背景颜色 */
    buttonBgColor: string;
    /** 侧边栏按钮的悬停背景颜色 */
    buttonHoverBgColor: string;

    /** 启用状态的侧边栏按钮的颜色 */
    enableButtonColor: string;
    /** 启用状态的侧边栏按钮的背景颜色 */
    enableButtonBgColor: string;
    /** 启用状态的侧边栏按钮的悬停背景颜色 */
    enableButtonHoverBgColor: string;
  }
}

export interface StylesSlice {
  styles: {
    normal: StateStyles;
    invert: StateStyles;
  };

  /** 全局 css 变量 */
  cssVar: CssVar;

  /** 是否强制显示侧边栏 */
  showToolbar: boolean;
  /** 是否强制显示滚动条 */
  showScrollbar: boolean;

  [key: string]: unknown;
}

/** 深色模式的 css 变量 */
const dark: CssVar = {
  backgroundColor: '#121212',

  buttonColor: '#fff',
  buttonBgColor: '#121212',
  buttonHoverBgColor: '#fff5',

  enableButtonColor: '#121212',
  enableButtonBgColor: '#fff',
  enableButtonHoverBgColor: '#fffd',
};

/** 浅色模式的 css 变量 */
const light: CssVar = {
  backgroundColor: '#fff',

  buttonColor: '#121212',
  buttonBgColor: '#fff',
  buttonHoverBgColor: '#121212b',

  enableButtonColor: '#fff',
  enableButtonBgColor: '#121212',
  enableButtonHoverBgColor: '#fffb',
};

export const stylesSlice: SelfStateCreator<StylesSlice> = (set, get) => {
  // TODO: 改为使用 css 变量进行控制
  const white: StateStyles = {
    color: '#FFFFFF',
    backgroundColor: '#000000',
  };
  const black: StateStyles = {
    color: '#000000',
    backgroundColor: '#FFFFFF',
  };
  const custom = (): StateStyles => {
    const bgcolor = get().option.customBackground!;
    return {
      color: Color(bgcolor).isDark() ? white.color : black.color,
      backgroundColor: bgcolor,
    };
  };

  return {
    styles: {
      get normal() {
        const { customBackground, darkMode } = get().option;
        if (customBackground) return custom();
        return darkMode ? white : black;
      },
      get invert() {
        const { customBackground, darkMode } = get().option;
        if (customBackground) return custom();
        return darkMode ? black : white;
      },
    },
    cssVar: dark,

    showToolbar: false,
    showScrollbar: false,
  };
};
