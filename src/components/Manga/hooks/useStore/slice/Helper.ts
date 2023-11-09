import { difference, byPath } from 'helper';
import type { State } from '..';
import { _setState, setState, store } from '..';
import { defaultOption, type Option } from '../OptionState';

/** 触发 onOptionChange */
export const triggerOnOptionChange = () =>
  setTimeout(
    () => store.prop.OptionChange?.(difference(store.option, defaultOption)),
  );

/** 在 option 后手动触发 onOptionChange */
export const setOption = (fn: (option: Option, state: State) => void) => {
  setState((state) => fn(state.option, state));

  triggerOnOptionChange();
};

/** 创建一个专门用于修改指定配置项的函数 */
export const createStateSetFn =
  <T = unknown>(name: string) =>
  (val: T) =>
    setOption((draftOption) => byPath(draftOption, name, () => val));

/** 创建用于将 ref 绑定到对应 state 上的工具函数 */
export const bindRef =
  <T extends HTMLElement = HTMLElement>(name: keyof State['ref']) =>
  (e: T) =>
    _setState('ref', name, e);

/** 将界面恢复到正常状态 */
export const resetUI = (state: State) => {
  state.show.toolbar = false;
  state.show.scrollbar = false;
  state.show.touchArea = false;
};
