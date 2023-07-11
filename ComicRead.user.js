// ==UserScript==
// @name         ComicRead
// @namespace    ComicRead
// @version      6.4.0
// @description  为主流漫画站增加双页阅读模式并优化使用体验。百合会——「记录阅读历史，体验优化」、百合会新站、动漫之家——「解锁隐藏漫画」、ehentai——「匹配 nhentai 漫画」、nhentai——「彻底屏蔽漫画，自动翻页」、明日方舟泰拉记事社、禁漫天堂、拷贝漫画(copymanga)、漫画柜(manhuagui)、漫画DB(manhuadb)、漫画猫(manhuacat)、动漫屋(dm5)、绅士漫画(wnacg)、mangabz、welovemanga
// @author       hymbz
// @license      AGPL-3.0-or-later
// @noframes
// @match        *://*/*
// @connect      cdn.jsdelivr.net
// @connect      yamibo.com
// @connect      dmzj.com
// @connect      idmzj.com
// @connect      exhentai.org
// @connect      e-hentai.org
// @connect      hath.network
// @connect      nhentai.net
// @connect      hypergryph.com
// @connect      mangabz.com
// @connect      copymanga.site
// @connect      self
// @connect      *
// @grant        GM_addElement
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @grant        GM.addValueChangeListener
// @grant        GM.removeValueChangeListener
// @grant        GM.getResourceText
// @grant        GM.addStyle
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.registerMenuCommand
// @grant        GM.unregisterMenuCommand
// @grant        unsafeWindow
// @resource     solid-js https://unpkg.com/solid-js@1.7.3/dist/solid.cjs
// @resource     solid-js/store https://unpkg.com/solid-js@1.7.3/store/dist/store.cjs
// @resource     solid-js/web https://unpkg.com/solid-js@1.7.3/web/dist/web.cjs
// @resource     panzoom https://unpkg.com/panzoom@9.4.3/dist/panzoom.min.js
// @resource     fflate https://unpkg.com/fflate@0.7.4/umd/index.js
// @resource     dmzjDecrypt https://greasyfork.org/scripts/467177-dmzjdecrypt/code/dmzjDecrypt.js?version=1207199
// @supportURL   https://github.com/hymbz/ComicReadScript/issues
// @updateURL    https://github.com/hymbz/ComicReadScript/raw/master/ComicRead.user.js
// @downloadURL  https://github.com/hymbz/ComicReadScript/raw/master/ComicRead.user.js
// ==/UserScript==

/**
 * 虽然在打包的时候已经尽可能保持代码格式不变了，但因为脚本代码比较多的缘故
 * 所以真对脚本代码感兴趣的话，推荐还是直接上 github 仓库来看
 * <https://github.com/hymbz/ComicReadScript>
 * 对站点逻辑感兴趣的，结合 `src\index.ts` 看 `src\site` 下的对应文件即可
 */

const gmApi = {
  GM,
  GM_addElement,
  GM_getResourceText,
  GM_xmlhttpRequest,
  unsafeWindow
};
const gmApiList = Object.keys(gmApi);
unsafeWindow.crsLib = {
  // 有些 cjs 模块会检查这个，所以在这里声明下
  process: {
    env: {
      NODE_ENV: 'production'
    }
  },
  ...gmApi
};

/**
 * 通过 Resource 导入外部模块
 * @param name \@resource 引用的资源名
 */
const selfImportSync = name => {
  const code = name !== 'main' ? GM_getResourceText(name) :`
const web = require('solid-js/web');
const solidJs = require('solid-js');
const store$2 = require('solid-js/store');
const fflate = require('fflate');
const createPanZoom = require('panzoom');

const sleep = ms => new Promise(resolve => {
  window.setTimeout(resolve, ms);
});

/**
 * 对 document.querySelector 的封装
 * 将默认返回类型改为 HTMLElement
 */
const querySelector = selector => document.querySelector(selector);

/**
 * 对 document.querySelector 的封装
 * 将默认返回类型改为 HTMLElement
 */
const querySelectorAll = selector => [...document.querySelectorAll(selector)];

/**
 * 添加元素
 * @param node 被添加元素
 * @param textnode 添加元素
 * @param referenceNode 参考元素，添加元素将插在参考元素前
 */
const insertNode = (node, textnode, referenceNode = null) => {
  const temp = document.createElement('div');
  temp.innerHTML = textnode;
  const frag = document.createDocumentFragment();
  while (temp.firstChild) frag.appendChild(temp.firstChild);
  node.insertBefore(frag, referenceNode);
};

/** 返回 Dom 的点击函数 */
const querySelectorClick = selector => {
  const dom = typeof selector === 'string' ? querySelector(selector) : selector();
  if (dom) return () => dom.click();
};

/** 判断两个列表中包含的值是否相同 */
const isEqualArray = (a, b) => a.length === b.length && !a.some(t => !b.includes(t));

/** 将对象转为 URLParams 类型的字符串 */
const dataToParams = data => Object.entries(data).map(([key, val]) => \`\${key}=\${val}\`).join('&');

/** 将 blob 数据作为文件保存至本地 */
const saveAs = (blob, name = 'download') => {
  const a = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
  a.download = name;
  a.rel = 'noopener';
  a.href = URL.createObjectURL(blob);
  setTimeout(() => a.dispatchEvent(new MouseEvent('click')));
};

/** 监听键盘事件 */
const linstenKeyup = handler => window.addEventListener('keyup', e => {
  // 跳过输入框的键盘事件
  switch (e.target.tagName) {
    case 'INPUT':
    case 'TEXTAREA':
      return;
  }
  handler(e);
});

/** 滚动页面到指定元素的所在位置 */
const scrollIntoView = selector => querySelector(selector)?.scrollIntoView();

/**
 * 限制 Promise 并发
 * @param fnList 任务函数列表
 * @param callBack 成功执行一个 Promise 后调用，主要用于显示进度
 * @param limit 限制数
 * @returns 所有 Promise 的返回值
 */
const plimit = async (fnList, callBack = undefined, limit = 10) => {
  let doneNum = 0;
  const totalNum = fnList.length;
  const resList = [];
  const execPool = new Set();
  const taskList = fnList.map((fn, i) => {
    let p;
    return () => {
      p = (async () => {
        resList[i] = await fn();
        doneNum += 1;
        execPool.delete(p);
        callBack?.(doneNum, totalNum, resList);
      })();
      execPool.add(p);
    };
  });
  while (doneNum !== totalNum) {
    while (taskList.length && execPool.size < limit) {
      taskList.shift()();
    }
    // eslint-disable-next-line no-await-in-loop
    await Promise.race(execPool);
  }
  return resList;
};

/**
 * 判断使用参数颜色作为默认值时是否需要切换为黑暗模式
 * @param hexColor 十六进制颜色。例如 #112233
 */
const needDarkMode = hexColor => {
  // by: https://24ways.org/2010/calculating-color-contrast
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
};

/** 等到传入的函数返回 true */
const wait = fn => new Promise(resolve => {
  const id = window.setInterval(() => {
    const res = fn();
    if (!res) return;
    window.clearInterval(id);
    resolve(res);
  }, 100);
});

/** 等到指定的 dom 出现 */
const waitDom = selector => wait(() => querySelector(selector));

/** 等待指定的图片元素加载完成 */
const waitImgLoad = (img, timeout = 1000 * 10) => new Promise(resolve => {
  const id = window.setTimeout(() => resolve(new ErrorEvent('超时')), timeout);
  img.addEventListener('load', () => {
    resolve(null);
    window.clearTimeout(id);
  });
  img.addEventListener('error', e => {
    resolve(e);
    window.clearTimeout(id);
  });
});

/**
 * 求 a 和 b 的差集，相当于从 a 中删去和 b 相同的属性
 *
 * 不会修改参数对象，返回的是新对象
 */
const difference = (a, b) => {
  const res = {};
  const keys = Object.keys(a);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (typeof a[key] === 'object') {
      const _res = difference(a[key], b[key]);
      if (Object.keys(_res).length) res[key] = _res;
    } else if (a[key] !== b[key]) res[key] = a[key];
  }
  return res;
};

/**
 * 通过监视点击等会触发动态加载的事件，在触发动态加载后更新图片列表等
 * @param update 动态加载后的重新加载
 */
const autoUpdate = update => {
  let running = false;
  const refresh = async () => {
    running = true;
    try {
      await update();
    } finally {
      running = false;
    }
  };
  ['click', 'popstate'].forEach(eventName => {
    window.addEventListener(eventName, () => setTimeout(() => {
      if (running) return;
      refresh();
    }, 100));
  });
  refresh();
};

/** 挂载 solid-js 组件 */
const mountComponents = (id, fc) => {
  const dom = document.createElement('div');
  dom.id = id;
  // TODO:
  // 目前 solidjs 的所有事件都是在 document 上监听的
  // 所以现在没法阻止脚本元素上的事件触发原网页的快捷键
  // 需要等待 solidjs 更新
  // https://github.com/solidjs/solid/issues/1786
  //
  // ['click', 'keydown', 'keypress', 'keyup'].forEach((eventName) =>
  //   dom.addEventListener(eventName, (e: Event) => e?.stopPropagation()),
  // );
  document.body.appendChild(dom);
  const shadowDom = dom.attachShadow({
    mode: 'open'
  });
  web.render(fc, shadowDom);
  return dom;
};

var e=[],t=[];function n(n,r){if(n&&"undefined"!=typeof document){var a,s=!0===r.prepend?"prepend":"append",d=!0===r.singleTag,i="string"==typeof r.container?document.querySelector(r.container):document.getElementsByTagName("head")[0];if(d){var u=e.indexOf(i);-1===u&&(u=e.push(i)-1,t[u]={}),a=t[u]&&t[u][s]?t[u][s]:t[u][s]=c();}else a=c();65279===n.charCodeAt(0)&&(n=n.substring(1)),a.styleSheet?a.styleSheet.cssText+=n:a.appendChild(document.createTextNode(n));}function c(){var e=document.createElement("style");if(e.setAttribute("type","text/css"),r.attributes)for(var t=Object.keys(r.attributes),n=0;n<t.length;n++)e.setAttribute(t[n],r.attributes[t[n]]);var a="prepend"===s?"afterbegin":"beforeend";return i.insertAdjacentElement(a,e),e}}

var css$3 = ".index_module_root__d312191b{align-items:flex-end;bottom:0;display:flex;flex-direction:column;font-size:16px;pointer-events:none;position:fixed;right:0;z-index:9999999999}.index_module_item__d312191b{align-items:center;animation:index_module_bounceInRight__d312191b .5s 1;background:#fff;border-radius:4px;box-shadow:0 1px 10px 0 #0000001a,0 2px 15px 0 #0000000d;color:#000;cursor:pointer;display:flex;margin:1em;max-width:30vw;overflow:hidden;padding:.8em 1em;pointer-events:auto;position:relative;width:-moz-fit-content;width:fit-content}.index_module_item__d312191b>svg{color:var(--theme);margin-right:.5em}.index_module_item__d312191b[data-exit]{animation:index_module_bounceOutRight__d312191b .5s 1}.index_module_schedule__d312191b{background-color:var(--theme);bottom:0;height:.2em;left:0;position:absolute;transform-origin:left;width:100%}.index_module_item__d312191b[data-schedule] .index_module_schedule__d312191b{transition:transform .1s}.index_module_item__d312191b:not([data-schedule]) .index_module_schedule__d312191b{animation:index_module_schedule__d312191b linear 1 forwards}:is(.index_module_item__d312191b:hover,.index_module_item__d312191b[data-schedule],.index_module_root__d312191b[data-paused]) .index_module_schedule__d312191b{animation-play-state:paused}.index_module_msg__d312191b{text-align:start;width:-moz-fit-content;width:fit-content}.index_module_msg__d312191b h2,.index_module_msg__d312191b h3{margin:.3em 0 .7em}.index_module_msg__d312191b ul{margin:0;text-align:left}@keyframes index_module_schedule__d312191b{0%{transform:scaleX(1)}to{transform:scaleX(0)}}@keyframes index_module_bounceInRight__d312191b{0%,60%,75%,90%,to{animation-timing-function:cubic-bezier(.215,.61,.355,1)}0%{opacity:0;transform:translate3d(3000px,0,0) scaleX(3)}60%{opacity:1;transform:translate3d(-25px,0,0) scaleX(1)}75%{transform:translate3d(10px,0,0) scaleX(.98)}90%{transform:translate3d(-5px,0,0) scaleX(.995)}to{transform:translateZ(0)}}@keyframes index_module_bounceOutRight__d312191b{20%{opacity:1;transform:translate3d(-20px,0,0) scaleX(.9)}to{opacity:0;transform:translate3d(2000px,0,0) scaleX(2)}}";
var modules_c21c94f2$3 = {"root":"index_module_root__d312191b","item":"index_module_item__d312191b","bounceInRight":"index_module_bounceInRight__d312191b","bounceOutRight":"index_module_bounceOutRight__d312191b","schedule":"index_module_schedule__d312191b","msg":"index_module_msg__d312191b"};
n(css$3,{});

const [_state$1, _setState] = store$2.createStore({
  list: [],
  map: {}
});
const setState$1 = fn => _setState(store$2.produce(fn));

// eslint-disable-next-line solid/reactivity
const store$1 = _state$1;
const creatId = () => {
  let id = \`\${Date.now()}\`;
  while (Reflect.has(store$1.map, id)) {
    id += '_';
  }
  return id;
};

const _tmpl$$H = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM9.29 16.29 5.7 12.7a.996.996 0 1 1 1.41-1.41L10 14.17l6.88-6.88a.996.996 0 1 1 1.41 1.41l-7.59 7.59a.996.996 0 0 1-1.41 0z">\`);
const MdCheckCircle = ((props = {}) => (() => {
  const _el$ = _tmpl$$H();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$G = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M4.47 21h15.06c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0L2.74 18c-.77 1.33.19 3 1.73 3zM12 14c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1zm1 4h-2v-2h2v2z">\`);
const MdWarning = ((props = {}) => (() => {
  const _el$ = _tmpl$$G();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$F = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 11c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1 4h-2v-2h2v2z">\`);
const MdError = ((props = {}) => (() => {
  const _el$ = _tmpl$$F();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$E = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z">\`);
const MdInfo = ((props = {}) => (() => {
  const _el$ = _tmpl$$E();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const toast$1 = (msg, options) => {
  if (!msg) return;
  const id = options?.id ?? (typeof msg === 'string' ? msg : creatId());
  setState$1(state => {
    if (Reflect.has(state.map, id)) {
      Object.assign(state.map[id], {
        msg,
        ...options,
        update: true
      });
      return;
    }
    state.map[id] = {
      id,
      type: 'info',
      duration: 3000,
      msg,
      ...options
    };
    state.list.push(id);
  });
};
toast$1.dismiss = id => {
  if (!Reflect.has(store$1.map, id)) return;
  setState$1(state => {
    state.map[id].exit = true;
  });
};
toast$1.set = (id, options) => {
  if (!Reflect.has(store$1.map, id)) return;
  setState$1(state => {
    Object.assign(state.map[id], options);
  });
};
toast$1.success = (msg, options) => toast$1(msg, {
  ...options,
  type: 'success'
});
toast$1.warn = (msg, options) => toast$1(msg, {
  ...options,
  type: 'warn'
});
toast$1.error = (msg, options) => toast$1(msg, {
  ...options,
  type: 'error'
});

const _tmpl$$D = /*#__PURE__*/web.template(\`<div>\`),
  _tmpl$2$8 = /*#__PURE__*/web.template(\`<div><div>\`);
const iconMap = {
  info: MdInfo,
  success: MdCheckCircle,
  warn: MdWarning,
  error: MdError
};
const colorMap = {
  info: '#3a97d7',
  success: '#23bb35',
  warn: '#f0c53e',
  error: '#e45042',
  custom: '#1f2936'
};

/** 删除 toast */
const dismissToast = id => setState$1(state => {
  state.map[id].onDismiss?.({
    ...state.map[id]
  });
  const i = state.list.findIndex(t => t === id);
  if (i !== -1) state.list.splice(i, 1);
  Reflect.deleteProperty(state.map, id);
});

/** 重置 toast 的 update 属性 */
const resetToastUpdate = id => setState$1(state => {
  Reflect.deleteProperty(state.map[id], 'update');
});
const ToastItem = props => {
  /** 是否要显示进度 */
  const showSchedule = solidJs.createMemo(() => props.duration === Infinity && props.schedule ? true : undefined);
  const dismiss = e => {
    e.stopPropagation();
    if (showSchedule() && 'animationName' in e) return;
    toast$1.dismiss(props.id);
  };

  // 在退出动画结束后才真的删除
  const handleAnimationEnd = () => {
    if (!props.exit) return;
    dismissToast(props.id);
  };
  let scheduleRef;
  solidJs.createEffect(() => {
    if (!props.update) return;
    resetToastUpdate(props.id);
    scheduleRef?.getAnimations().forEach(animation => {
      animation.cancel();
      animation.play();
    });
  });
  return (() => {
    const _el$ = _tmpl$2$8(),
      _el$2 = _el$.firstChild;
    _el$.addEventListener("animationend", handleAnimationEnd);
    _el$.$$click = dismiss;
    web.insert(_el$, web.createComponent(web.Dynamic, {
      get component() {
        return iconMap[props.type];
      }
    }), _el$2);
    web.insert(_el$2, (() => {
      const _c$ = web.memo(() => typeof props.msg === 'string');
      return () => _c$() ? props.msg : web.createComponent(props.msg, {});
    })());
    web.insert(_el$, web.createComponent(solidJs.Show, {
      get when() {
        return props.duration !== Infinity || props.schedule !== undefined;
      },
      get children() {
        const _el$3 = _tmpl$$D();
        _el$3.addEventListener("animationend", dismiss);
        const _ref$ = scheduleRef;
        typeof _ref$ === "function" ? web.use(_ref$, _el$3) : scheduleRef = _el$3;
        web.effect(_p$ => {
          const _v$ = modules_c21c94f2$3.schedule,
            _v$2 = \`\${props.duration}ms\`,
            _v$3 = showSchedule() ? \`scaleX(\${props.schedule})\` : undefined;
          _v$ !== _p$._v$ && web.className(_el$3, _p$._v$ = _v$);
          _v$2 !== _p$._v$2 && ((_p$._v$2 = _v$2) != null ? _el$3.style.setProperty("animation-duration", _v$2) : _el$3.style.removeProperty("animation-duration"));
          _v$3 !== _p$._v$3 && ((_p$._v$3 = _v$3) != null ? _el$3.style.setProperty("transform", _v$3) : _el$3.style.removeProperty("transform"));
          return _p$;
        }, {
          _v$: undefined,
          _v$2: undefined,
          _v$3: undefined
        });
        return _el$3;
      }
    }), null);
    web.effect(_p$ => {
      const _v$4 = modules_c21c94f2$3.item,
        _v$5 = colorMap[props.type],
        _v$6 = showSchedule(),
        _v$7 = props.exit,
        _v$8 = modules_c21c94f2$3.msg;
      _v$4 !== _p$._v$4 && web.className(_el$, _p$._v$4 = _v$4);
      _v$5 !== _p$._v$5 && ((_p$._v$5 = _v$5) != null ? _el$.style.setProperty("--theme", _v$5) : _el$.style.removeProperty("--theme"));
      _v$6 !== _p$._v$6 && web.setAttribute(_el$, "data-schedule", _p$._v$6 = _v$6);
      _v$7 !== _p$._v$7 && web.setAttribute(_el$, "data-exit", _p$._v$7 = _v$7);
      _v$8 !== _p$._v$8 && web.className(_el$2, _p$._v$8 = _v$8);
      return _p$;
    }, {
      _v$4: undefined,
      _v$5: undefined,
      _v$6: undefined,
      _v$7: undefined,
      _v$8: undefined
    });
    return _el$;
  })();
};
web.delegateEvents(["click"]);

const _tmpl$$C = /*#__PURE__*/web.template(\`<div>\`);
const Toaster = () => {
  const [visible, setVisible] = solidJs.createSignal(document.visibilityState === 'visible');
  solidJs.onMount(() => {
    const handleVisibilityChange = () => {
      setVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    solidJs.onCleanup(() => document.removeEventListener('visibilitychange', handleVisibilityChange));
  });
  return (() => {
    const _el$ = _tmpl$$C();
    web.insert(_el$, web.createComponent(solidJs.For, {
      get each() {
        return store$1.list;
      },
      children: id => web.createComponent(ToastItem, web.mergeProps(() => store$1.map[id]))
    }));
    web.effect(_p$ => {
      const _v$ = modules_c21c94f2$3.root,
        _v$2 = visible() ? undefined : '';
      _v$ !== _p$._v$ && web.className(_el$, _p$._v$ = _v$);
      _v$2 !== _p$._v$2 && web.setAttribute(_el$, "data-paused", _p$._v$2 = _v$2);
      return _p$;
    }, {
      _v$: undefined,
      _v$2: undefined
    });
    return _el$;
  })();
};

const ToastStyle = css$3;

const _tmpl$$B = /*#__PURE__*/web.template(\`<style type="text/css">\`);
let dom$1;
const init = () => {
  if (!dom$1) dom$1 = mountComponents('toast', () => [web.createComponent(Toaster, {}), (() => {
    const _el$ = _tmpl$$B();
    web.insert(_el$, ToastStyle);
    return _el$;
  })()]);
};
const toast = new Proxy(toast$1, {
  get(target, propKey) {
    init();
    return target[propKey];
  },
  apply(target, propKey, args) {
    init();
    const fn = propKey ? target[propKey] : target;
    return fn(...args);
  }
});

// 将 xmlHttpRequest 包装为 Promise
const xmlHttpRequest = details => new Promise((resolve, reject) => {
  GM_xmlhttpRequest({
    ...details,
    onload: resolve,
    onerror: reject,
    ontimeout: reject
  });
});

/** 发起请求 */
const request = async (url, details, errorNum = 0) => {
  const errorText = details?.errorText ?? '漫画加载出错';
  try {
    const res = await xmlHttpRequest({
      method: 'GET',
      url,
      headers: {
        Referer: window.location.href
      },
      ...details
    });
    if (res.status !== 200) throw new Error(errorText);
    return res;
  } catch (error) {
    if (errorNum >= 3) {
      if (errorText && !details?.noTip) toast.error(errorText);
      throw new Error(errorText);
    }
    console.error(errorText, error);
    await sleep(1000);
    return request(url, details, errorNum + 1);
  }
};

const _tmpl$$A = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="m20.45 6 .49-1.06L22 4.45a.5.5 0 0 0 0-.91l-1.06-.49L20.45 2a.5.5 0 0 0-.91 0l-.49 1.06-1.05.49a.5.5 0 0 0 0 .91l1.06.49.49 1.05c.17.39.73.39.9 0zM8.95 6l.49-1.06 1.06-.49a.5.5 0 0 0 0-.91l-1.06-.48L8.95 2a.492.492 0 0 0-.9 0l-.49 1.06-1.06.49a.5.5 0 0 0 0 .91l1.06.49L8.05 6c.17.39.73.39.9 0zm10.6 7.5-.49 1.06-1.06.49a.5.5 0 0 0 0 .91l1.06.49.49 1.06a.5.5 0 0 0 .91 0l.49-1.06 1.05-.5a.5.5 0 0 0 0-.91l-1.06-.49-.49-1.06c-.17-.38-.73-.38-.9.01zm-1.84-4.38-2.83-2.83a.996.996 0 0 0-1.41 0L2.29 17.46a.996.996 0 0 0 0 1.41l2.83 2.83c.39.39 1.02.39 1.41 0L17.7 10.53c.4-.38.4-1.02.01-1.41zm-3.5 2.09L12.8 9.8l1.38-1.38 1.41 1.41-1.38 1.38z">\`);
const MdAutoFixHigh = ((props = {}) => (() => {
  const _el$ = _tmpl$$A();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$z = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="m22 3.55-1.06-.49L20.45 2a.5.5 0 0 0-.91 0l-.49 1.06-1.05.49a.5.5 0 0 0 0 .91l1.06.49.49 1.05a.5.5 0 0 0 .91 0l.49-1.06L22 4.45c.39-.17.39-.73 0-.9zm-7.83 4.87 1.41 1.41-1.46 1.46 1.41 1.41 2.17-2.17a.996.996 0 0 0 0-1.41l-2.83-2.83a.996.996 0 0 0-1.41 0l-2.17 2.17 1.41 1.41 1.47-1.45zM2.1 4.93l6.36 6.36-6.17 6.17a.996.996 0 0 0 0 1.41l2.83 2.83c.39.39 1.02.39 1.41 0l6.17-6.17 6.36 6.36a.996.996 0 1 0 1.41-1.41L3.51 3.51a.996.996 0 0 0-1.41 0c-.39.4-.39 1.03 0 1.42z">\`);
const MdAutoFixOff = ((props = {}) => (() => {
  const _el$ = _tmpl$$z();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$y = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M7 3v9c0 .55.45 1 1 1h2v7.15c0 .51.67.69.93.25l5.19-8.9a.995.995 0 0 0-.86-1.5H13l2.49-6.65A.994.994 0 0 0 14.56 2H8c-.55 0-1 .45-1 1z">\`);
const MdAutoFlashOn = ((props = {}) => (() => {
  const _el$ = _tmpl$$y();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$x = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M16.12 11.5a.995.995 0 0 0-.86-1.5h-1.87l2.28 2.28.45-.78zm.16-8.05c.33-.67-.15-1.45-.9-1.45H8c-.55 0-1 .45-1 1v.61l6.13 6.13 3.15-6.29zm2.16 14.43L4.12 3.56a.996.996 0 1 0-1.41 1.41L7 9.27V12c0 .55.45 1 1 1h2v7.15c0 .51.67.69.93.25l2.65-4.55 3.44 3.44c.39.39 1.02.39 1.41 0 .4-.39.4-1.02.01-1.41z">\`);
const MdAutoFlashOff = ((props = {}) => (() => {
  const _el$ = _tmpl$$x();
  web.spread(_el$, props, true, true);
  return _el$;
})());

var css$2 = ".index_module_iconButtonItem__9645dd99{align-items:center;display:flex;position:relative}.index_module_iconButton__9645dd99{align-items:center;background-color:initial;border-radius:9999px;border-style:none;color:var(--text,#fff);cursor:pointer;display:flex;font-size:1.5em;height:1.5em;justify-content:center;margin:.1em;outline:none;padding:0;width:1.5em}.index_module_iconButton__9645dd99:focus,.index_module_iconButton__9645dd99:hover{background-color:var(--hover_bg_color,#fff3)}.index_module_iconButton__9645dd99.index_module_enabled__9645dd99{background-color:var(--text,#fff);color:var(--text_bg,#121212)}.index_module_iconButton__9645dd99.index_module_enabled__9645dd99:focus,.index_module_iconButton__9645dd99.index_module_enabled__9645dd99:hover{background-color:var(--hover_bg_color_enable,#fffa)}.index_module_iconButton__9645dd99>svg{width:1em}.index_module_iconButtonPopper__9645dd99{align-items:center;background-color:#303030;border-radius:.3em;color:#fff;display:flex;font-size:.8em;opacity:0;padding:.4em .5em;position:absolute;top:50%;transform:translateY(-50%);user-select:none;white-space:nowrap}.index_module_iconButtonPopper__9645dd99[data-placement=right]{left:calc(100% + 1.5em)}.index_module_iconButtonPopper__9645dd99[data-placement=right]:before{border-right-color:var(--switch_bg,#6e6e6e);border-right-width:.5em;right:calc(100% + .5em)}.index_module_iconButtonPopper__9645dd99[data-placement=left]{right:calc(100% + 1.5em)}.index_module_iconButtonPopper__9645dd99[data-placement=left]:before{border-left-color:var(--switch_bg,#6e6e6e);border-left-width:.5em;left:calc(100% + .5em)}.index_module_iconButtonPopper__9645dd99:before{background-color:initial;border:.4em solid #0000;content:\\"\\";position:absolute;transition:opacity .15s}.index_module_iconButtonItem__9645dd99:focus .index_module_iconButtonPopper__9645dd99,.index_module_iconButtonItem__9645dd99:hover .index_module_iconButtonPopper__9645dd99,.index_module_iconButtonItem__9645dd99[data-show=true] .index_module_iconButtonPopper__9645dd99{opacity:1}.index_module_hidden__9645dd99{display:none}";
var modules_c21c94f2$2 = {"iconButtonItem":"index_module_iconButtonItem__9645dd99","iconButton":"index_module_iconButton__9645dd99","enabled":"index_module_enabled__9645dd99","iconButtonPopper":"index_module_iconButtonPopper__9645dd99","hidden":"index_module_hidden__9645dd99"};
n(css$2,{});

const _tmpl$$w = /*#__PURE__*/web.template(\`<div><button type="button">\`),
  _tmpl$2$7 = /*#__PURE__*/web.template(\`<div>\`);
const IconButtonStyle = css$2;
/**
 * 图标按钮
 */
const IconButton = _props => {
  const props = solidJs.mergeProps({
    placement: 'right'
  }, _props);
  let buttonRef;
  const handleClick = e => {
    // 在每次点击后取消焦点
    buttonRef?.blur();
    props.onClick?.(e);
  };
  return (() => {
    const _el$ = _tmpl$$w(),
      _el$2 = _el$.firstChild;
    _el$2.$$click = handleClick;
    const _ref$ = buttonRef;
    typeof _ref$ === "function" ? web.use(_ref$, _el$2) : buttonRef = _el$2;
    web.insert(_el$2, () => props.children);
    web.insert(_el$, (() => {
      const _c$ = web.memo(() => !!(props.popper || props.tip));
      return () => _c$() ? (() => {
        const _el$3 = _tmpl$2$7();
        web.insert(_el$3, () => props.popper || props.tip);
        web.effect(_p$ => {
          const _v$6 = [modules_c21c94f2$2.iconButtonPopper, props.popperClassName].join(' '),
            _v$7 = props.placement;
          _v$6 !== _p$._v$6 && web.className(_el$3, _p$._v$6 = _v$6);
          _v$7 !== _p$._v$7 && web.setAttribute(_el$3, "data-placement", _p$._v$7 = _v$7);
          return _p$;
        }, {
          _v$6: undefined,
          _v$7: undefined
        });
        return _el$3;
      })() : null;
    })(), null);
    web.effect(_p$ => {
      const _v$ = modules_c21c94f2$2.iconButtonItem,
        _v$2 = props.showTip,
        _v$3 = props.tip,
        _v$4 = modules_c21c94f2$2.iconButton,
        _v$5 = {
          [modules_c21c94f2$2.hidden]: props.hidden,
          [modules_c21c94f2$2.enabled]: props.enabled
        };
      _v$ !== _p$._v$ && web.className(_el$, _p$._v$ = _v$);
      _v$2 !== _p$._v$2 && web.setAttribute(_el$, "data-show", _p$._v$2 = _v$2);
      _v$3 !== _p$._v$3 && web.setAttribute(_el$2, "aria-label", _p$._v$3 = _v$3);
      _v$4 !== _p$._v$4 && web.className(_el$2, _p$._v$4 = _v$4);
      _p$._v$5 = web.classList(_el$2, _v$5, _p$._v$5);
      return _p$;
    }, {
      _v$: undefined,
      _v$2: undefined,
      _v$3: undefined,
      _v$4: undefined,
      _v$5: undefined
    });
    return _el$;
  })();
};
web.delegateEvents(["click"]);

const useSpeedDial = (options, setOptions) => {
  const DefaultButton = props => {
    return web.createComponent(IconButton, {
      get tip() {
        return props.showName ?? props.optionName;
      },
      placement: "left",
      onClick: () => setOptions({
        ...options,
        [props.optionName]: !options[props.optionName]
      }),
      get children() {
        return props.children ?? (options[props.optionName] ? web.createComponent(MdAutoFixHigh, {}) : web.createComponent(MdAutoFixOff, {}));
      }
    });
  };
  const list = Object.keys(options).map(optionName => {
    switch (optionName) {
      case 'hiddenFAB':
      case 'option':
        return null;
      case 'autoShow':
        return () => web.createComponent(DefaultButton, {
          optionName: "autoShow",
          showName: "\\u81EA\\u52A8\\u8FDB\\u5165\\u9605\\u8BFB\\u6A21\\u5F0F",
          get children() {
            return web.memo(() => !!options.autoShow)() ? web.createComponent(MdAutoFlashOn, {}) : web.createComponent(MdAutoFlashOff, {});
          }
        });
      default:
        return () => web.createComponent(DefaultButton, {
          optionName: optionName
        });
    }
  }).filter(Boolean);
  return list;
};

/* eslint-disable no-param-reassign */

const promisifyRequest = request => new Promise((resolve, reject) => {
  // eslint-disable-next-line no-multi-assign
  request.oncomplete = request.onsuccess = () => resolve(request.result);
  // eslint-disable-next-line no-multi-assign
  request.onabort = request.onerror = () => reject(request.error);
});
const useCache = (initSchema, version = 1) => {
  const request = indexedDB.open('ComicReadScript', version);
  request.onupgradeneeded = () => {
    initSchema(request.result);
  };
  const dbp = promisifyRequest(request);
  const useStore = (storeName, txMode, callback) => dbp.then(db => callback(db.transaction(storeName, txMode).objectStore(storeName)));
  return {
    /** 存入数据 */
    set: (storeName, value) => useStore(storeName, 'readwrite', async store => {
      store.put(value);
      await promisifyRequest(store.transaction);
    }),
    /** 根据主键直接获取数据 */
    get: (storeName, query) => useStore(storeName, 'readonly', store => promisifyRequest(store.get(query))),
    /** 查找符合条件的数据 */
    find: (storeName, query, index) => useStore(storeName, 'readonly', store => promisifyRequest((index ? store.index(index) : store).getAll(query))),
    /** 删除符合条件的数据 */
    del: (storeName, query, index) => useStore(storeName, 'readwrite', async store => {
      if (index) {
        store.index(index).openCursor(query).onsuccess = async function onsuccess() {
          if (!this.result) return;
          await promisifyRequest(this.result.delete());
          this.result.continue();
        };
        await promisifyRequest(store.transaction);
      } else {
        store.delete(query);
        await promisifyRequest(store.transaction);
      }
    })

    // each: <K extends keyof Schema & string>(
    //   storeName: K,
    //   query: IDBValidKey | IDBKeyRange | null,
    //   callback: (cursor: IDBCursorWithValue) => void,
    // ) =>
    //   useStore(storeName, 'readonly', (store) => {
    //     store.openCursor(query).onsuccess = function onsuccess() {
    //       if (!this.result) return;
    //       callback(this.result);
    //       this.result.continue();
    //     };
    //     return promisifyRequest(store.transaction);
    //   }),
  };
};

const _tmpl$$v = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M16.59 9H15V4c0-.55-.45-1-1-1h-4c-.55 0-1 .45-1 1v5H7.41c-.89 0-1.34 1.08-.71 1.71l4.59 4.59c.39.39 1.02.39 1.41 0l4.59-4.59c.63-.63.19-1.71-.7-1.71zM5 19c0 .55.45 1 1 1h12c.55 0 1-.45 1-1s-.45-1-1-1H6c-.55 0-1 .45-1 1z">\`);
const MdFileDownload = ((props = {}) => (() => {
  const _el$ = _tmpl$$v();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$u = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59 7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12 5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z">\`);
const MdClose = ((props = {}) => (() => {
  const _el$ = _tmpl$$u();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const useStore = initState => {
  const [_state, _setState] = store$2.createStore(initState);
  return {
    _state,
    _setState,
    setState: fn => _setState(store$2.produce(fn)),
    store: _state
  };
};

/** 加载状态的中文描述 */
const loadTypeMap = {
  error: '加载出错',
  loading: '正在加载',
  wait: '等待加载',
  loaded: ''
};

const imgState = {
  imgList: [],
  pageList: [],
  /** 页面填充数据 */
  fillEffect: {
    '-1': true
  },
  /** 当前页数 */
  activePageIndex: 0,
  /** 比例 */
  proportion: {
    单页比例: 0,
    横幅比例: 0,
    条漫比例: 0
  }
};

const ScrollbarState = {
  /** 滚动条 */
  scrollbar: {
    /** 滚动条提示文本 */
    tipText: '',
    /** 滚动条高度比率 */
    dragHeight: 0,
    /** 滚动条所处高度比率 */
    dragTop: 0
  },
  /**
   * 用于防止滚轮连续滚动导致过快触发事件的锁
   *
   * - 在缩放时开启，结束缩放一段时间后关闭。开启时禁止翻页。
   * - 在首次触发结束页时开启，一段时间关闭。开启时禁止触发结束页的上下话切换功能。
   */
  scrollLock: false
};

const defaultOption = {
  dir: 'rtl',
  scrollbar: {
    enabled: true,
    autoHidden: false,
    showProgress: true
  },
  onePageMode: false,
  scrollMode: false,
  clickPage: {
    enabled: 'ontouchstart' in document.documentElement,
    overturn: false
  },
  firstPageFill: true,
  disableZoom: false,
  darkMode: false,
  swapTurnPage: false,
  flipToNext: true,
  alwaysLoadAllImg: false,
  scrollModeImgScale: 1,
  showComment: true
};
const OptionState = {
  option: defaultOption
};

const OtherState = {
  panzoom: undefined,
  /** 当前是否处于放大模式 */
  isZoomed: false,
  /** 是否强制显示侧边栏 */
  showToolbar: false,
  /** 是否强制显示滚动条 */
  showScrollbar: false,
  /** 是否显示结束页 */
  showEndPage: false,
  /** 是否显示点击区域 */
  showTouchArea: false,
  /** 结束页状态。showEndPage 更改时自动计算 */
  endPageType: undefined,
  /** 评论列表 */
  commentList: undefined,
  /** 点击结束页按钮时触发的回调 */
  onExit: undefined,
  /** 点击上一话按钮时触发的回调 */
  onPrev: undefined,
  /** 点击下一话按钮时触发的回调 */
  onNext: undefined,
  /** 图片加载状态发生变化时触发的回调 */
  onLoading: undefined,
  editButtonList: list => list,
  editSettingList: list => list,
  prevRef: undefined,
  nextRef: undefined,
  exitRef: undefined
};

const {
  store,
  setState,
  _state
} = useStore({
  ...imgState,
  ...ScrollbarState,
  ...OptionState,
  ...OtherState,
  rootRef: undefined,
  mangaFlowRef: undefined,
  prevAreaRef: undefined,
  nextAreaRef: undefined,
  menuAreaRef: undefined
});

/* eslint-disable no-undefined,no-param-reassign,no-shadow */

/**
 * Throttle execution of a function. Especially useful for rate limiting
 * execution of handlers on events like resize and scroll.
 *
 * @param {number} delay -                  A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher)
 *                                            are most useful.
 * @param {Function} callback -               A function to be executed after delay milliseconds. The \`this\` context and all arguments are passed through,
 *                                            as-is, to \`callback\` when the throttled-function is executed.
 * @param {object} [options] -              An object to configure options.
 * @param {boolean} [options.noTrailing] -   Optional, defaults to false. If noTrailing is true, callback will only execute every \`delay\` milliseconds
 *                                            while the throttled-function is being called. If noTrailing is false or unspecified, callback will be executed
 *                                            one final time after the last throttled-function call. (After the throttled-function has not been called for
 *                                            \`delay\` milliseconds, the internal counter is reset).
 * @param {boolean} [options.noLeading] -   Optional, defaults to false. If noLeading is false, the first throttled-function call will execute callback
 *                                            immediately. If noLeading is true, the first the callback execution will be skipped. It should be noted that
 *                                            callback will never executed if both noLeading = true and noTrailing = true.
 * @param {boolean} [options.debounceMode] - If \`debounceMode\` is true (at begin), schedule \`clear\` to execute after \`delay\` ms. If \`debounceMode\` is
 *                                            false (at end), schedule \`callback\` to execute after \`delay\` ms.
 *
 * @returns {Function} A new, throttled, function.
 */
function throttle (delay, callback, options) {
  var _ref = options || {},
      _ref$noTrailing = _ref.noTrailing,
      noTrailing = _ref$noTrailing === void 0 ? false : _ref$noTrailing,
      _ref$noLeading = _ref.noLeading,
      noLeading = _ref$noLeading === void 0 ? false : _ref$noLeading,
      _ref$debounceMode = _ref.debounceMode,
      debounceMode = _ref$debounceMode === void 0 ? undefined : _ref$debounceMode;
  /*
   * After wrapper has stopped being called, this timeout ensures that
   * \`callback\` is executed at the proper times in \`throttle\` and \`end\`
   * debounce modes.
   */


  var timeoutID;
  var cancelled = false; // Keep track of the last time \`callback\` was executed.

  var lastExec = 0; // Function to clear existing timeout

  function clearExistingTimeout() {
    if (timeoutID) {
      clearTimeout(timeoutID);
    }
  } // Function to cancel next exec


  function cancel(options) {
    var _ref2 = options || {},
        _ref2$upcomingOnly = _ref2.upcomingOnly,
        upcomingOnly = _ref2$upcomingOnly === void 0 ? false : _ref2$upcomingOnly;

    clearExistingTimeout();
    cancelled = !upcomingOnly;
  }
  /*
   * The \`wrapper\` function encapsulates all of the throttling / debouncing
   * functionality and when executed will limit the rate at which \`callback\`
   * is executed.
   */


  function wrapper() {
    for (var _len = arguments.length, arguments_ = new Array(_len), _key = 0; _key < _len; _key++) {
      arguments_[_key] = arguments[_key];
    }

    var self = this;
    var elapsed = Date.now() - lastExec;

    if (cancelled) {
      return;
    } // Execute \`callback\` and update the \`lastExec\` timestamp.


    function exec() {
      lastExec = Date.now();
      callback.apply(self, arguments_);
    }
    /*
     * If \`debounceMode\` is true (at begin) this is used to clear the flag
     * to allow future \`callback\` executions.
     */


    function clear() {
      timeoutID = undefined;
    }

    if (!noLeading && debounceMode && !timeoutID) {
      /*
       * Since \`wrapper\` is being called for the first time and
       * \`debounceMode\` is true (at begin), execute \`callback\`
       * and noLeading != true.
       */
      exec();
    }

    clearExistingTimeout();

    if (debounceMode === undefined && elapsed > delay) {
      if (noLeading) {
        /*
         * In throttle mode with noLeading, if \`delay\` time has
         * been exceeded, update \`lastExec\` and schedule \`callback\`
         * to execute after \`delay\` ms.
         */
        lastExec = Date.now();

        if (!noTrailing) {
          timeoutID = setTimeout(debounceMode ? clear : exec, delay);
        }
      } else {
        /*
         * In throttle mode without noLeading, if \`delay\` time has been exceeded, execute
         * \`callback\`.
         */
        exec();
      }
    } else if (noTrailing !== true) {
      /*
       * In trailing throttle mode, since \`delay\` time has not been
       * exceeded, schedule \`callback\` to execute \`delay\` ms after most
       * recent execution.
       *
       * If \`debounceMode\` is true (at begin), schedule \`clear\` to execute
       * after \`delay\` ms.
       *
       * If \`debounceMode\` is false (at end), schedule \`callback\` to
       * execute after \`delay\` ms.
       */
      timeoutID = setTimeout(debounceMode ? clear : exec, debounceMode === undefined ? delay - elapsed : delay);
    }
  }

  wrapper.cancel = cancel; // Return the wrapper function.

  return wrapper;
}

/* eslint-disable no-undefined */
/**
 * Debounce execution of a function. Debouncing, unlike throttling,
 * guarantees that a function is only executed a single time, either at the
 * very beginning of a series of calls, or at the very end.
 *
 * @param {number} delay -               A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 * @param {Function} callback -          A function to be executed after delay milliseconds. The \`this\` context and all arguments are passed through, as-is,
 *                                        to \`callback\` when the debounced-function is executed.
 * @param {object} [options] -           An object to configure options.
 * @param {boolean} [options.atBegin] -  Optional, defaults to false. If atBegin is false or unspecified, callback will only be executed \`delay\` milliseconds
 *                                        after the last debounced-function call. If atBegin is true, callback will be executed only at the first debounced-function call.
 *                                        (After the throttled-function has not been called for \`delay\` milliseconds, the internal counter is reset).
 *
 * @returns {Function} A new, debounced function.
 */

function debounce (delay, callback, options) {
  var _ref = options || {},
      _ref$atBegin = _ref.atBegin,
      atBegin = _ref$atBegin === void 0 ? false : _ref$atBegin;

  return throttle(delay, callback, {
    debounceMode: atBegin !== false
  });
}

const initPanzoom = state => {
  // 销毁之前可能创建过的实例
  state.panzoom?.dispose();
  const panzoom = createPanZoom(state.mangaFlowRef, {
    // 边界限制
    bounds: true,
    boundsPadding: 1,
    // 禁止缩小
    minZoom: 1,
    // 禁用默认的双击缩放
    zoomDoubleClickSpeed: 1,
    // 禁止处理手指捏合动作，交给浏览器去缩放
    pinchSpeed: 0,
    // 忽略键盘事件
    filterKey: () => true,
    // 不处理 touch 事件
    onTouch: () => false,
    // 在 处于卷轴模式 或 不处于缩放状态且没有按下 alt 时，不进行缩放
    beforeWheel: e => store.option.scrollMode || !e.altKey && panzoom.getTransform().scale === 1,
    // 不处于卷轴模式或按下「alt 键」或「处于放大状态」时才允许拖动
    beforeMouseDown: e => !(!store.option.scrollMode || e.altKey || panzoom.getTransform().scale !== 1)
  });
  panzoom.on('zoom', throttle(200, () => {
    setState(draftState => {
      if (!draftState.scrollLock) draftState.scrollLock = true;
      draftState.isZoomed = panzoom.getTransform().scale !== 1;
    });
    setState(async draftState => {
      if (!draftState.isZoomed && draftState.scrollLock) {
        // 防止在放大模式下通过滚轮缩小至原尺寸后立刻跳转至下一页，所以加一个延时
        await sleep(200);
        draftState.scrollLock = false;
      }
    });
  }));
  state.panzoom = panzoom;
};

// 1. 因为不同汉化组处理情况不同不可能全部适配，所以只能是尽量适配*出现频率更多*的情况
// 2. 因为大部分用户都不会在意正确页序，所以应该尽量少加填充页
/** 记录自动修改过页面填充的图片流 */
const autoCloseFill = new Set();

/** 找到指定页面所处的图片流 */
const findFillIndex = (pageIndex, fillEffect) => {
  let nowFillIndex = pageIndex;
  while (!Reflect.has(fillEffect, nowFillIndex)) nowFillIndex -= 1;
  return nowFillIndex;
};

/** 根据图片比例和填充页设置对漫画图片进行排列 */
const handleComicData = (imgList, fillEffect) => {
  const pageList = [];
  let imgCache = null;
  for (let i = 0; i < imgList.length; i += 1) {
    const img = imgList[i];
    if (fillEffect[i - 1]) {
      if (imgCache !== null) pageList.push([imgCache]);
      imgCache = -1;
    }
    if (img.type !== 'long' && img.type !== 'wide') {
      if (imgCache !== null) {
        pageList.push([imgCache, i]);
        imgCache = null;
      } else {
        imgCache = i;
      }
      if (Reflect.has(fillEffect, i)) Reflect.deleteProperty(fillEffect, i);
    } else {
      if (imgCache !== null) {
        const nowFillIndex = findFillIndex(i, fillEffect);

        // 在除结尾外的位置出现了跨页图的话，那张跨页图大概率是页序的「正确答案」
        // 如果这张跨页导致了缺页就说明在这之前的页面填充有误，应该调整之前的填充设置
        // 排除结尾是防止被结尾汉化组图误导
        // 自动调整毕竟有可能误判，所以每个跨页都应该只调整一次，不能重复修改
        if (!autoCloseFill.has(i) && i < imgList.length - 2) {
          autoCloseFill.add(i);
          fillEffect[nowFillIndex] = !fillEffect[nowFillIndex];
          return handleComicData(imgList, fillEffect);
        }
        if (imgCache !== -1) pageList.push([imgCache, -1]);
        imgCache = null;
      }
      if (fillEffect[i] === undefined && img.loadType !== 'loading') fillEffect[i] = false;
      pageList.push([i]);
    }
  }
  if (imgCache !== null && imgCache !== -1) {
    pageList.push([imgCache, -1]);
    imgCache = null;
  }
  return pageList;
};

/** 漫画流的容器 */
const mangaFlowEle = () => store.mangaFlowRef?.parentNode;

/** 漫画流的总高度 */
const contentHeight = () => mangaFlowEle().scrollHeight;

/** 能显示出漫画的高度 */
const windowHeight = () => store.rootRef?.offsetHeight ?? 0;

/** 更新滚动条滑块的高度和所处高度 */
const updateDrag = state => {
  if (!state.option.scrollMode) {
    state.scrollbar.dragHeight = 0;
    state.scrollbar.dragTop = 0;
    return;
  }
  state.scrollbar.dragHeight = windowHeight() / (contentHeight() || windowHeight());
};

/** 获取指定 page 中的图片 index，并在后面加上加载状态 */
const getPageIndexText = (state, pageIndex) => {
  const page = state.pageList[pageIndex];
  if (!page) return ['null'];
  const pageIndexText = page.map(index => {
    if (index === -1) return '填充页';
    const img = state.imgList[index];
    if (img.loadType === 'loaded') return \`\${index + 1}\`;
    // 如果图片未加载完毕则在其 index 后增加显示当前加载状态
    return \`\${index + 1} (\${loadTypeMap[img.loadType]})\`;
  });
  if (state.option.dir === 'rtl') pageIndexText.reverse();
  return pageIndexText;
};
const getTipText = state => {
  if (!state.pageList.length || !state.mangaFlowRef) return '';
  if (!state.option.scrollMode) return getPageIndexText(state, state.activePageIndex).join(' | ');

  /** 当前显示图片的列表 */
  const activeImageIndexList = [];
  const {
    scrollTop
  } = mangaFlowEle();
  const imgEleList = store.mangaFlowRef.childNodes;
  const scrollBottom = scrollTop + store.rootRef.offsetHeight;

  // 通过一个一个检查图片元素所在高度来判断图片是否被显示
  for (let i = 0; i < imgEleList.length; i += 1) {
    const element = imgEleList[i];
    // 当图片的顶部位置在视窗口的底部位置时中断循环
    if (element.offsetTop > scrollBottom) break;
    // 当图片的底部位置还未达到视窗口的顶部位置时，跳到下一个图片
    if (element.offsetTop + element.offsetHeight < scrollTop) continue;
    activeImageIndexList.push(+element.alt);
  }
  state.activePageIndex = activeImageIndexList.at(0) ?? 0;
  return activeImageIndexList.map(index => getPageIndexText(state, index)).join('\\n');
};

/** 更新滚动条提示文本 */
const updateTipText = throttle(100, () => {
  setState(state => {
    state.scrollbar.tipText = getTipText(state);
  });
});

/** 监视漫画页的滚动事件 */
const handleMangaFlowScroll = () => {
  if (!store.option.scrollMode) return;
  setState(state => {
    state.scrollbar.dragTop = !mangaFlowEle || !contentHeight() ? 0 : mangaFlowEle().scrollTop / contentHeight();
    updateDrag(state);
  });
  updateTipText();
};

/** 开始拖拽时的 dragTop 值 */
let startTop = 0;
const dragOption = {
  handleDrag: ({
    type,
    xy: [, y],
    initial: [, iy]
  }, e) => {
    // 跳过拖拽结束事件（单击时会同时触发开始和结束，就用开始事件来完成单击的效果
    if (type === 'end') return;
    // 跳过没必要处理的情况
    if (type === 'dragging' && y === iy) return;
    if (!store.mangaFlowRef) return;

    /** 滚动条高度 */
    const scrollbarHeight = e.target.offsetHeight;
    /** 点击位置在滚动条上的位置比率 */
    const clickTop = y / scrollbarHeight;
    let top = clickTop;
    if (store.option.scrollMode) {
      if (type === 'dragging') {
        /** 在滚动条上的移动比率 */
        const dy = (y - iy) / scrollbarHeight;
        top = startTop + dy;
        // 处理超出范围的情况
        if (top < 0) top = 0;else if (top > 1) top = 1;
        mangaFlowEle().scrollTo({
          top: top * contentHeight(),
          behavior: 'instant'
        });
      } else {
        // 确保滚动条的中心会在点击位置
        top -= store.scrollbar.dragHeight / 2;
        startTop = top;
        mangaFlowEle().scrollTo({
          top: top * contentHeight(),
          behavior: 'smooth'
        });
      }
    } else {
      let newPageIndex = Math.floor(top * store.pageList.length);
      // 处理超出范围的情况
      if (newPageIndex < 0) newPageIndex = 0;else if (newPageIndex >= store.pageList.length) newPageIndex = store.pageList.length - 1;
      if (newPageIndex !== store.activePageIndex) {
        setState(state => {
          state.activePageIndex = newPageIndex;
        });
      }
    }
  }
};
solidJs.createRoot(() => {
  // 更新滚动条提示文本
  solidJs.createEffect(solidJs.on([() => store.activePageIndex, () => store.pageList, () => store.scrollbar.dragHeight, () => store.scrollbar.dragTop, () => store.option.scrollMode, () => store.option.dir], updateTipText));
});

/** 阻止事件冒泡 */
const stopPropagation = e => {
  e.stopPropagation();
};

/** 从头开始播放元素的动画 */
const playAnimation = e => e?.getAnimations().forEach(animation => {
  animation.cancel();
  animation.play();
});
const clamp = (max, val, min) => Math.max(Math.min(max, val), min);

/** 是否需要自动判断开启卷轴模式 */
let autoScrollMode = true;

/**
 * 预加载指定页数的图片，并取消其他预加载的图片
 * @param state state
 * @param startIndex 起始 page index
 * @param endIndex 结束 page index
 * @param loadNum 加载图片的数量
 * @returns 返回指定范围内的图片在执行前是否还有未加载完的
 */
const loadImg = (state, startIndex, endIndex = startIndex + 1, loadNum = 2) => {
  let editNum = 0;
  state.pageList.slice(Math.max(startIndex, 0), clamp(endIndex, state.pageList.length, 0)).flat().some(index => {
    if (index === -1) return false;
    const img = state.imgList[index];
    if (img.src && img.loadType !== 'loaded') {
      img.loadType = 'loading';
      editNum += 1;
    }
    return editNum >= loadNum;
  });
  const edited = editNum > 0;
  if (edited) updateTipText();
  return edited;
};

/** 根据当前页数更新所有图片的加载状态 */
const updateImgLoadType = debounce(100, state => {
  const {
    imgList,
    activePageIndex
  } = state;

  // 先将所有加载中的图片状态改为暂停
  imgList.forEach(({
    loadType,
    src
  }, i) => {
    if (!src) {
      imgList[i].loadType = 'error';
    } else if (loadType === 'loading' || loadType === 'error') imgList[i].loadType = 'wait';
  });
  return (
    // 优先加载当前显示页
    loadImg(state, activePageIndex, activePageIndex + 1) ||
    // 再加载后十页
    loadImg(state, activePageIndex + 1, activePageIndex + 20) ||
    // 再加载前十页
    loadImg(state, activePageIndex - 10, activePageIndex - 1) ||
    // 根据设置决定是否要继续加载其余图片
    !state.option.alwaysLoadAllImg && imgList.length > 60 ||
    // 加载当前页后面的图片
    loadImg(state, activePageIndex + 1, imgList.length, 5) ||
    // 加载剩余未加载页面
    loadImg(state, 0, imgList.length, 5)
  );
});

/** 重新计算 PageData */
const updatePageData = state => {
  const {
    imgList,
    fillEffect,
    option: {
      onePageMode,
      scrollMode
    }
  } = state;
  if (onePageMode || scrollMode || imgList.length <= 1) state.pageList = imgList.map((_, i) => [i]);else state.pageList = handleComicData(imgList, fillEffect);
  updateDrag(state);
  updateImgLoadType(state);
};
updatePageData.debounce = debounce(100, updatePageData);

/** 根据比例更新图片类型 */
const updateImgType = (state, draftImg) => {
  const {
    width,
    height,
    type
  } = draftImg;
  if (!width || !height) return;
  const imgRatio = width / height;
  if (imgRatio <= state.proportion.单页比例) {
    draftImg.type = imgRatio < state.proportion.条漫比例 ? 'vertical' : '';
  } else {
    draftImg.type = imgRatio > state.proportion.横幅比例 ? 'long' : 'wide';
  }

  // 当超过3张图的类型为长图时，自动开启卷轴模式
  if (!state.option.scrollMode && autoScrollMode && state.imgList.filter(img => img.type === 'vertical').length > 3) {
    state.option.scrollMode = true;
    autoScrollMode = false;
  }
  if (type === draftImg.type) {
    updateDrag(state);
    updateImgLoadType(state);
    return;
  }
  updatePageData.debounce(state);
};

/** 更新页面比例 */
const updatePageRatio = (state, width, height) => {
  state.proportion.单页比例 = Math.min(width / 2 / height, 1);
  state.proportion.横幅比例 = width / height;
  state.proportion.条漫比例 = state.proportion.单页比例 / 2;
  state.imgList.forEach(img => updateImgType(state, img));
};

/** 翻页 */
const turnPage = (state, dir) => {
  if (dir === 'prev') {
    switch (state.endPageType) {
      case 'start':
        if (!state.scrollLock && state.option.flipToNext) state.onPrev?.();
        return;
      case 'end':
        state.endPageType = undefined;
        return;
      default:
        // 弹出卷首结束页
        if (state.activePageIndex === 0) {
          if (!state.onExit) return;
          // 没有 onPrev 时不弹出
          if (!state.onPrev || !state.option.flipToNext) return;
          state.endPageType = 'start';
          state.scrollLock = true;
          window.setTimeout(() => {
            state.scrollLock = false;
          }, 500);
          return;
        }
        if (!state.option.scrollMode) state.activePageIndex -= 1;
    }
  } else {
    switch (state.endPageType) {
      case 'end':
        if (state.scrollLock) return;
        if (state.onNext && state.option.flipToNext) {
          state.onNext();
          return;
        }
        state.onExit?.(true);
        return;
      case 'start':
        state.endPageType = undefined;
        return;
      default:
        // 弹出卷尾结束页
        if (state.activePageIndex === state.pageList.length - 1) {
          if (!state.onExit) return;
          state.endPageType = 'end';
          state.scrollLock = true;
          window.setTimeout(() => {
            state.scrollLock = false;
          }, 200);
          return;
        }
        if (!state.option.scrollMode) state.activePageIndex += 1;
    }
  }
};
const setScrollModeImgScale = newScale => {
  setState(state => {
    state.option.scrollModeImgScale = newScale;
  });
  // 在调整图片缩放后使当前滚动进度保持不变
  setState(state => {
    mangaFlowEle().scrollTo({
      top: contentHeight() * state.scrollbar.dragTop
    });
  });
  handleMangaFlowScroll();
};
const {
  activeImgIndex,
  nowFillIndex,
  activePage
} = solidJs.createRoot(() => {
  const activeImgIndexMemo = solidJs.createMemo(() => store.pageList[store.activePageIndex]?.find(i => i !== -1) ?? 0);
  const nowFillIndexMemo = solidJs.createMemo(() => findFillIndex(activeImgIndexMemo(), store.fillEffect));
  const activePageMemo = solidJs.createMemo(() => store.pageList[store.activePageIndex]);

  // 页数发生变动时
  solidJs.createEffect(solidJs.on(() => store.activePageIndex, () => {
    setState(state => {
      updateImgLoadType(state);
      if (state.endPageType) state.endPageType = undefined;
    });
  }, {
    defer: true
  }));
  return {
    /** 当前显示的第一张图片的 index */
    activeImgIndex: activeImgIndexMemo,
    /** 当前所处的图片流 */
    nowFillIndex: nowFillIndexMemo,
    /** 当前显示页面 */
    activePage: activePageMemo
  };
});

/** 在图片排列改变后自动跳转回原先显示图片所在的页数 */
const jumpBackPage = state => {
  const lastActiveImgIndex = activeImgIndex();
  return () => {
    state.activePageIndex = state.pageList.findIndex(page => page.includes(lastActiveImgIndex));
  };
};

/** 切换页面填充 */
const switchFillEffect = () => {
  setState(state => {
    // 如果当前页不是双页显示的就跳过，避免在显示跨页图的页面切换却没看到效果的疑惑
    if (state.pageList[state.activePageIndex].length !== 2) return;
    const jump = jumpBackPage(state);
    state.fillEffect[nowFillIndex()] = !state.fillEffect[nowFillIndex()];
    updatePageData(state);
    jump();
  });
};

const handleWheel = e => {
  e.stopPropagation();
  if (e.ctrlKey || e.altKey && !store.option.scrollMode || !store.endPageType && store.scrollLock) return;
  const isWheelDown = e.deltaY > 0;
  if (store.option.scrollMode && !store.endPageType) {
    // 实现在卷轴模式滚动到头尾后继续滚动时弹出结束页
    if (store.scrollbar.dragTop === 0 && !isWheelDown) {
      window.setTimeout(() => {
        setState(state => {
          state.endPageType = 'start';
          state.scrollLock = true;
        });
      });
      window.setTimeout(() => {
        setState(state => {
          state.scrollLock = false;
        });
      }, 500);
    } else if (store.scrollbar.dragHeight + store.scrollbar.dragTop >= 0.999 && isWheelDown) {
      setState(state => {
        state.endPageType = 'end';
        state.scrollLock = true;
      });
      window.setTimeout(() => {
        setState(state => {
          state.scrollLock = false;
        });
      }, 500);
    }

    // 实现卷轴模式下的缩放
    if (e.altKey) {
      e.preventDefault();
      const zoomScale = (isWheelDown ? -1 : 1) * 0.1;
      setScrollModeImgScale(clamp(5, store.option.scrollModeImgScale + zoomScale, 0.2));
      // 在调整图片缩放后使当前滚动进度保持不变
      setState(state => {
        mangaFlowEle().scrollTo({
          top: contentHeight() * state.scrollbar.dragTop
        });
      });
      handleMangaFlowScroll();
    }
    return;
  }
  setState(state => turnPage(state, isWheelDown ? 'next' : 'prev'));
};

/** 根据是否开启了 左右翻页键交换 来切换翻页方向 */
const handleSwapTurnPage = nextPage => store.option.swapTurnPage ? !nextPage : nextPage;
const handleKeyUp = e => {
  e.stopPropagation();
  if (store.option.scrollMode && !store.endPageType) return;
  let nextPage = null;
  switch (e.key) {
    case 'PageUp':
    case 'ArrowUp':
    case 'w':
      nextPage = false;
      break;
    case ' ':
    case 'PageDown':
    case 'ArrowDown':
    case 's':
      nextPage = true;
      break;
    case 'ArrowRight':
    case '.':
    case 'd':
      nextPage = handleSwapTurnPage(store.option.dir !== 'rtl');
      break;
    case 'ArrowLeft':
    case ',':
    case 'a':
      nextPage = handleSwapTurnPage(store.option.dir === 'rtl');
      break;
    case '/':
    case 'm':
    case 'z':
      switchFillEffect();
      break;
    case 'Home':
      setState(state => {
        state.activePageIndex = 0;
      });
      break;
    case 'End':
      setState(state => {
        state.activePageIndex = state.pageList.length - 1;
      });
      break;
    case 'Escape':
      store.onExit?.();
      break;
  }
  if (nextPage === null) return;
  setState(state => turnPage(state, nextPage ? 'next' : 'prev'));
};

/** 通过重新解构赋值 option 以触发 onOptionChange */
const setOption = fn => {
  setState(state => {
    fn(state.option);
    state.option = {
      ...state.option
    };
  });
};

/** 切换指定 option 的布尔值 */
const switchOption = name => {
  const path = name.split('.');
  setOption(draftOption => {
    let target = draftOption;
    while (path.length > 1) {
      const key = path.shift();
      if (!key) break;
      target = target[key];
    }
    if (typeof target[path[0]] !== 'boolean') return;
    target[path[0]] = !target[path[0]];
  });
};

/** 创建用于将 ref 绑定到对应 state 上的工具函数 */
const bindRef = (name, fn) => e => {
  setState(state => {
    Reflect.set(state, name, e);
    fn?.(state);
  });
};

var css$1 = ".index_module_img__a6dd667f{background-color:var(--hover_bg_color,#fff3);display:none;height:100%;max-width:100%;object-fit:contain;z-index:1}.index_module_img__a6dd667f[data-show]{display:unset}.index_module_img__a6dd667f[data-fill=left]{transform:translate(50%)}.index_module_img__a6dd667f[data-fill=right]{transform:translate(-50%)}.index_module_img__a6dd667f[data-load-type=error],.index_module_img__a6dd667f[data-load-type=wait]{display:none}.index_module_mangaFlowBox__a6dd667f{height:100%;outline:none;scrollbar-width:none}.index_module_mangaFlowBox__a6dd667f::-webkit-scrollbar{display:none}.index_module_mangaFlow__a6dd667f{align-items:center;color:var(--text);display:flex;height:100%;justify-content:center;user-select:none}.index_module_mangaFlow__a6dd667f.index_module_disableZoom__a6dd667f .index_module_img__a6dd667f{height:unset;max-height:100%;object-fit:scale-down}.index_module_mangaFlow__a6dd667f.index_module_scrollMode__a6dd667f{flex-direction:column;justify-content:flex-start;overflow:visible}.index_module_mangaFlow__a6dd667f.index_module_scrollMode__a6dd667f .index_module_img__a6dd667f{height:auto;max-height:unset;max-width:unset;object-fit:contain;width:calc(var(--scrollModeImgScale)*var(--width))}.index_module_mangaFlow__a6dd667f.index_module_scrollMode__a6dd667f .index_module_img__a6dd667f[data-load-type=wait]{flex-basis:var(--img_placeholder_height,100vh);flex-shrink:0}.index_module_mangaFlow__a6dd667f[dir=ltr]{flex-direction:row}.index_module_mangaFlow__a6dd667f>svg{background-color:var(--bg);color:var(--text_secondary);position:absolute;width:20%}.index_module_mangaFlow__a6dd667f>svg[data-fill=left]{transform:translate(100%)}.index_module_mangaFlow__a6dd667f>svg[data-fill=right]{transform:translate(-100%)}.index_module_endPage__a6dd667f{align-items:center;background-color:#333d;color:#fff;display:flex;height:100%;justify-content:center;left:0;opacity:0;pointer-events:none;position:absolute;top:0;transition:opacity .5s;width:100%;z-index:10}.index_module_endPage__a6dd667f>button{animation:index_module_jello__a6dd667f .3s forwards;background-color:initial;border:0;color:inherit;cursor:pointer;font-size:1.2em;transform-origin:center}.index_module_endPage__a6dd667f>button[data-is-end]{font-size:3em;margin:2em}.index_module_endPage__a6dd667f>button:focus-visible{outline:none}.index_module_endPage__a6dd667f>.index_module_tip__a6dd667f{margin:auto;position:absolute}.index_module_endPage__a6dd667f[data-show]{opacity:1;pointer-events:all}.index_module_endPage__a6dd667f[data-type=start]>.index_module_tip__a6dd667f{transform:translateY(-10em)}.index_module_endPage__a6dd667f[data-type=end]>.index_module_tip__a6dd667f{transform:translateY(10em)}.index_module_comments__a6dd667f{align-items:end;display:flex;flex-direction:column;max-height:80%;opacity:.1;overflow:auto;padding-right:.5em;position:absolute;right:1em;scrollbar-color:var(--scrollbar_drag) #0000;scrollbar-width:thin;width:20em}.index_module_comments__a6dd667f::-webkit-scrollbar{height:10px;width:5px}.index_module_comments__a6dd667f::-webkit-scrollbar-track{background:#0000;border-radius:6px}.index_module_comments__a6dd667f::-webkit-scrollbar-thumb{background:var(--scrollbar_drag);border-radius:6px}.index_module_comments__a6dd667f>p{background-color:#333b;border-radius:.5em;margin:.5em .1em;padding:.2em .5em}.index_module_comments__a6dd667f:hover{opacity:1}@keyframes index_module_jello__a6dd667f{0%,11.1%,to{transform:translateZ(0)}22.2%{transform:skewX(-12.5deg) skewY(-12.5deg)}33.3%{transform:skewX(6.25deg) skewY(6.25deg)}44.4%{transform:skewX(-3.125deg) skewY(-3.125deg)}55.5%{transform:skewX(1.5625deg) skewY(1.5625deg)}66.6%{transform:skewX(-.7812deg) skewY(-.7812deg)}77.7%{transform:skewX(.3906deg) skewY(.3906deg)}88.8%{transform:skewX(-.1953deg) skewY(-.1953deg)}}.index_module_toolbar__a6dd667f{align-items:center;display:flex;height:100%;justify-content:flex-start;position:fixed;top:0;width:5vw;z-index:9}.index_module_toolbarPanel__a6dd667f{display:flex;flex-direction:column;padding:.5em;position:relative;transform:translateX(-100%);transition:transform .2s}.index_module_toolbar__a6dd667f[data-show=true] .index_module_toolbarPanel__a6dd667f{transform:none}.index_module_toolbarBg__a6dd667f{backdrop-filter:blur(3px);background-color:var(--page_bg);border-bottom-right-radius:1em;border-top-right-radius:1em;filter:opacity(.3);height:100%;position:absolute;right:0;top:0;width:100%}.index_module_SettingPanelPopper__a6dd667f{height:0!important;padding:0!important;transform:none!important}.index_module_SettingPanel__a6dd667f{background-color:var(--page_bg);border-radius:.3em;bottom:0;box-shadow:0 3px 1px -2px #0003,0 2px 2px 0 #00000024,0 1px 5px 0 #0000001f;color:var(--text);font-size:1.2em;height:-moz-fit-content;height:fit-content;margin:auto;max-height:95vh;overflow:auto;position:fixed;scrollbar-width:none;top:0;width:15em}.index_module_SettingPanel__a6dd667f::-webkit-scrollbar{display:none}.index_module_SettingBlock__a6dd667f{padding:.5em}.index_module_SettingBlockSubtitle__a6dd667f{color:var(--text_secondary);font-size:.7em;margin-bottom:-.3em}.index_module_SettingsItem__a6dd667f{align-items:center;display:flex;justify-content:space-between;margin-top:1em}.index_module_SettingsItemName__a6dd667f{font-size:.9em}.index_module_SettingsItemSwitch__a6dd667f{align-items:center;background-color:var(--switch_bg);border:0;border-radius:1em;cursor:pointer;display:inline-flex;height:.8em;margin-right:.3em;padding:0;width:2.3em}.index_module_SettingsItemSwitchRound__a6dd667f{background:var(--switch);border-radius:100%;box-shadow:0 2px 1px -1px #0003,0 1px 1px 0 #00000024,0 1px 3px 0 #0000001f;height:1.15em;transform:translateX(-10%);transition:transform .1s;width:1.15em}.index_module_SettingsItemSwitch__a6dd667f[data-checked=true]{background:var(--secondary_bg)}.index_module_SettingsItemSwitch__a6dd667f[data-checked=true] .index_module_SettingsItemSwitchRound__a6dd667f{background:var(--secondary);transform:translateX(110%)}.index_module_SettingsItemIconButton__a6dd667f{background-color:initial;border:none;color:var(--text);cursor:pointer;font-size:1.7em;height:1em;margin:0;padding:0;position:absolute;right:.7em}.index_module_closeCover__a6dd667f{height:100%;left:0;position:fixed;top:0;width:100%;z-index:-1}.index_module_scrollbar__a6dd667f{border-left:10em solid #0000;display:flex;flex-direction:column;height:98%;outline:none;position:absolute;right:3px;top:1%;touch-action:none;user-select:none;width:5px;z-index:9}.index_module_scrollbar__a6dd667f>div{display:flex;flex-direction:column;flex-grow:1;pointer-events:none}.index_module_scrollbarDrag__a6dd667f{background-color:var(--scrollbar_drag);border-radius:1em;justify-content:center;opacity:0;position:absolute;width:100%;z-index:1}.index_module_scrollbarPage__a6dd667f{flex-grow:1;transform:scaleY(1);transform-origin:bottom;transition:transform 1s,background-color 0ms 1s}.index_module_scrollbarPage__a6dd667f[data-type=loaded]{transform:scaleY(0)}.index_module_scrollbarPage__a6dd667f[data-type=loading]{background-color:var(--secondary)}.index_module_scrollbarPage__a6dd667f[data-type=wait]{background-color:var(--secondary);opacity:.5}.index_module_scrollbarPage__a6dd667f[data-type=error]{background-color:#f005}.index_module_scrollbarPoper__a6dd667f{align-items:center;background-color:#303030;border-radius:.3em;color:#fff;display:flex;font-size:.8em;line-height:1.5em;opacity:0;padding:.2em .5em;position:absolute;right:2em;text-align:center;transition:opacity .15s;white-space:pre;width:-moz-fit-content;width:fit-content}.index_module_scrollbarPoper__a6dd667f:after{background-color:#303030;background-color:initial;border:.4em solid #0000;border-left:.5em solid #303030;content:\\"\\";left:100%;position:absolute}.index_module_scrollbarDrag__a6dd667f[data-show=true],.index_module_scrollbarPoper__a6dd667f[data-show=true],.index_module_scrollbar__a6dd667f:hover .index_module_scrollbarDrag__a6dd667f,.index_module_scrollbar__a6dd667f:hover .index_module_scrollbarPoper__a6dd667f{opacity:1}.index_module_touchAreaRoot__a6dd667f{color:#fff;display:flex;font-size:3em;height:100%;pointer-events:none;position:absolute;top:0;user-select:none;visibility:hidden;width:100%}.index_module_touchArea__a6dd667f{align-items:center;display:flex;flex-grow:1;justify-content:center;outline:none;writing-mode:vertical-rl}.index_module_touchArea__a6dd667f[data-area=menu]{flex-basis:4em;flex-grow:0}.index_module_touchAreaRoot__a6dd667f[data-show=true]{visibility:visible}.index_module_touchAreaRoot__a6dd667f[data-show=true] .index_module_touchArea__a6dd667f[data-area=prev]{background-color:#95e1d3e6}.index_module_touchAreaRoot__a6dd667f[data-show=true] .index_module_touchArea__a6dd667f[data-area=menu]{background-color:#fce38ae6}.index_module_touchAreaRoot__a6dd667f[data-show=true] .index_module_touchArea__a6dd667f[data-area=next]{background-color:#f38181e6}.index_module_hidden__a6dd667f{display:none}.index_module_invisible__a6dd667f{visibility:hidden}.index_module_opacity1__a6dd667f{opacity:1}.index_module_opacity0__a6dd667f{opacity:0}.index_module_root__a6dd667f{background-color:var(--bg);height:100%;outline:0;overflow:hidden;position:relative;width:100%}.index_module_root__a6dd667f a{color:var(--text_secondary)}";
var modules_c21c94f2$1 = {"img":"index_module_img__a6dd667f","mangaFlowBox":"index_module_mangaFlowBox__a6dd667f","mangaFlow":"index_module_mangaFlow__a6dd667f","disableZoom":"index_module_disableZoom__a6dd667f","scrollMode":"index_module_scrollMode__a6dd667f","endPage":"index_module_endPage__a6dd667f","jello":"index_module_jello__a6dd667f","tip":"index_module_tip__a6dd667f","comments":"index_module_comments__a6dd667f","toolbar":"index_module_toolbar__a6dd667f","toolbarPanel":"index_module_toolbarPanel__a6dd667f","toolbarBg":"index_module_toolbarBg__a6dd667f","SettingPanelPopper":"index_module_SettingPanelPopper__a6dd667f","SettingPanel":"index_module_SettingPanel__a6dd667f","SettingBlock":"index_module_SettingBlock__a6dd667f","SettingBlockSubtitle":"index_module_SettingBlockSubtitle__a6dd667f","SettingsItem":"index_module_SettingsItem__a6dd667f","SettingsItemName":"index_module_SettingsItemName__a6dd667f","SettingsItemSwitch":"index_module_SettingsItemSwitch__a6dd667f","SettingsItemSwitchRound":"index_module_SettingsItemSwitchRound__a6dd667f","SettingsItemIconButton":"index_module_SettingsItemIconButton__a6dd667f","closeCover":"index_module_closeCover__a6dd667f","scrollbar":"index_module_scrollbar__a6dd667f","scrollbarDrag":"index_module_scrollbarDrag__a6dd667f","scrollbarPage":"index_module_scrollbarPage__a6dd667f","scrollbarPoper":"index_module_scrollbarPoper__a6dd667f","touchAreaRoot":"index_module_touchAreaRoot__a6dd667f","touchArea":"index_module_touchArea__a6dd667f","hidden":"index_module_hidden__a6dd667f","invisible":"index_module_invisible__a6dd667f","opacity1":"index_module_opacity1__a6dd667f","opacity0":"index_module_opacity0__a6dd667f","root":"index_module_root__a6dd667f"};
n(css$1,{});

const _tmpl$$t = /*#__PURE__*/web.template(\`<img>\`);
/** 图片加载完毕的回调 */
const handleImgLoaded = (i, e) => {
  setState(state => {
    const img = state.imgList[i];
    if (!img) return;
    if (img.loadType === 'error' && e.src !== img.src) return;
    img.loadType = 'loaded';
    img.height = e.naturalHeight;
    img.width = e.naturalWidth;
    updateImgType(state, img);
    state.onLoading?.(img, state.imgList);
  });
};

/** 图片加载出错的回调 */
const handleImgError = (i, e) => {
  // 跳过因为 src 为空导致的错误
  if (e.getAttribute('src') === '') return;
  setState(state => {
    const img = state.imgList[i];
    if (!img) return;
    img.loadType = 'error';
    console.error('图片加载失败', e);
    state.onLoading?.(img, state.imgList);
  });
};

/** 漫画图片 */
const ComicImg = props => {
  const show = solidJs.createMemo(() => store.option.scrollMode || activePage().includes(props.index));
  const fill = solidJs.createMemo(() => {
    if (!show() || props.img.loadType === 'error') return;

    // 判断一下当前是否显示了错误图片
    const activePageType = activePage().map(i => store.imgList[i]?.loadType);
    const errorIndex = activePageType.indexOf('error');
    if (errorIndex !== -1) return !!errorIndex === (store.option.dir === 'rtl') ? 'left' : 'right';

    // 最后判断是否有填充页
    const fillIndex = activePage().indexOf(-1);
    if (fillIndex !== -1) return !!fillIndex === (store.option.dir === 'rtl') ? 'left' : 'right';
  });
  return (() => {
    const _el$ = _tmpl$$t();
    _el$.addEventListener("error", e => handleImgError(props.index, e.currentTarget));
    _el$.addEventListener("load", e => handleImgLoaded(props.index, e.currentTarget));
    web.effect(_p$ => {
      const _v$ = modules_c21c94f2$1.img,
        _v$2 = store.option.scrollMode && props.img.width ? \`\${props.img.width}px\` : undefined,
        _v$3 = props.img.loadType === 'wait' ? '' : props.img.src,
        _v$4 = \`\${props.index + 1}\`,
        _v$5 = show() ? '' : undefined,
        _v$6 = fill(),
        _v$7 = props.img.type || undefined,
        _v$8 = props.img.loadType === 'loaded' ? undefined : props.img.loadType;
      _v$ !== _p$._v$ && web.className(_el$, _p$._v$ = _v$);
      _v$2 !== _p$._v$2 && ((_p$._v$2 = _v$2) != null ? _el$.style.setProperty("--width", _v$2) : _el$.style.removeProperty("--width"));
      _v$3 !== _p$._v$3 && web.setAttribute(_el$, "src", _p$._v$3 = _v$3);
      _v$4 !== _p$._v$4 && web.setAttribute(_el$, "alt", _p$._v$4 = _v$4);
      _v$5 !== _p$._v$5 && web.setAttribute(_el$, "data-show", _p$._v$5 = _v$5);
      _v$6 !== _p$._v$6 && web.setAttribute(_el$, "data-fill", _p$._v$6 = _v$6);
      _v$7 !== _p$._v$7 && web.setAttribute(_el$, "data-type", _p$._v$7 = _v$7);
      _v$8 !== _p$._v$8 && web.setAttribute(_el$, "data-load-type", _p$._v$8 = _v$8);
      return _p$;
    }, {
      _v$: undefined,
      _v$2: undefined,
      _v$3: undefined,
      _v$4: undefined,
      _v$5: undefined,
      _v$6: undefined,
      _v$7: undefined,
      _v$8: undefined
    });
    return _el$;
  })();
};

const _tmpl$$s = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="m21.19 21.19-.78-.78L18 18l-4.59-4.59-9.82-9.82-.78-.78a.996.996 0 0 0-1.41 0C1 3.2 1 3.83 1.39 4.22L3 5.83V19c0 1.1.9 2 2 2h13.17l1.61 1.61c.39.39 1.02.39 1.41 0 .39-.39.39-1.03 0-1.42zM6.02 18c-.42 0-.65-.48-.39-.81l2.49-3.2a.5.5 0 0 1 .78-.01l2.1 2.53L12.17 15l3 3H6.02zm14.98.17L5.83 3H19c1.1 0 2 .9 2 2v13.17z">\`);
const MdImageNotSupported = ((props = {}) => (() => {
  const _el$ = _tmpl$$s();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$r = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-4.65 4.65c-.2.2-.51.2-.71 0L7 13h3V9h4v4h3z">\`);
const MdCloudDownload = ((props = {}) => (() => {
  const _el$ = _tmpl$$r();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const loadTypeSvg = {
  error: MdImageNotSupported,
  loading: MdCloudDownload,
  wait: MdCloudDownload
};
const ShowSvg = index => {
  const position = solidJs.createMemo(() => {
    if (activePage().length === 1) return;
    return activePage().indexOf(index) ? 'after' : 'before';
  });
  return web.createComponent(web.Dynamic, {
    get component() {
      return loadTypeSvg[store.imgList[index]?.loadType];
    },
    get style() {
      return {
        transform: position() && \`translate(\${position() === 'before' ? '' : '-'}100%)\`
      };
    }
  });
};
const LoadTypeTip = () => web.createComponent(solidJs.For, {
  get each() {
    return activePage();
  },
  children: ShowSvg
});

const _tmpl$$q = /*#__PURE__*/web.template(\`<div><div data-area="prev" role="button" tabindex="-1"><h6>上 一 页</div><div data-area="menu" role="button" tabindex="-1"><h6>菜 单</div><div data-area="next" role="button" tabindex="-1"><h6>下 一 页\`);
const handleClick = {
  prev: () => {
    if (store.option.clickPage.enabled) setState(state => turnPage(state, 'prev'));
  },
  next: () => {
    if (store.option.clickPage.enabled) setState(state => turnPage(state, 'next'));
  },
  menu: () => {
    // 处于放大模式时跳过不处理
    if (store.isZoomed) return;
    setState(state => {
      state.showScrollbar = !state.showScrollbar;
      state.showToolbar = !state.showToolbar;
    });
  }
};

/** 根据点击坐标触发指定的操作 */
const handlePageClick = ({
  clientX: x,
  clientY: y
}) => {
  if (store.isZoomed) return;

  // 找到当前
  const targetArea = [store.nextAreaRef, store.menuAreaRef, store.prevAreaRef].find(e => {
    if (!e) return false;
    const rect = e.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });
  if (!targetArea) return;
  handleClick[targetArea.getAttribute('data-area')]();
};
const TouchArea = () => {
  return (() => {
    const _el$ = _tmpl$$q(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.nextSibling,
      _el$4 = _el$3.nextSibling;
    const _ref$ = bindRef('prevAreaRef');
    typeof _ref$ === "function" && web.use(_ref$, _el$2);
    const _ref$2 = bindRef('menuAreaRef');
    typeof _ref$2 === "function" && web.use(_ref$2, _el$3);
    const _ref$3 = bindRef('nextAreaRef');
    typeof _ref$3 === "function" && web.use(_ref$3, _el$4);
    web.effect(_p$ => {
      const _v$ = modules_c21c94f2$1.touchAreaRoot,
        _v$2 = store.option.dir === 'rtl' === (store.option.clickPage.enabled && store.option.clickPage.overturn) ? undefined : 'row-reverse',
        _v$3 = store.isZoomed ? 'move' : undefined,
        _v$4 = store.showTouchArea,
        _v$5 = modules_c21c94f2$1.touchArea,
        _v$6 = modules_c21c94f2$1.touchArea,
        _v$7 = modules_c21c94f2$1.touchArea;
      _v$ !== _p$._v$ && web.className(_el$, _p$._v$ = _v$);
      _v$2 !== _p$._v$2 && ((_p$._v$2 = _v$2) != null ? _el$.style.setProperty("flex-direction", _v$2) : _el$.style.removeProperty("flex-direction"));
      _v$3 !== _p$._v$3 && ((_p$._v$3 = _v$3) != null ? _el$.style.setProperty("cursor", _v$3) : _el$.style.removeProperty("cursor"));
      _v$4 !== _p$._v$4 && web.setAttribute(_el$, "data-show", _p$._v$4 = _v$4);
      _v$5 !== _p$._v$5 && web.className(_el$2, _p$._v$5 = _v$5);
      _v$6 !== _p$._v$6 && web.className(_el$3, _p$._v$6 = _v$6);
      _v$7 !== _p$._v$7 && web.className(_el$4, _p$._v$7 = _v$7);
      return _p$;
    }, {
      _v$: undefined,
      _v$2: undefined,
      _v$3: undefined,
      _v$4: undefined,
      _v$5: undefined,
      _v$6: undefined,
      _v$7: undefined
    });
    return _el$;
  })();
};

let clickTimeout = null;
const useDoubleClick = (click, doubleClick, timeout = 200) => {
  return event => {
    // 如果点击触发时还有上次计时器的记录，说明这次是双击
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
      doubleClick?.(event);
      return;
    }

    // 单击事件延迟触发
    clickTimeout = window.setTimeout(() => {
      click(event);
      clickTimeout = null;
    }, timeout);
  };
};

const _tmpl$$p = /*#__PURE__*/web.template(\`<div tabindex="-1"><div>\`),
  _tmpl$2$6 = /*#__PURE__*/web.template(\`<h1>NULL\`);

/**
 * 漫画图片流的容器
 */
const ComicImgFlow = () => {
  const handleClick = e => handlePageClick(e);

  /** 处理双击缩放 */
  const handleDoubleClickZoom = e => {
    setTimeout(() => {
      if (!store.panzoom) return;
      const {
        scale
      } = store.panzoom.getTransform();

      // 当缩放到一定程度时再双击会缩放回原尺寸，否则正常触发缩放

      if (scale >= 2) store.panzoom.smoothZoomAbs(0, 0, 1);else store.panzoom.smoothZoomAbs(e.clientX, e.clientY, scale + 1);
    });
  };
  return (() => {
    const _el$ = _tmpl$$p(),
      _el$2 = _el$.firstChild;
    web.use(e => e.addEventListener('scroll', handleMangaFlowScroll, {
      passive: true
    }), _el$);
    web.addEventListener(_el$2, "click", useDoubleClick(handleClick, handleDoubleClickZoom), true);
    const _ref$ = bindRef('mangaFlowRef', initPanzoom);
    typeof _ref$ === "function" && web.use(_ref$, _el$2);
    web.insert(_el$2, web.createComponent(solidJs.Index, {
      get each() {
        return store.imgList;
      },
      get fallback() {
        return _tmpl$2$6();
      },
      children: (img, i) => web.createComponent(ComicImg, {
        get img() {
          return img();
        },
        index: i
      })
    }), null);
    web.insert(_el$2, web.createComponent(LoadTypeTip, {}), null);
    web.effect(_p$ => {
      const _v$ = modules_c21c94f2$1.mangaFlowBox,
        _v$2 = store.option.scrollMode ? 'auto' : 'hidden',
        _v$3 = modules_c21c94f2$1.mangaFlow,
        _v$4 = modules_c21c94f2$1.mangaFlow,
        _v$5 = {
          [modules_c21c94f2$1.disableZoom]: store.option.disableZoom || store.option.scrollMode,
          [modules_c21c94f2$1.scrollMode]: store.option.scrollMode
        },
        _v$6 = store.option.dir;
      _v$ !== _p$._v$ && web.className(_el$, _p$._v$ = _v$);
      _v$2 !== _p$._v$2 && ((_p$._v$2 = _v$2) != null ? _el$.style.setProperty("overflow", _v$2) : _el$.style.removeProperty("overflow"));
      _v$3 !== _p$._v$3 && web.setAttribute(_el$2, "id", _p$._v$3 = _v$3);
      _v$4 !== _p$._v$4 && web.className(_el$2, _p$._v$4 = _v$4);
      _p$._v$5 = web.classList(_el$2, _v$5, _p$._v$5);
      _v$6 !== _p$._v$6 && web.setAttribute(_el$2, "dir", _p$._v$6 = _v$6);
      return _p$;
    }, {
      _v$: undefined,
      _v$2: undefined,
      _v$3: undefined,
      _v$4: undefined,
      _v$5: undefined,
      _v$6: undefined
    });
    return _el$;
  })();
};
web.delegateEvents(["click"]);

const _tmpl$$o = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 14c-.55 0-1-.45-1-1V9h-1c-.55 0-1-.45-1-1s.45-1 1-1h2c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1z">\`);
const MdLooksOne = ((props = {}) => (() => {
  const _el$ = _tmpl$$o();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$n = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 8c0 1.1-.9 2-2 2h-2v2h3c.55 0 1 .45 1 1s-.45 1-1 1h-4c-.55 0-1-.45-1-1v-3c0-1.1.9-2 2-2h2V9h-3c-.55 0-1-.45-1-1s.45-1 1-1h3c1.1 0 2 .9 2 2v2z">\`);
const MdLooksTwo = ((props = {}) => (() => {
  const _el$ = _tmpl$$n();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$m = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M3 21h17c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1zM20 8H3c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h17c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zM2 4v1c0 .55.45 1 1 1h17c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1z">\`);
const MdViewDay = ((props = {}) => (() => {
  const _el$ = _tmpl$$m();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$l = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M3 6c-.55 0-1 .45-1 1v13c0 1.1.9 2 2 2h13c.55 0 1-.45 1-1s-.45-1-1-1H5c-.55 0-1-.45-1-1V7c0-.55-.45-1-1-1zm17-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 9h-3v3c0 .55-.45 1-1 1s-1-.45-1-1v-3h-3c-.55 0-1-.45-1-1s.45-1 1-1h3V6c0-.55.45-1 1-1s1 .45 1 1v3h3c.55 0 1 .45 1 1s-.45 1-1 1z">\`);
const MdQueue = ((props = {}) => (() => {
  const _el$ = _tmpl$$l();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$k = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M19.5 12c0-.23-.01-.45-.03-.68l1.86-1.41c.4-.3.51-.86.26-1.3l-1.87-3.23a.987.987 0 0 0-1.25-.42l-2.15.91c-.37-.26-.76-.49-1.17-.68l-.29-2.31c-.06-.5-.49-.88-.99-.88h-3.73c-.51 0-.94.38-1 .88l-.29 2.31c-.41.19-.8.42-1.17.68l-2.15-.91c-.46-.2-1-.02-1.25.42L2.41 8.62c-.25.44-.14.99.26 1.3l1.86 1.41a7.343 7.343 0 0 0 0 1.35l-1.86 1.41c-.4.3-.51.86-.26 1.3l1.87 3.23c.25.44.79.62 1.25.42l2.15-.91c.37.26.76.49 1.17.68l.29 2.31c.06.5.49.88.99.88h3.73c.5 0 .93-.38.99-.88l.29-2.31c.41-.19.8-.42 1.17-.68l2.15.91c.46.2 1 .02 1.25-.42l1.87-3.23c.25-.44.14-.99-.26-1.3l-1.86-1.41c.03-.23.04-.45.04-.68zm-7.46 3.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z">\`);
const MdSettings = ((props = {}) => (() => {
  const _el$ = _tmpl$$k();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$j = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z">\`);
const MdSearch = ((props = {}) => (() => {
  const _el$ = _tmpl$$j();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$i = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M9 10v4c0 .55.45 1 1 1s1-.45 1-1V4h2v10c0 .55.45 1 1 1s1-.45 1-1V4h1c.55 0 1-.45 1-1s-.45-1-1-1H9.17C7.08 2 5.22 3.53 5.02 5.61A3.998 3.998 0 0 0 9 10zm11.65 7.65-2.79-2.79a.501.501 0 0 0-.86.35V17H6c-.55 0-1 .45-1 1s.45 1 1 1h11v1.79c0 .45.54.67.85.35l2.79-2.79c.2-.19.2-.51.01-.7z">\`);
const MdOutlineFormatTextdirectionLToR = ((props = {}) => (() => {
  const _el$ = _tmpl$$i();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$h = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M10 10v4c0 .55.45 1 1 1s1-.45 1-1V4h2v10c0 .55.45 1 1 1s1-.45 1-1V4h1c.55 0 1-.45 1-1s-.45-1-1-1h-6.83C8.08 2 6.22 3.53 6.02 5.61A3.998 3.998 0 0 0 10 10zm-2 7v-1.79c0-.45-.54-.67-.85-.35l-2.79 2.79c-.2.2-.2.51 0 .71l2.79 2.79a.5.5 0 0 0 .85-.36V19h11c.55 0 1-.45 1-1s-.45-1-1-1H8z">\`);
const MdOutlineFormatTextdirectionRToL = ((props = {}) => (() => {
  const _el$ = _tmpl$$h();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$g = /*#__PURE__*/web.template(\`<div><div> <!> \`);
/**
 * 设置菜单项
 */
const SettingsItem = props => (() => {
  const _el$ = _tmpl$$g(),
    _el$2 = _el$.firstChild,
    _el$3 = _el$2.firstChild,
    _el$5 = _el$3.nextSibling;
    _el$5.nextSibling;
  web.insert(_el$2, () => props.name, _el$5);
  web.insert(_el$, () => props.children, null);
  web.effect(_p$ => {
    const _v$ = props.class ? \`\${modules_c21c94f2$1.SettingsItem} \${props.class}\` : modules_c21c94f2$1.SettingsItem,
      _v$2 = {
        [props.class ?? '']: !!props.class?.length,
        ...props.classList
      },
      _v$3 = modules_c21c94f2$1.SettingsItemName;
    _v$ !== _p$._v$ && web.className(_el$, _p$._v$ = _v$);
    _p$._v$2 = web.classList(_el$, _v$2, _p$._v$2);
    _v$3 !== _p$._v$3 && web.className(_el$2, _p$._v$3 = _v$3);
    return _p$;
  }, {
    _v$: undefined,
    _v$2: undefined,
    _v$3: undefined
  });
  return _el$;
})();

const _tmpl$$f = /*#__PURE__*/web.template(\`<button type="button"><div>\`);
/**
 * 开关式菜单项
 */
const SettingsItemSwitch = props => {
  const handleClick = () => props.onChange(!props.value);
  return web.createComponent(SettingsItem, {
    get name() {
      return props.name;
    },
    get ["class"]() {
      return props.class;
    },
    get classList() {
      return props.classList;
    },
    get children() {
      const _el$ = _tmpl$$f(),
        _el$2 = _el$.firstChild;
      _el$.$$click = handleClick;
      web.effect(_p$ => {
        const _v$ = modules_c21c94f2$1.SettingsItemSwitch,
          _v$2 = props.value,
          _v$3 = modules_c21c94f2$1.SettingsItemSwitchRound;
        _v$ !== _p$._v$ && web.className(_el$, _p$._v$ = _v$);
        _v$2 !== _p$._v$2 && web.setAttribute(_el$, "data-checked", _p$._v$2 = _v$2);
        _v$3 !== _p$._v$3 && web.className(_el$2, _p$._v$3 = _v$3);
        return _p$;
      }, {
        _v$: undefined,
        _v$2: undefined,
        _v$3: undefined
      });
      return _el$;
    }
  });
};
web.delegateEvents(["click"]);

const _tmpl$$e = /*#__PURE__*/web.template(\`<button type="button">\`),
  _tmpl$2$5 = /*#__PURE__*/web.template(\`<input type="color">\`),
  _tmpl$3$4 = /*#__PURE__*/web.template(\`<a href="https://github.com/hymbz/ComicReadScript" target="_blank">0.0.1\`),
  _tmpl$4$1 = /*#__PURE__*/web.template(\`<div><a href="https://github.com/hymbz/ComicReadScript/issues" target="_blank">Github</a><a href="https://greasyfork.org/zh-CN/scripts/374903-comicread/feedback" target="_blank">Greasy Fork\`);
/** 默认菜单项 */
const defaultSettingList = [['阅读方向', () => web.createComponent(SettingsItem, {
  get name() {
    return store.option.dir === 'rtl' ? '从右到左（日漫）' : '从左到右（美漫）';
  },
  get children() {
    const _el$ = _tmpl$$e();
    _el$.$$click = () => setOption(draftOption => {
      draftOption.dir = draftOption.dir === 'rtl' ? 'ltr' : 'rtl';
    });
    web.insert(_el$, (() => {
      const _c$ = web.memo(() => store.option.dir === 'rtl');
      return () => _c$() ? web.createComponent(MdOutlineFormatTextdirectionRToL, {}) : web.createComponent(MdOutlineFormatTextdirectionLToR, {});
    })());
    web.effect(() => web.className(_el$, modules_c21c94f2$1.SettingsItemIconButton));
    return _el$;
  }
})], ['滚动条', () => [web.createComponent(SettingsItemSwitch, {
  name: "\\u663E\\u793A\\u6EDA\\u52A8\\u6761",
  get value() {
    return store.option.scrollbar.enabled;
  },
  onChange: () => switchOption('scrollbar.enabled')
}), web.createComponent(SettingsItemSwitch, {
  name: "\\u81EA\\u52A8\\u9690\\u85CF\\u6EDA\\u52A8\\u6761",
  get value() {
    return store.option.scrollbar.autoHidden;
  },
  get classList() {
    return {
      [modules_c21c94f2$1.hidden]: !store.option.scrollbar.enabled
    };
  },
  onChange: () => switchOption('scrollbar.autoHidden')
}), web.createComponent(SettingsItemSwitch, {
  name: "\\u663E\\u793A\\u56FE\\u7247\\u52A0\\u8F7D\\u72B6\\u6001",
  get value() {
    return store.option.scrollbar.showProgress;
  },
  get classList() {
    return {
      [modules_c21c94f2$1.hidden]: !store.option.scrollbar.enabled
    };
  },
  onChange: () => switchOption('scrollbar.showProgress')
})]], ['点击翻页', () => [web.createComponent(SettingsItemSwitch, {
  name: "\\u542F\\u7528\\u70B9\\u51FB\\u7FFB\\u9875",
  get value() {
    return store.option.clickPage.enabled;
  },
  onChange: () => switchOption('clickPage.enabled')
}), web.createComponent(SettingsItemSwitch, {
  name: "\\u5DE6\\u53F3\\u53CD\\u8F6C\\u70B9\\u51FB\\u533A\\u57DF",
  get value() {
    return store.option.clickPage.overturn;
  },
  get classList() {
    return {
      [modules_c21c94f2$1.hidden]: !store.option.clickPage.enabled
    };
  },
  onChange: () => switchOption('clickPage.overturn')
}), web.createComponent(SettingsItemSwitch, {
  name: "\\u663E\\u793A\\u70B9\\u51FB\\u533A\\u57DF\\u63D0\\u793A",
  get value() {
    return store.showTouchArea;
  },
  get classList() {
    return {
      [modules_c21c94f2$1.hidden]: !store.option.clickPage.enabled
    };
  },
  onChange: () => {
    setState(state => {
      state.showTouchArea = !state.showTouchArea;
    });
  }
})]], ['操作', () => [web.createComponent(SettingsItemSwitch, {
  name: "\\u7FFB\\u9875\\u81F3\\u4E0A/\\u4E0B\\u4E00\\u8BDD",
  get value() {
    return store.option.flipToNext;
  },
  onChange: () => switchOption('clickPageflipToNext')
}), web.createComponent(SettingsItemSwitch, {
  name: "\\u5DE6\\u53F3\\u7FFB\\u9875\\u952E\\u4EA4\\u6362",
  get value() {
    return store.option.swapTurnPage;
  },
  onChange: () => switchOption('swapTurnPage')
})]], ['显示', () => [web.createComponent(SettingsItemSwitch, {
  name: "\\u542F\\u7528\\u591C\\u95F4\\u6A21\\u5F0F",
  get value() {
    return store.option.darkMode;
  },
  onChange: () => switchOption('darkMode')
}), web.createComponent(SettingsItemSwitch, {
  name: "\\u7981\\u6B62\\u653E\\u5927\\u56FE\\u7247",
  get value() {
    return store.option.disableZoom;
  },
  onChange: () => switchOption('disableZoom')
}), web.createComponent(SettingsItemSwitch, {
  name: "\\u5728\\u7ED3\\u675F\\u9875\\u663E\\u793A\\u8BC4\\u8BBA",
  get value() {
    return store.option.showComment;
  },
  onChange: () => switchOption('showComment')
}), web.createComponent(SettingsItem, {
  name: "\\u80CC\\u666F\\u989C\\u8272",
  get children() {
    const _el$2 = _tmpl$2$5();
    web.addEventListener(_el$2, "input", throttle(20, e => {
      setOption(draftOption => {
        // 在拉到纯黑或纯白时改回初始值
        draftOption.customBackground = e.target.value === '#000000' || e.target.value === '#ffffff' ? undefined : e.target.value;
        draftOption.darkMode = needDarkMode(e.target.value);
      });
    }), true);
    _el$2.style.setProperty("width", "2em");
    _el$2.style.setProperty("margin-right", ".4em");
    web.effect(() => _el$2.value = store.option.customBackground ?? (store.option.darkMode ? '#000000' : '#ffffff'));
    return _el$2;
  }
})]], ['其他', () => [web.createComponent(SettingsItemSwitch, {
  name: "\\u59CB\\u7EC8\\u52A0\\u8F7D\\u6240\\u6709\\u56FE\\u7247",
  get value() {
    return store.option.alwaysLoadAllImg;
  },
  onChange: () => {
    switchOption('alwaysLoadAllImg');
    setState(updateImgLoadType);
  }
}), web.createComponent(SettingsItemSwitch, {
  name: "\\u9ED8\\u8BA4\\u542F\\u7528\\u9996\\u9875\\u586B\\u5145",
  get value() {
    return store.option.firstPageFill;
  },
  onChange: () => switchOption('firstPageFill')
})]], ['关于', () => [web.createComponent(SettingsItem, {
  name: "\\u7248\\u672C\\u53F7",
  get children() {
    return _tmpl$3$4();
  }
}), web.createComponent(SettingsItem, {
  name: "\\u53CD\\u9988",
  get children() {
    const _el$4 = _tmpl$4$1(),
      _el$5 = _el$4.firstChild;
    _el$5.style.setProperty("margin-right", ".5em");
    return _el$4;
  }
})]]];
web.delegateEvents(["click", "input"]);

const _tmpl$$d = /*#__PURE__*/web.template(\`<div>\`),
  _tmpl$2$4 = /*#__PURE__*/web.template(\`<div><div>\`),
  _tmpl$3$3 = /*#__PURE__*/web.template(\`<hr>\`);

/** 菜单面板 */
const SettingPanel = () => {
  const settingList = solidJs.createMemo(() => store.editSettingList(defaultSettingList));
  return (() => {
    const _el$ = _tmpl$$d();
    web.addEventListener(_el$, "wheel", stopPropagation);
    web.addEventListener(_el$, "scroll", stopPropagation);
    web.insert(_el$, web.createComponent(solidJs.For, {
      get each() {
        return settingList();
      },
      children: ([key, SettingItem], i) => [web.memo((() => {
        const _c$ = web.memo(() => !!i());
        return () => _c$() ? _tmpl$3$3() : null;
      })()), (() => {
        const _el$2 = _tmpl$2$4(),
          _el$3 = _el$2.firstChild;
        web.insert(_el$3, key);
        web.insert(_el$2, web.createComponent(SettingItem, {}), null);
        web.effect(_p$ => {
          const _v$ = modules_c21c94f2$1.SettingBlock,
            _v$2 = modules_c21c94f2$1.SettingBlockSubtitle;
          _v$ !== _p$._v$ && web.className(_el$2, _p$._v$ = _v$);
          _v$2 !== _p$._v$2 && web.className(_el$3, _p$._v$2 = _v$2);
          return _p$;
        }, {
          _v$: undefined,
          _v$2: undefined
        });
        return _el$2;
      })()]
    }));
    web.effect(() => web.className(_el$, modules_c21c94f2$1.SettingPanel));
    return _el$;
  })();
};

const _tmpl$$c = /*#__PURE__*/web.template(\`<div>\`),
  _tmpl$2$3 = /*#__PURE__*/web.template(\`<div role="button" tabindex="-1" aria-label="关闭设置弹窗的遮罩">\`);
/** 工具栏按钮分隔栏 */
const buttonListDivider = () => (() => {
  const _el$ = _tmpl$$c();
  _el$.style.setProperty("height", "1em");
  return _el$;
})();

/** 工具栏的默认按钮列表 */
const defaultButtonList = [
// 单双页模式
() => web.createComponent(IconButton, {
  get tip() {
    return store.option.onePageMode ? '单页模式' : '双页模式';
  },
  get hidden() {
    return store.option.scrollMode;
  },
  onClick: () => {
    setState(state => {
      const jump = jumpBackPage(state);
      switchOption('onePageMode');
      updatePageData(state);
      jump();
    });
  },
  get children() {
    return web.memo(() => !!store.option.onePageMode)() ? web.createComponent(MdLooksOne, {}) : web.createComponent(MdLooksTwo, {});
  }
}),
// 卷轴模式
() => web.createComponent(IconButton, {
  tip: "\\u5377\\u8F74\\u6A21\\u5F0F",
  get enabled() {
    return store.option.scrollMode;
  },
  onClick: () => {
    store.panzoom?.smoothZoomAbs(0, 0, 1);
    setState(state => {
      state.activePageIndex = 0;
      setOption(draftOption => {
        draftOption.scrollMode = !draftOption.scrollMode;
        draftOption.onePageMode = draftOption.scrollMode;
      });
      updatePageData(state);
    });
    setTimeout(handleMangaFlowScroll);
  },
  get children() {
    return web.createComponent(MdViewDay, {});
  }
}),
// 页面填充
() => web.createComponent(IconButton, {
  tip: "\\u9875\\u9762\\u586B\\u5145",
  get enabled() {
    return store.fillEffect[nowFillIndex()];
  },
  get hidden() {
    return store.option.onePageMode;
  },
  onClick: switchFillEffect,
  get children() {
    return web.createComponent(MdQueue, {});
  }
}), buttonListDivider,
// 放大模式
() => web.createComponent(IconButton, {
  tip: "\\u653E\\u5927\\u6A21\\u5F0F",
  get enabled() {
    return store.isZoomed || store.option.scrollMode && store.option.scrollModeImgScale !== 1;
  },
  onClick: () => {
    if (store.option.scrollMode) {
      setScrollModeImgScale(store.option.scrollModeImgScale < 2 ? store.option.scrollModeImgScale + 0.2 : 1);
      return;
    }
    if (!store.panzoom) return;
    const {
      scale
    } = store.panzoom.getTransform();
    if (scale === 1) store.panzoom.smoothZoom(0, 0, 1.2);else store.panzoom.smoothZoomAbs(0, 0, 1);
  },
  get children() {
    return web.createComponent(MdSearch, {});
  }
}),
// 设置
props => {
  const [showPanel, setShowPanel] = solidJs.createSignal(false);
  const handleClick = () => {
    const _showPanel = !showPanel();
    setState(state => {
      state.showToolbar = _showPanel;
    });
    setShowPanel(_showPanel);
    props.onMouseLeave();
  };
  const popper = solidJs.createMemo(() => [web.createComponent(SettingPanel, {}), (() => {
    const _el$2 = _tmpl$2$3();
    _el$2.$$click = handleClick;
    web.effect(() => web.className(_el$2, modules_c21c94f2$1.closeCover));
    return _el$2;
  })()]);
  return web.createComponent(IconButton, {
    tip: "\\u8BBE\\u7F6E",
    get enabled() {
      return showPanel();
    },
    get showTip() {
      return showPanel();
    },
    onClick: handleClick,
    get popperClassName() {
      return showPanel() && modules_c21c94f2$1.SettingPanelPopper;
    },
    get popper() {
      return web.memo(() => !!showPanel())() && popper();
    },
    get children() {
      return web.createComponent(MdSettings, {});
    }
  });
}];
web.delegateEvents(["click"]);

const useHover = () => {
  const [isHover, setIsHover] = solidJs.createSignal(false);
  return {
    isHover,
    /** 鼠标移入 */
    handleMouseEnter: () => setIsHover(true),
    /** 鼠标移出 */
    handleMouseLeave: () => setIsHover(false)
  };
};

const _tmpl$$b = /*#__PURE__*/web.template(\`<div role="toolbar"><div><div>\`);

/** 左侧工具栏 */
const Toolbar = () => {
  const {
    isHover,
    handleMouseEnter,
    handleMouseLeave
  } = useHover();
  return (() => {
    const _el$ = _tmpl$$b(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.firstChild;
    web.addEventListener(_el$, "mouseenter", handleMouseEnter);
    web.addEventListener(_el$, "mouseleave", handleMouseLeave);
    web.insert(_el$2, web.createComponent(solidJs.For, {
      get each() {
        return store.editButtonList(defaultButtonList);
      },
      children: ButtonItem => web.createComponent(ButtonItem, {
        onMouseLeave: handleMouseLeave
      })
    }), null);
    web.effect(_p$ => {
      const _v$ = modules_c21c94f2$1.toolbar,
        _v$2 = isHover() || store.showToolbar,
        _v$3 = modules_c21c94f2$1.toolbarPanel,
        _v$4 = modules_c21c94f2$1.toolbarBg;
      _v$ !== _p$._v$ && web.className(_el$, _p$._v$ = _v$);
      _v$2 !== _p$._v$2 && web.setAttribute(_el$, "data-show", _p$._v$2 = _v$2);
      _v$3 !== _p$._v$3 && web.className(_el$2, _p$._v$3 = _v$3);
      _v$4 !== _p$._v$4 && web.className(_el$3, _p$._v$4 = _v$4);
      return _p$;
    }, {
      _v$: undefined,
      _v$2: undefined,
      _v$3: undefined,
      _v$4: undefined
    });
    return _el$;
  })();
};

const defaultStata = () => ({
  type: 'start',
  xy: [0, 0],
  initial: [0, 0],
  startTime: 0
});
const state = defaultStata();
const useDrag = ref => {
  solidJs.onMount(() => {
    const controller = new AbortController();
    const {
      handleDrag
    } = dragOption;
    if (ref) {
      // 在鼠标、手指按下后切换状态
      ref.addEventListener('mousedown', e => {
        e.stopPropagation();
        // 只处理左键按下触发的事件
        if (e.buttons !== 1) return;
        state.type = 'start';
        state.xy = [e.offsetX, e.offsetY];
        state.initial = [e.offsetX, e.offsetY];
        state.startTime = Date.now();
        handleDrag(state, e);
      }, {
        capture: false,
        passive: true,
        signal: controller.signal
      });

      // TODO: 完成触摸事件的适配
      // ref.addEventListener(
      //   'touchstart',
      //   (e) => {
      //     down = true;
      //     handleDrag(e., e.offsetY);
      //   },
      //   { capture: false, passive: true, signal: controller.signal },
      // );

      // 在鼠标、手指移动时根据状态判断是否要触发函数
      ref.addEventListener('mousemove', e => {
        e.stopPropagation();
        if (state.startTime === 0) return;
        // 只处理左键按下触发的事件
        if (e.buttons !== 1) return;
        state.type = 'dragging';
        state.xy = [e.offsetX, e.offsetY];
        handleDrag(state, e);
      }, {
        capture: false,
        passive: true,
        signal: controller.signal
      });

      // 在鼠标、手指松开后切换状态
      ref.addEventListener('mouseup', e => {
        e.stopPropagation();
        if (state.startTime === 0) return;
        state.type = 'end';
        state.xy = [e.offsetX, e.offsetY];
        handleDrag(state, e);
        Object.assign(state, defaultStata());
      }, {
        capture: false,
        passive: true,
        signal: controller.signal
      });
    }
    solidJs.onCleanup(() => controller.abort());
  });
};

const _tmpl$$a = /*#__PURE__*/web.template(\`<div>\`);

/** 显示对应图片加载情况的元素 */
const ScrollbarImg = props => (() => {
  const _el$ = _tmpl$$a();
  web.effect(_p$ => {
    const _v$ = modules_c21c94f2$1.scrollbarPage,
      _v$2 = props.index,
      _v$3 = store.imgList[props.index].loadType;
    _v$ !== _p$._v$ && web.className(_el$, _p$._v$ = _v$);
    _v$2 !== _p$._v$2 && web.setAttribute(_el$, "data-index", _p$._v$2 = _v$2);
    _v$3 !== _p$._v$3 && web.setAttribute(_el$, "data-type", _p$._v$3 = _v$3);
    return _p$;
  }, {
    _v$: undefined,
    _v$2: undefined,
    _v$3: undefined
  });
  return _el$;
})();

/** 滚动条上用于显示对应页面下图片加载情况的元素 */
const ScrollbarPage = props => {
  const flexBasis = solidJs.createMemo(() => {
    if (!store.option.scrollMode) return undefined;
    return \`\${(store.imgList[props.a]?.height || windowHeight()) / contentHeight() * 100}%\`;
  });
  return (() => {
    const _el$2 = _tmpl$$a();
    web.insert(_el$2, web.createComponent(ScrollbarImg, {
      get index() {
        return props.a !== -1 ? props.a : props.b;
      }
    }), null);
    web.insert(_el$2, (() => {
      const _c$ = web.memo(() => !!props.b);
      return () => _c$() ? web.createComponent(ScrollbarImg, {
        get index() {
          return props.b !== -1 ? props.b : props.a;
        }
      }) : null;
    })(), null);
    web.effect(() => flexBasis() != null ? _el$2.style.setProperty("flex-basis", flexBasis()) : _el$2.style.removeProperty("flex-basis"));
    return _el$2;
  })();
};

const _tmpl$$9 = /*#__PURE__*/web.template(\`<div role="scrollbar" tabindex="-1"><div><div>\`);

/** 滚动条 */
const Scrollbar = () => {
  /** 滚动条高度 */
  const height = solidJs.createMemo(() => store.scrollbar.dragHeight ? \`\${store.scrollbar.dragHeight * 100}%\` : \`\${1 / store.pageList.length * 100}%\`);

  /** 滚动条位置高度 */
  const top = solidJs.createMemo(() => store.option.scrollMode ? \`\${store.scrollbar.dragTop * 100}%\` : \`\${1 / store.pageList.length * 100 * store.activePageIndex}%\`);

  // 在被滚动时使自身可穿透，以便在卷轴模式下触发页面的滚动
  const [penetrate, setPenetrate] = solidJs.createSignal(false);
  const resetPenetrate = debounce(200, () => setPenetrate(false));
  const handleWheel = () => {
    setPenetrate(true);
    resetPenetrate();
  };

  /** 是否强制显示滚动条 */
  const showScrollbar = solidJs.createMemo(() => store.showScrollbar || !!penetrate());
  return (() => {
    const _el$ = _tmpl$$9(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.firstChild;
    _el$.addEventListener("wheel", handleWheel);
    web.use(e => useDrag(e), _el$);
    web.insert(_el$3, () => store.scrollbar.tipText);
    web.insert(_el$, web.createComponent(solidJs.Show, {
      get when() {
        return store.option.scrollbar.showProgress;
      },
      get children() {
        return web.createComponent(solidJs.For, {
          get each() {
            return store.pageList;
          },
          children: ([a, b]) => web.createComponent(ScrollbarPage, {
            a: a,
            b: b
          })
        });
      }
    }), null);
    web.effect(_p$ => {
      const _v$ = modules_c21c94f2$1.scrollbar,
        _v$2 = {
          [modules_c21c94f2$1.hidden]: !store.option.scrollbar.enabled && !showScrollbar()
        },
        _v$3 = penetrate() ? 'none' : 'auto',
        _v$4 = modules_c21c94f2$1.mangaFlow,
        _v$5 = store.activePageIndex || -1,
        _v$6 = modules_c21c94f2$1.scrollbarDrag,
        _v$7 = !store.option.scrollbar.autoHidden || showScrollbar(),
        _v$8 = height(),
        _v$9 = top(),
        _v$10 = store.option.scrollMode ? undefined : 'top 150ms',
        _v$11 = modules_c21c94f2$1.scrollbarPoper,
        _v$12 = {
          [modules_c21c94f2$1.hidden]: !store.scrollbar.tipText
        },
        _v$13 = showScrollbar();
      _v$ !== _p$._v$ && web.className(_el$, _p$._v$ = _v$);
      _p$._v$2 = web.classList(_el$, _v$2, _p$._v$2);
      _v$3 !== _p$._v$3 && ((_p$._v$3 = _v$3) != null ? _el$.style.setProperty("pointer-events", _v$3) : _el$.style.removeProperty("pointer-events"));
      _v$4 !== _p$._v$4 && web.setAttribute(_el$, "aria-controls", _p$._v$4 = _v$4);
      _v$5 !== _p$._v$5 && web.setAttribute(_el$, "aria-valuenow", _p$._v$5 = _v$5);
      _v$6 !== _p$._v$6 && web.className(_el$2, _p$._v$6 = _v$6);
      _v$7 !== _p$._v$7 && web.setAttribute(_el$2, "data-show", _p$._v$7 = _v$7);
      _v$8 !== _p$._v$8 && ((_p$._v$8 = _v$8) != null ? _el$2.style.setProperty("height", _v$8) : _el$2.style.removeProperty("height"));
      _v$9 !== _p$._v$9 && ((_p$._v$9 = _v$9) != null ? _el$2.style.setProperty("top", _v$9) : _el$2.style.removeProperty("top"));
      _v$10 !== _p$._v$10 && ((_p$._v$10 = _v$10) != null ? _el$2.style.setProperty("transition", _v$10) : _el$2.style.removeProperty("transition"));
      _v$11 !== _p$._v$11 && web.className(_el$3, _p$._v$11 = _v$11);
      _p$._v$12 = web.classList(_el$3, _v$12, _p$._v$12);
      _v$13 !== _p$._v$13 && web.setAttribute(_el$3, "data-show", _p$._v$13 = _v$13);
      return _p$;
    }, {
      _v$: undefined,
      _v$2: undefined,
      _v$3: undefined,
      _v$4: undefined,
      _v$5: undefined,
      _v$6: undefined,
      _v$7: undefined,
      _v$8: undefined,
      _v$9: undefined,
      _v$10: undefined,
      _v$11: undefined,
      _v$12: undefined,
      _v$13: undefined
    });
    return _el$;
  })();
};

const _tmpl$$8 = /*#__PURE__*/web.template(\`<div>\`),
  _tmpl$2$2 = /*#__PURE__*/web.template(\`<div role="button" tabindex="-1"><p></p><button type="button">上一话</button><button type="button" data-is-end>退出</button><button type="button">下一话\`),
  _tmpl$3$2 = /*#__PURE__*/web.template(\`<p>\`);
let delayTypeTimer = 0;
const EndPage = () => {
  const handleClick = e => {
    e.stopPropagation();
    if (e.target?.nodeName !== 'BUTTON') setState(state => {
      state.endPageType = undefined;
    });
  };
  let ref;
  solidJs.onMount(() => {
    const controller = new AbortController();
    ref.addEventListener('wheel', e => {
      e.preventDefault();
      e.stopPropagation();
      setState(state => turnPage(state, e.deltaY > 0 ? 'next' : 'prev'));
    }, {
      passive: false,
      signal: controller.signal
    });
    solidJs.onCleanup(() => controller.abort());
  });

  // state.endPageType 变量的延时版本，在隐藏的动画效果结束之后才会真正改变
  // 防止在动画效果结束前 tip 就消失或改变了位置
  const [delayType, setDelayType] = solidJs.createSignal();
  solidJs.createEffect(() => {
    if (store.endPageType) {
      window.clearTimeout(delayTypeTimer);
      setDelayType(store.endPageType);
    } else {
      delayTypeTimer = window.setTimeout(() => setDelayType(store.endPageType), 500);
    }
  });
  const tip = solidJs.createMemo(() => {
    switch (delayType()) {
      case 'start':
        if (store.onPrev && store.option.flipToNext) return '已到开头，继续向上翻页将跳至上一话';
        break;
      case 'end':
        if (store.onNext && store.option.flipToNext) return '已到结尾，继续向下翻页将跳至下一话';
        if (store.onExit) return '已到结尾，继续翻页将退出';
        break;
    }
    return '';
  });
  return (() => {
    const _el$ = _tmpl$2$2(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.nextSibling,
      _el$4 = _el$3.nextSibling,
      _el$5 = _el$4.nextSibling;
    _el$.$$click = handleClick;
    const _ref$ = ref;
    typeof _ref$ === "function" ? web.use(_ref$, _el$) : ref = _el$;
    web.insert(_el$2, tip);
    _el$3.$$click = () => store.onPrev?.();
    const _ref$2 = bindRef('prevRef');
    typeof _ref$2 === "function" && web.use(_ref$2, _el$3);
    _el$4.$$click = () => store.onExit?.(!!store.activePageIndex);
    const _ref$3 = bindRef('exitRef');
    typeof _ref$3 === "function" && web.use(_ref$3, _el$4);
    _el$5.$$click = () => store.onNext?.();
    const _ref$4 = bindRef('nextRef');
    typeof _ref$4 === "function" && web.use(_ref$4, _el$5);
    web.insert(_el$, web.createComponent(solidJs.Show, {
      get when() {
        return web.memo(() => !!store.option.showComment)() && delayType() === 'end';
      },
      get children() {
        const _el$6 = _tmpl$$8();
        web.addEventListener(_el$6, "wheel", stopPropagation);
        web.insert(_el$6, web.createComponent(solidJs.For, {
          get each() {
            return store.commentList;
          },
          children: comment => (() => {
            const _el$7 = _tmpl$3$2();
            web.insert(_el$7, comment);
            return _el$7;
          })()
        }));
        web.effect(() => web.className(_el$6, modules_c21c94f2$1.comments));
        return _el$6;
      }
    }), null);
    web.effect(_p$ => {
      const _v$ = modules_c21c94f2$1.endPage,
        _v$2 = store.endPageType,
        _v$3 = delayType(),
        _v$4 = modules_c21c94f2$1.tip,
        _v$5 = {
          [modules_c21c94f2$1.invisible]: !store.onPrev
        },
        _v$6 = store.endPageType ? 0 : -1,
        _v$7 = store.endPageType ? 0 : -1,
        _v$8 = {
          [modules_c21c94f2$1.invisible]: !store.onNext
        },
        _v$9 = store.endPageType ? 0 : -1;
      _v$ !== _p$._v$ && web.className(_el$, _p$._v$ = _v$);
      _v$2 !== _p$._v$2 && web.setAttribute(_el$, "data-show", _p$._v$2 = _v$2);
      _v$3 !== _p$._v$3 && web.setAttribute(_el$, "data-type", _p$._v$3 = _v$3);
      _v$4 !== _p$._v$4 && web.className(_el$2, _p$._v$4 = _v$4);
      _p$._v$5 = web.classList(_el$3, _v$5, _p$._v$5);
      _v$6 !== _p$._v$6 && web.setAttribute(_el$3, "tabindex", _p$._v$6 = _v$6);
      _v$7 !== _p$._v$7 && web.setAttribute(_el$4, "tabindex", _p$._v$7 = _v$7);
      _p$._v$8 = web.classList(_el$5, _v$8, _p$._v$8);
      _v$9 !== _p$._v$9 && web.setAttribute(_el$5, "tabindex", _p$._v$9 = _v$9);
      return _p$;
    }, {
      _v$: undefined,
      _v$2: undefined,
      _v$3: undefined,
      _v$4: undefined,
      _v$5: undefined,
      _v$6: undefined,
      _v$7: undefined,
      _v$8: undefined,
      _v$9: undefined
    });
    return _el$;
  })();
};
web.delegateEvents(["click"]);

/** 深色模式的 css 变量 */
const dark = {
  '--hover_bg_color': '#FFF3',
  '--hover_bg_color_enable': '#FFFa',
  '--switch': '#BDBDBD',
  '--switch_bg': '#6E6E6E',
  '--scrollbar_drag': '#FFF6',
  '--page_bg': '#303030',
  '--secondary': '#7A909A',
  '--secondary_bg': '#556065',
  '--text': 'white',
  '--text_secondary': '#FFFC',
  '--text_bg': '#121212'
};

/** 浅色模式的 css 变量 */
const light = {
  '--hover_bg_color': '#0001',
  '--hover_bg_color_enable': '#0009',
  '--switch': '#FAFAFA',
  '--switch_bg': '#9C9C9C',
  '--scrollbar_drag': '#0006',
  '--page_bg': 'white',
  '--secondary': '#7A909A',
  '--secondary_bg': '#BAC5CA',
  '--text': 'black',
  '--text_secondary': '#0008',
  '--text_bg': '#FAFAFA'
};
const cssVar = solidJs.createRoot(() => {
  const _cssVar = solidJs.createMemo(() => ({
    '--bg': store.option.customBackground ?? (store.option.darkMode ? '#000000' : '#ffffff'),
    '--scrollModeImgScale': store.option.scrollModeImgScale,
    '--img_placeholder_height': \`\${windowHeight()}px\`,
    ...(store.option.darkMode ? dark : light)
  }));
  return _cssVar;
});

/** 初始化 */
const useInit$1 = (props, rootRef) => {
  // 绑定 rootRef
  setState(state => {
    state.rootRef = rootRef;
  });

  // 初始化配置
  solidJs.createEffect(() => {
    if (!props.option) return;
    setState(state => {
      state.option = {
        ...state.option,
        ...props.option
      };
    });
  });

  // 在 rootDom 的大小改变时更新比例，并重新计算图片类型
  const resizeObserver = new ResizeObserver(throttle(100, ([entries]) => {
    const {
      width,
      height
    } = entries.contentRect;
    setState(state => {
      updatePageRatio(state, width, height);
    });
  }));
  // 初始化页面比例
  setState(state => {
    updatePageRatio(state, rootRef.scrollWidth, rootRef.scrollHeight);
  });
  resizeObserver.disconnect();
  resizeObserver.observe(rootRef);
  solidJs.onCleanup(() => resizeObserver.disconnect());

  // 处理 imgList fillEffect 参数的初始化和修改
  solidJs.createEffect(() => {
    setState(state => {
      if (props.fillEffect) state.fillEffect = props.fillEffect;

      // 处理初始化
      if (!state.imgList.length) {
        state.fillEffect[-1] = state.option.firstPageFill;
        state.imgList = props.imgList.map(imgUrl => ({
          type: '',
          src: imgUrl,
          loadType: 'wait'
        }));
        updatePageData(state);
        return;
      }
      state.endPageType = undefined;

      /** 修改前的当前显示图片 */
      const oldActiveImg = state.pageList[state.activePageIndex].map(i => state.imgList?.[i]?.src);
      state.imgList = props.imgList.map(imgUrl => state.imgList.find(img => img.src === imgUrl) ?? {
        type: '',
        src: imgUrl,
        loadType: 'wait'
      });
      state.fillEffect = {
        '-1': true
      };
      autoCloseFill.clear();
      updatePageData(state);
      if (state.pageList.length === 0) {
        state.activePageIndex = 0;
        return;
      }

      // 尽量使当前显示的图片在修改后依然不变
      oldActiveImg.some(imgUrl => {
        // 跳过填充页和已被删除的图片
        if (!imgUrl || props.imgList.includes(imgUrl)) return false;
        const newPageIndex = state.pageList.findIndex(page => page.some(index => state.imgList?.[index]?.src === imgUrl));
        if (newPageIndex === -1) return false;
        state.activePageIndex = newPageIndex;
        return true;
      });

      // 如果已经翻到了最后一页，且最后一页的图片被删掉了，那就保持在末页显示
      if (state.activePageIndex > state.pageList.length - 1) state.activePageIndex = state.pageList.length - 1;
    });
  });
  solidJs.createEffect(() => {
    setState(state => {
      state.onExit = props.onExit ? isEnd => {
        playAnimation(store.exitRef);
        props.onExit?.(!!isEnd);
        state.activePageIndex = 0;
        state.endPageType = undefined;
      } : undefined;
      state.onPrev = props.onPrev ? () => {
        playAnimation(store.prevRef);
        props.onPrev?.();
      } : undefined;
      state.onNext = props.onNext ? () => {
        playAnimation(store.nextRef);
        props.onNext?.();
      } : undefined;
      if (props.editButtonList) state.editButtonList = props.editButtonList;
      if (props.editSettingList) state.editSettingList = props.editSettingList;
      if (props.commentList?.length) state.commentList = props.commentList;
      if (props.onLoading) state.onLoading = debounce(100, props.onLoading);
    });
  });

  // 绑定配置发生改变时的回调
  solidJs.createEffect(solidJs.on(() => store.option, async option => {
    if (!props.onOptionChange) return;
    await props.onOptionChange(difference(option, defaultOption));
  }, {
    defer: true
  }));
};

const _tmpl$$7 = /*#__PURE__*/web.template(\`<div role="presentation" tabindex="-1">\`);
const MangaStyle = css$1;
solidJs.enableScheduling();
/** 漫画组件 */
const Manga = props => {
  let rootRef;
  solidJs.onMount(() => {
    useInit$1(props, rootRef);
    rootRef.focus();
  });
  solidJs.createEffect(() => {
    if (props.show) rootRef.focus();
  });
  return (() => {
    const _el$ = _tmpl$$7();
    web.addEventListener(_el$, "keydown", stopPropagation, true);
    web.addEventListener(_el$, "keyup", handleKeyUp, true);
    web.addEventListener(_el$, "wheel", handleWheel);
    const _ref$ = rootRef;
    typeof _ref$ === "function" ? web.use(_ref$, _el$) : rootRef = _el$;
    web.insert(_el$, web.createComponent(ComicImgFlow, {}), null);
    web.insert(_el$, web.createComponent(Toolbar, {}), null);
    web.insert(_el$, web.createComponent(Scrollbar, {}), null);
    web.insert(_el$, web.createComponent(TouchArea, {}), null);
    web.insert(_el$, web.createComponent(EndPage, {}), null);
    web.effect(_p$ => {
      const _v$ = modules_c21c94f2$1.root,
        _v$2 = {
          [modules_c21c94f2$1.hidden]: props.show === false,
          [props.class ?? '']: !!props.class,
          ...props.classList
        },
        _v$3 = cssVar();
      _v$ !== _p$._v$ && web.className(_el$, _p$._v$ = _v$);
      _p$._v$2 = web.classList(_el$, _v$2, _p$._v$2);
      _p$._v$3 = web.style(_el$, _v$3, _p$._v$3);
      return _p$;
    }, {
      _v$: undefined,
      _v$2: undefined,
      _v$3: undefined
    });
    return _el$;
  })();
};
web.delegateEvents(["keyup", "keydown"]);

const _tmpl$$6 = /*#__PURE__*/web.template(\`<style type="text/css">\`);
let dom;

/**
 * 显示漫画阅读窗口
 */
const useManga = async initProps => {
  await GM.addStyle(\`
    #comicRead {
      position: fixed;
      z-index: 999999999;
      top: 0;
      left: 0;
      transform: scale(0);

      width: 100vw;
      height: 100vh;

      font-size: 16px;

      opacity: 0;

      transition: opacity 300ms, transform 0s 300ms;
    }

    #comicRead[show] {
      transform: scale(1);
      opacity: 1;
      transition: opacity 300ms, transform 100ms;
    }
  \`);
  const [props, setProps] = store$2.createStore({
    imgList: [],
    show: false,
    ...initProps
  });
  const set = recipe => {
    if (!dom) {
      dom = mountComponents('comicRead', () => [web.createComponent(Manga, props), (() => {
        const _el$ = _tmpl$$6();
        web.insert(_el$, IconButtonStyle);
        return _el$;
      })(), (() => {
        const _el$2 = _tmpl$$6();
        web.insert(_el$2, MangaStyle);
        return _el$2;
      })()]);
    }
    setProps(typeof recipe === 'function' ? store$2.produce(recipe) : recipe);
    if (props.imgList.length && props.show) {
      dom.setAttribute('show', '');
      document.documentElement.style.overflow = 'hidden';
    } else {
      dom.removeAttribute('show');
      document.documentElement.style.overflow = 'unset';
    }
  };

  /** 下载按钮 */
  const DownloadButton = () => {
    const [tip, setTip] = solidJs.createSignal('下载');
    const handleDownload = async () => {
      // eslint-disable-next-line solid/reactivity
      const {
        imgList
      } = props;
      const fileData = {};
      const imgIndexNum = \`\${imgList.length}\`.length;
      for (let i = 0; i < imgList.length; i += 1) {
        setTip(\`下载中 - \${i}/\${imgList.length}\`);
        const index = \`\${\`\${i}\`.padStart(imgIndexNum, '0')}\`;
        const fileExt = imgList[i].split('.').at(-1);
        const fileName = \`\${index}.\${fileExt}\`;
        try {
          // eslint-disable-next-line no-await-in-loop
          const res = await request(imgList[i], {
            responseType: 'arraybuffer'
          });
          fileData[fileName] = new Uint8Array(res.response);
        } catch (error) {
          toast.error(\`\${fileName} 下载失败\`);
          fileData[\`\${index} - 下载失败.\${fileExt}\`] = new Uint8Array();
        }
      }
      setTip('开始打包');
      const zipped = fflate.zipSync(fileData, {
        level: 0,
        comment: window.location.href
      });
      saveAs(new Blob([zipped]), \`\${document.title}.zip\`);
      setTip('下载完成');
      toast.success('下载完成');
    };
    return web.createComponent(IconButton, {
      get tip() {
        return tip();
      },
      onClick: handleDownload,
      get children() {
        return web.createComponent(MdFileDownload, {});
      }
    });
  };
  setProps({
    onExit: () => set({
      show: false
    }),
    editButtonList: list => {
      // 在设置按钮上方放置下载按钮
      list.splice(-1, 0, DownloadButton);
      return [...list,
      // 再在最下面添加分隔栏和退出按钮
      buttonListDivider, () => web.createComponent(IconButton, {
        tip: "\\u9000\\u51FA",
        onClick: () => props.onExit?.(),
        get children() {
          return web.createComponent(MdClose, {});
        }
      })];
    }
  });
  return [set, props];
};

const _tmpl$$5 = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M17.5 4.5c-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5-1.45 0-2.99.22-4.28.79C1.49 5.62 1 6.33 1 7.14v11.28c0 1.3 1.22 2.26 2.48 1.94.98-.25 2.02-.36 3.02-.36 1.56 0 3.22.26 4.56.92.6.3 1.28.3 1.87 0 1.34-.67 3-.92 4.56-.92 1 0 2.04.11 3.02.36 1.26.33 2.48-.63 2.48-1.94V7.14c0-.81-.49-1.52-1.22-1.85-1.28-.57-2.82-.79-4.27-.79zM21 17.23c0 .63-.58 1.09-1.2.98-.75-.14-1.53-.2-2.3-.2-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5.92 0 1.83.09 2.7.28.46.1.8.51.8.98v9.47z"></path><path d="M13.98 11.01c-.32 0-.61-.2-.71-.52-.13-.39.09-.82.48-.94 1.54-.5 3.53-.66 5.36-.45.41.05.71.42.66.83-.05.41-.42.71-.83.66-1.62-.19-3.39-.04-4.73.39-.08.01-.16.03-.23.03zm0 2.66c-.32 0-.61-.2-.71-.52-.13-.39.09-.82.48-.94 1.53-.5 3.53-.66 5.36-.45.41.05.71.42.66.83-.05.41-.42.71-.83.66-1.62-.19-3.39-.04-4.73.39a.97.97 0 0 1-.23.03zm0 2.66c-.32 0-.61-.2-.71-.52-.13-.39.09-.82.48-.94 1.53-.5 3.53-.66 5.36-.45.41.05.71.42.66.83-.05.41-.42.7-.83.66-1.62-.19-3.39-.04-4.73.39a.97.97 0 0 1-.23.03z">\`);
const MdMenuBook = ((props = {}) => (() => {
  const _el$ = _tmpl$$5();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$4 = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M18 15v4c0 .55-.45 1-1 1H5c-.55 0-1-.45-1-1V7c0-.55.45-1 1-1h3.02c.55 0 1-.45 1-1s-.45-1-1-1H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-5c0-.55-.45-1-1-1s-1 .45-1 1zm-2.5 3H6.52c-.42 0-.65-.48-.39-.81l1.74-2.23a.5.5 0 0 1 .78-.01l1.56 1.88 2.35-3.02c.2-.26.6-.26.79.01l2.55 3.39c.25.32.01.79-.4.79zm3.8-9.11c.48-.77.75-1.67.69-2.66-.13-2.15-1.84-3.97-3.97-4.2A4.5 4.5 0 0 0 11 6.5c0 2.49 2.01 4.5 4.49 4.5.88 0 1.7-.26 2.39-.7l2.41 2.41c.39.39 1.03.39 1.42 0 .39-.39.39-1.03 0-1.42l-2.41-2.4zM15.5 9a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z">\`);
const MdImageSearch = ((props = {}) => (() => {
  const _el$ = _tmpl$$4();
  web.spread(_el$, props, true, true);
  return _el$;
})());

const _tmpl$$3 = /*#__PURE__*/web.template(\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M17.5 4.5c-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5-1.45 0-2.99.22-4.28.79C1.49 5.62 1 6.33 1 7.14v11.28c0 1.3 1.22 2.26 2.48 1.94.98-.25 2.02-.36 3.02-.36 1.56 0 3.22.26 4.56.92.6.3 1.28.3 1.87 0 1.34-.67 3-.92 4.56-.92 1 0 2.04.11 3.02.36 1.26.33 2.48-.63 2.48-1.94V7.14c0-.81-.49-1.52-1.22-1.85-1.28-.57-2.82-.79-4.27-.79zM21 17.23c0 .63-.58 1.09-1.2.98-.75-.14-1.53-.2-2.3-.2-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5.92 0 1.83.09 2.7.28.46.1.8.51.8.98v9.47z">\`);
const MdImportContacts = ((props = {}) => (() => {
  const _el$ = _tmpl$$3();
  web.spread(_el$, props, true, true);
  return _el$;
})());

var css = ".index_module_fabRoot__8d304037{font-size:1.1em;transition:transform .2s}.index_module_fabRoot__8d304037[data-show=false]{pointer-events:none}.index_module_fabRoot__8d304037[data-show=false]>button{transform:scale(0)}.index_module_fabRoot__8d304037[data-trans=true]{opacity:.8}.index_module_fabRoot__8d304037[data-trans=true]:focus,.index_module_fabRoot__8d304037[data-trans=true]:hover{opacity:1}.index_module_fab__8d304037{align-items:center;background-color:var(--fab,#607d8b);border:none;border-radius:100%;box-shadow:0 3px 5px -1px #0003,0 6px 10px 0 #00000024,0 1px 18px 0 #0000001f;color:#fff;cursor:pointer;display:flex;font-size:1em;height:3.6em;justify-content:center;width:3.6em}.index_module_fab__8d304037>svg{font-size:1.5em;width:1em}.index_module_fab__8d304037:hover{background-color:var(--fab_hover,#78909c)}.index_module_progress__8d304037{color:#b0bec5;display:inline-block;height:100%;position:absolute;transform:rotate(-90deg);transition:transform .3s cubic-bezier(.4,0,.2,1) 0ms;width:100%}.index_module_progress__8d304037>svg{stroke:currentcolor;stroke-dasharray:290%;stroke-dashoffset:100%;stroke-linecap:round;transition:stroke-dashoffset .3s cubic-bezier(.4,0,.2,1) 0ms}.index_module_progress__8d304037:hover{color:#cfd8dc}.index_module_progress__8d304037[aria-valuenow=\\"1\\"]{opacity:0;transition:opacity .2s .15s}.index_module_popper__8d304037{align-items:center;background-color:#303030;border-radius:.3em;color:#fff;display:none;font-size:.8em;padding:.4em .5em;position:absolute;right:calc(100% + 1.5em);top:50%;transform:translateY(-50%);white-space:nowrap}:is(.index_module_fab__8d304037:hover,.index_module_fabRoot__8d304037[data-focus=true]) .index_module_popper__8d304037{display:flex}.index_module_speedDial__8d304037{align-items:center;bottom:0;display:flex;flex-direction:column-reverse;font-size:1.1em;padding-bottom:120%;pointer-events:none;position:absolute;width:100%;z-index:-1}.index_module_speedDialItem__8d304037{margin:.1em 0;opacity:0;transform:scale(0);transition-delay:var(--hide-delay);transition-duration:.23s;transition-property:transform,opacity}.index_module_speedDial__8d304037:hover,:is(.index_module_fabRoot__8d304037:hover:not([data-show=false]),.index_module_fabRoot__8d304037[data-focus=true])>.index_module_speedDial__8d304037{pointer-events:all}:is(.index_module_fabRoot__8d304037:hover:not([data-show=false]),.index_module_fabRoot__8d304037[data-focus=true])>.index_module_speedDial__8d304037>.index_module_speedDialItem__8d304037{opacity:unset;transform:unset;transition-delay:var(--show-delay)}.index_module_backdrop__8d304037{background:#000;height:100vh;left:0;opacity:0;pointer-events:none;position:fixed;top:0;transition:opacity .5s;width:100vw}.index_module_fabRoot__8d304037[data-focus=true] .index_module_backdrop__8d304037{pointer-events:unset}:is(.index_module_fabRoot__8d304037:hover:not([data-show=false]),.index_module_fabRoot__8d304037[data-focus=true],.index_module_speedDial__8d304037:hover) .index_module_backdrop__8d304037{opacity:.4}";
var modules_c21c94f2 = {"fabRoot":"index_module_fabRoot__8d304037","fab":"index_module_fab__8d304037","progress":"index_module_progress__8d304037","popper":"index_module_popper__8d304037","speedDial":"index_module_speedDial__8d304037","speedDialItem":"index_module_speedDialItem__8d304037","backdrop":"index_module_backdrop__8d304037"};
n(css,{});

const _tmpl$$2 = /*#__PURE__*/web.template(\`<div><div>\`),
  _tmpl$2$1 = /*#__PURE__*/web.template(\`<div><button type="button"><span role="progressbar"><svg viewBox="22 22 44 44"><circle cx="44" cy="44" r="20.2" fill="none" stroke-width="3.6">\`),
  _tmpl$3$1 = /*#__PURE__*/web.template(\`<div>\`);
const FabStyle = css;
/**
 * Fab 按钮
 */
const Fab = _props => {
  const props = solidJs.mergeProps({
    progress: 0,
    initialShow: true,
    autoTrans: false
  }, _props);

  // 上次滚动位置
  let lastY = window.scrollY;
  const [show, setShow] = solidJs.createSignal(props.initialShow);

  // 绑定滚动事件
  const handleScroll = throttle(200, e => {
    // 跳过非用户操作的滚动
    if (e.isTrusted === false) return;
    if (window.scrollY === lastY) return;
    setShow(
    // 滚动到底部时显示
    window.scrollY + window.innerHeight >= document.body.scrollHeight ||
    // 向上滚动时显示，反之隐藏
    window.scrollY - lastY < 0);
    lastY = window.scrollY;
  });
  solidJs.onMount(() => window.addEventListener('scroll', handleScroll));
  solidJs.onCleanup(() => window.removeEventListener('scroll', handleScroll));

  // 将 forceShow 的变化同步到 show 上
  solidJs.createEffect(() => {
    if (props.show) setShow(props.show);
  });
  return (() => {
    const _el$ = _tmpl$2$1(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.firstChild,
      _el$4 = _el$3.firstChild;
    _el$2.$$click = () => props.onClick?.();
    web.insert(_el$2, () => props.children ?? web.createComponent(MdMenuBook, {}), _el$3);
    web.insert(_el$2, (() => {
      const _c$ = web.memo(() => !!props.tip);
      return () => _c$() ? (() => {
        const _el$7 = _tmpl$3$1();
        web.insert(_el$7, () => props.tip);
        web.effect(() => web.className(_el$7, modules_c21c94f2.popper));
        return _el$7;
      })() : null;
    })(), null);
    web.insert(_el$, web.createComponent(solidJs.Show, {
      get when() {
        return props.speedDial?.length;
      },
      get children() {
        const _el$5 = _tmpl$$2(),
          _el$6 = _el$5.firstChild;
        _el$6.$$click = () => props.onBackdropClick?.();
        web.insert(_el$5, web.createComponent(solidJs.For, {
          get each() {
            return props.speedDial;
          },
          children: (SpeedDialItem, i) => (() => {
            const _el$8 = _tmpl$3$1();
            web.insert(_el$8, web.createComponent(SpeedDialItem, {}));
            web.effect(_p$ => {
              const _v$12 = modules_c21c94f2.speedDialItem,
                _v$13 = {
                  '--show-delay': \`\${i() * 30}ms\`,
                  '--hide-delay': \`\${(props.speedDial.length - 1 - i()) * 50}ms\`
                },
                _v$14 = i() * 30;
              _v$12 !== _p$._v$12 && web.className(_el$8, _p$._v$12 = _v$12);
              _p$._v$13 = web.style(_el$8, _v$13, _p$._v$13);
              _v$14 !== _p$._v$14 && web.setAttribute(_el$8, "data-i", _p$._v$14 = _v$14);
              return _p$;
            }, {
              _v$12: undefined,
              _v$13: undefined,
              _v$14: undefined
            });
            return _el$8;
          })()
        }), null);
        web.effect(_p$ => {
          const _v$ = modules_c21c94f2.speedDial,
            _v$2 = modules_c21c94f2.backdrop;
          _v$ !== _p$._v$ && web.className(_el$5, _p$._v$ = _v$);
          _v$2 !== _p$._v$2 && web.className(_el$6, _p$._v$2 = _v$2);
          return _p$;
        }, {
          _v$: undefined,
          _v$2: undefined
        });
        return _el$5;
      }
    }), null);
    web.effect(_p$ => {
      const _v$3 = modules_c21c94f2.fabRoot,
        _v$4 = props.style,
        _v$5 = props.show ?? show(),
        _v$6 = props.autoTrans,
        _v$7 = props.focus,
        _v$8 = modules_c21c94f2.fab,
        _v$9 = modules_c21c94f2.progress,
        _v$10 = props.progress,
        _v$11 = \`\${(1 - props.progress) * 290}%\`;
      _v$3 !== _p$._v$3 && web.className(_el$, _p$._v$3 = _v$3);
      _p$._v$4 = web.style(_el$, _v$4, _p$._v$4);
      _v$5 !== _p$._v$5 && web.setAttribute(_el$, "data-show", _p$._v$5 = _v$5);
      _v$6 !== _p$._v$6 && web.setAttribute(_el$, "data-trans", _p$._v$6 = _v$6);
      _v$7 !== _p$._v$7 && web.setAttribute(_el$, "data-focus", _p$._v$7 = _v$7);
      _v$8 !== _p$._v$8 && web.className(_el$2, _p$._v$8 = _v$8);
      _v$9 !== _p$._v$9 && web.className(_el$3, _p$._v$9 = _v$9);
      _v$10 !== _p$._v$10 && web.setAttribute(_el$3, "aria-valuenow", _p$._v$10 = _v$10);
      _v$11 !== _p$._v$11 && ((_p$._v$11 = _v$11) != null ? _el$4.style.setProperty("stroke-dashoffset", _v$11) : _el$4.style.removeProperty("stroke-dashoffset"));
      return _p$;
    }, {
      _v$3: undefined,
      _v$4: undefined,
      _v$5: undefined,
      _v$6: undefined,
      _v$7: undefined,
      _v$8: undefined,
      _v$9: undefined,
      _v$10: undefined,
      _v$11: undefined
    });
    return _el$;
  })();
};
web.delegateEvents(["click"]);

const _tmpl$$1 = /*#__PURE__*/web.template(\`<style type="text/css">\`);
let mounted = false;
const useFab = async initProps => {
  await GM.addStyle(\`
    #fab {
      --text_bg: transparent;

      position: fixed;
      z-index: 99999999;
      right: 3vw;
      bottom: 6vh;

      font-size: clamp(12px, 1.5vw, 16px);
    }
  \`);
  const [props, setProps] = store$2.createStore({
    ...initProps
  });
  const FabIcon = () => {
    switch (props.progress) {
      case undefined:
        // 没有内容的书
        return MdImportContacts;
      case 1:
      case 2:
        // 有内容的书
        return MdMenuBook;
      default:
        return props.progress > 1 ? MdCloudDownload : MdImageSearch;
    }
  };
  const set = recipe => {
    if (!mounted) {
      mountComponents('fab', () => [web.createComponent(Fab, web.mergeProps(props, {
        get children() {
          return props.children ?? web.createComponent(web.Dynamic, {
            get component() {
              return FabIcon();
            }
          });
        }
      })), (() => {
        const _el$ = _tmpl$$1();
        web.insert(_el$, IconButtonStyle);
        return _el$;
      })(), (() => {
        const _el$2 = _tmpl$$1();
        web.insert(_el$2, FabStyle);
        return _el$2;
      })()]);
      mounted = true;
    }
    if (recipe) setProps(typeof recipe === 'function' ? store$2.produce(recipe) : recipe);
  };
  return set;
};

/**
 * 对修改站点配置的相关方法的封装
 * @param name 站点名
 * @param defaultOptions 默认配置
 */
const useSiteOptions = async (name, defaultOptions = {}) => {
  const _defaultOptions = {
    autoShow: true,
    hiddenFAB: false,
    ...defaultOptions,
    option: {
      ...defaultOption,
      ...defaultOptions?.option
    }
  };
  const rawValue = await GM.getValue(name);
  const options = store$2.createMutable({
    ..._defaultOptions,
    ...rawValue
  });
  const changeCallbackList = [];
  return {
    options,
    /** 该站点是否有储存配置 */
    isRecorded: rawValue !== undefined,
    /**
     * 设置新 Option
     * @param newValue newValue
     * @param trigger 是否触发变更事件
     */
    setOptions: async (newValue, trigger = true) => {
      Object.assign(options, newValue);
      if (trigger) await Promise.all(changeCallbackList.map(callback => callback(options)));

      // 只保存和默认设置不同的部分
      return GM.setValue(name, difference(options, _defaultOptions));
    },
    /**
     * 监听配置变更事件
     */
    onOptionChange: callback => {
      changeCallbackList.push(callback);
    }
  };
};

const _tmpl$ = /*#__PURE__*/web.template(\`<h2>🥳 ComicRead 已更新到 v\`),
  _tmpl$2 = /*#__PURE__*/web.template(\`<div>\`),
  _tmpl$3 = /*#__PURE__*/web.template(\`<h3>\`),
  _tmpl$4 = /*#__PURE__*/web.template(\`<ul><li>\`);

/**
 * 对所有支持站点页面的初始化操作的封装
 * @param name 站点名
 * @param defaultOptions 默认配置
 */
const useInit = async (name, defaultOptions = {}) => {
  const {
    options,
    setOptions,
    onOptionChange
  } = await useSiteOptions(name, defaultOptions);
  const setFab = await useFab({
    tip: '阅读模式',
    speedDial: useSpeedDial(options, setOptions)
  });
  const [setManga, mangaProps] = await useManga({
    imgList: [],
    option: options.option,
    onOptionChange: option => setOptions({
      ...options,
      option
    })
  });

  // 检查脚本的版本变化，提示用户
  const version = await GM.getValue('Version');
  if (version && version !== GM.info.script.version) {
    const latestChange =\`
## [6.4.0](https://github.com/hymbz/ComicReadScript/compare/v6.3.0...v6.4.0) (2023-07-11)


### Features

* :sparkles: 在结束页增加显示章节评论 ([fafb36f](https://github.com/hymbz/ComicReadScript/commit/fafb36f30d5dbba437b6212bdffcfdd20c81cd2c))


### Bug Fixes

* :bug: 修复 welovemanga 改版导致的 bug ([a1298db](https://github.com/hymbz/ComicReadScript/commit/a1298db8e8b04b84a0e41bd27da3e20a0ab8d6b2))
* :bug: 修复禁漫天堂在某些旧版本浏览器上无法正常运行的 bug ([485734c](https://github.com/hymbz/ComicReadScript/commit/485734c710ddd3aa9c7cd4026ab52db9ff3d7423))


### Performance Improvements

* :zap: 增加用于显示图片加载状态的图标 ([63acbfe](https://github.com/hymbz/ComicReadScript/commit/63acbfec664699f384bfe41869e9300b38203f08))
* :zap: 缩小页面中间用于点击显示侧边栏的判定范围，减少误触 ([1bb4e10](https://github.com/hymbz/ComicReadScript/commit/1bb4e10fa17b09a8afdb64adc58d1a19e667031a))
\`;
    toast(() => [(() => {
      const _el$ = _tmpl$();
        _el$.firstChild;
      web.insert(_el$, () => GM.info.script.version, null);
      return _el$;
    })(), (() => {
      const _el$3 = _tmpl$2();
      web.insert(_el$3, web.createComponent(solidJs.For, {
        get each() {
          return latestChange.match(/^### [^[].+?$|^\\* .+?$/gm);
        },
        children: mdText => {
          switch (mdText[0]) {
            case '#':
              return (() => {
                const _el$4 = _tmpl$3();
                web.insert(_el$4, () => mdText.replace('### ', ''));
                return _el$4;
              })();
            case '*':
              return (() => {
                const _el$5 = _tmpl$4(),
                  _el$6 = _el$5.firstChild;
                web.insert(_el$6, () => mdText.replace(/^\\* /, '').replace(/^:\\w+?: /, '').replace(/(?<=^.*)\\(\\[\\w+\\]\\(.+?\\)\\)/, ''));
                return _el$5;
              })();
            default:
              return null;
          }
        }
      }));
      return _el$3;
    })()], {
      id: 'Version Tip',
      type: 'custom',
      duration: Infinity,
      // 手动点击关掉通知后才不会再次弹出
      onDismiss: () => GM.setValue('Version', GM.info.script.version)
    });

    // 监听储存的版本数据的变动，如果和当前版本一致就关掉弹窗
    // 防止在更新版本后一次性打开多个页面，不得不一个一个关过去
    const listenerId = await GM.addValueChangeListener('Version', async (_, __, newVersion) => {
      if (newVersion !== GM.info.script.version) return;
      toast.dismiss('Version Tip');
      await GM.removeValueChangeListener(listenerId);
    });
  }
  let menuId;
  /** 更新显示/隐藏阅读模式按钮的菜单项 */
  const updateHideFabMenu = async () => {
    await GM.unregisterMenuCommand(menuId);
    menuId = await GM.registerMenuCommand(\`\${options.hiddenFAB ? '显示' : '隐藏'}阅读模式按钮\`, async () => {
      await setOptions({
        ...options,
        hiddenFAB: !options.hiddenFAB
      });
      setFab(state => {
        state.show = !options.hiddenFAB && undefined;
      });
      await updateHideFabMenu();
    });
  };
  return {
    options,
    setOptions,
    onOptionChange,
    setFab,
    setManga,
    /**
     * 完成所有支持站点的初始化
     * @param getImgList 返回图片列表的函数
     * @param onLoading 图片加载状态发生变化时触发的回调
     * @returns 自动加载图片并进入阅读模式的函数
     */
    init: (getImgList, onLoading = () => {}) => {
      /** 是否正在加载图片中 */
      let loading = false;

      /** 进入阅读模式 */
      const showComic = async (show = options.autoShow) => {
        if (loading) {
          toast.warn('加载图片中，请稍候', {
            duration: 1500,
            id: '加载图片中，请稍候'
          });
          return;
        }
        const {
          imgList
        } = mangaProps;
        if (!imgList.length) {
          loading = true;
          try {
            setFab({
              progress: 0,
              show: true
            });
            const initImgList = await getImgList();
            if (initImgList.length === 0) throw new Error('获取漫画图片失败');
            setFab({
              progress: 1,
              tip: '阅读模式',
              show: !options.hiddenFAB && undefined
            });
            setManga(state => {
              state.imgList = initImgList;
              state.show = show;

              // 监听图片加载状态，将进度显示到 Fab 上
              state.onLoading = (img, list) => {
                const loadNum = list.filter(image => image.loadType === 'loaded').length;
                onLoading(loadNum, list.length, img);

                /** 图片加载进度 */
                const progress = 1 + loadNum / list.length;
                if (progress !== 2) {
                  setFab({
                    progress,
                    tip: \`图片加载中 - \${loadNum}/\${list.length}\`
                  });
                } else {
                  // 图片全部加载完成后恢复 Fab 状态
                  setFab({
                    progress,
                    tip: '阅读模式',
                    show: undefined
                  });
                }
              };
              return state;
            });
          } catch (e) {
            console.error(e);
            toast.error(e.message);
            setFab({
              progress: undefined
            });
          } finally {
            loading = false;
          }
        } else {
          setManga({
            show: true
          });
        }
      };
      setFab({
        onClick: () => showComic(true)
      });
      if (options.autoShow) showComic();
      GM.registerMenuCommand('进入漫画阅读模式', () => showComic(true));
      updateHideFabMenu();
      return () => showComic(true);
    }
  };
};

exports.autoUpdate = autoUpdate;
exports.dataToParams = dataToParams;
exports.difference = difference;
exports.insertNode = insertNode;
exports.isEqualArray = isEqualArray;
exports.linstenKeyup = linstenKeyup;
exports.needDarkMode = needDarkMode;
exports.plimit = plimit;
exports.querySelector = querySelector;
exports.querySelectorAll = querySelectorAll;
exports.querySelectorClick = querySelectorClick;
exports.request = request;
exports.saveAs = saveAs;
exports.scrollIntoView = scrollIntoView;
exports.sleep = sleep;
exports.toast = toast;
exports.useCache = useCache;
exports.useFab = useFab;
exports.useInit = useInit;
exports.useManga = useManga;
exports.useSiteOptions = useSiteOptions;
exports.useSpeedDial = useSpeedDial;
exports.wait = wait;
exports.waitDom = waitDom;
exports.waitImgLoad = waitImgLoad;
`
  if (!code) throw new Error(`外部模块 ${name} 未在 @Resource 中声明`);

  // 通过提供 cjs 环境的变量来兼容 umd 模块加载器
  // 将模块导出变量放到 crsLib 对象里，防止污染全局作用域和网站自身的模块产生冲突
  const runCode = `
      window.crsLib['${name}'] = {};
      ${''}
      (function (process, require, exports, module, ${gmApiList.join(', ')}) {
        ${code}
      })(
        window.crsLib.process,
        window.crsLib.require,
        window.crsLib['${name}'],
        {
          set exports(value) {
            window.crsLib['${name}'] = value;
          },
          get exports() {
            return window.crsLib['${name}'];
          },
        },
        ${gmApiList.map(apiName => `window.crsLib.${apiName}`).join(', ')}
      );
      ${''}
    `;

  // 因为在一些网站比如推特会触发CSP，所以不能使用 eval 来执行
  GM_addElement('script', {
    textContent: runCode
  });
};
/**
 * 创建一个外部模块的 Proxy，等到读取对象属性时才加载模块
 * @param name 外部模块名
 */
const require = name => {
  // 为了应对 rollup 打包时的工具函数 _interopNamespace，要给外部库加上 __esModule 标志
  const __esModule = {
    value: true
  };
  const selfLibProxy = () => {};
  selfLibProxy.default = {};
  const selfDefault = new Proxy(selfLibProxy, {
    get(_, prop) {
      if (prop === '__esModule') return __esModule;
      if (prop === 'default') return selfDefault;
      if (!unsafeWindow.crsLib[name]) selfImportSync(name);
      const module = unsafeWindow.crsLib[name];
      return module.default?.[prop] ?? module?.[prop];
    },
    apply(_, __, args) {
      if (!unsafeWindow.crsLib[name]) selfImportSync(name);
      const module = unsafeWindow.crsLib[name];
      const ModuleFunc = typeof module.default === 'function' ? module.default : module;
      return ModuleFunc(...args);
    },
    construct(_, args) {
      if (!unsafeWindow.crsLib[name]) selfImportSync(name);
      const module = unsafeWindow.crsLib[name];
      const ModuleFunc = typeof module.default === 'function' ? module.default : module;
      return new ModuleFunc(...args);
    }
  });
  return selfDefault;
};
unsafeWindow.crsLib.require = require;


// 匹配站点
switch (window.location.hostname) {
  // #百合会——「记录阅读历史，体验优化」
  case 'bbs.yamibo.com':
    {
const web = require('solid-js/web');
const main = require('main');

const _tmpl$ = /*#__PURE__*/web.template(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M19.5 12c0-.23-.01-.45-.03-.68l1.86-1.41c.4-.3.51-.86.26-1.3l-1.87-3.23a.987.987 0 0 0-1.25-.42l-2.15.91c-.37-.26-.76-.49-1.17-.68l-.29-2.31c-.06-.5-.49-.88-.99-.88h-3.73c-.51 0-.94.38-1 .88l-.29 2.31c-.41.19-.8.42-1.17.68l-2.15-.91c-.46-.2-1-.02-1.25.42L2.41 8.62c-.25.44-.14.99.26 1.3l1.86 1.41a7.343 7.343 0 0 0 0 1.35l-1.86 1.41c-.4.3-.51.86-.26 1.3l1.87 3.23c.25.44.79.62 1.25.42l2.15-.91c.37.26.76.49 1.17.68l.29 2.31c.06.5.49.88.99.88h3.73c.5 0 .93-.38.99-.88l.29-2.31c.41-.19.8-.42 1.17-.68l2.15.91c.46.2 1 .02 1.25-.42l1.87-3.23c.25-.44.14-.99-.26-1.3l-1.86-1.41c.03-.23.04-.45.04-.68zm-7.46 3.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z">`);
const MdSettings = ((props = {}) => (() => {
  const _el$ = _tmpl$();
  web.spread(_el$, props, true, true);
  return _el$;
})());

(async () => {
  const {
    options,
    setFab,
    setManga,
    init
  } = await main.useInit('yamibo', {
    记录阅读进度: true,
    关闭快捷导航的跳转: true,
    修正点击页数时的跳转判定: true,
    固定导航条: true,
    自动签到: true
  });
  await GM.addStyle(`#fab { --fab: #6E2B19; --fab_hover: #A15640; }

    ${options.固定导航条 ? '.header-stackup { position: fixed !important }' : ''}

    .historyTag {
      white-space: nowrap;

      border: 2px solid #6e2b19;
    }

    a.historyTag {
      font-weight: bold;

      margin-left: 1em;
      padding: 1px 4px;

      color: #6e2b19;
      border-radius: 4px 0 0 4px;
    }
    a.historyTag:last-child {
      border-radius: 4px;
    }

    div.historyTag {
      display: initial;

      margin-left: -.4em;
      padding: 1px;

      color: RGB(255, 237, 187);
      border-radius: 0 4px 4px 0;
      background-color: #6e2b19;
    }

    #threadlisttableid tbody:nth-child(2n) div.historyTag {
      color: RGB(255, 246, 215);
    }

    /* 将「回复/查看」列加宽一点 */
    .tl .num {
      width: 80px !important;
    }
    `);

  // 自动签到
  if (options.自动签到) (async () => {
    const todayString = new Date().toLocaleDateString('zh-CN');
    // 判断当前日期与上次成功签到日期是否相同
    if (todayString === localStorage.getItem('signDate')) return;
    const sign = main.querySelector('#scbar_form > input[name="formhash"]')?.value;
    if (!sign) return;
    try {
      const res = await fetch(`plugin.php?id=zqlj_sign&sign=${sign}`);
      const body = await res.text();
      if (!/成功！|打过卡/.test(body)) throw new Error('自动签到失败');
      main.toast.success('自动签到成功');
      localStorage.setItem('signDate', todayString);
    } catch (e) {
      console.error(e);
      main.toast.error('自动签到失败');
    }
  })();
  if (options.关闭快捷导航的跳转)
    // eslint-disable-next-line no-script-url
    main.querySelector('#qmenu a')?.setAttribute('href', 'javascript:;');

  // 增加菜单项，以便在其他板块用于调整其他功能的开关
  await GM.registerMenuCommand('显示设置菜单', () => setFab({
    show: true,
    focus: true,
    tip: '设置',
    children: web.createComponent(MdSettings, {}),
    onBackdropClick: () => setFab({
      show: false,
      focus: false
    })
  }));

  // 判断当前页是帖子
  if (/thread(-\d+){3}|mod=viewthread/.test(document.URL)) {
    // 修复微博图床的链接
    main.querySelectorAll('img[file*="sinaimg.cn"]').forEach(e => {
      e.setAttribute('referrerpolicy', 'no-referrer');
    });
    if (
    // 限定板块启用
    (unsafeWindow.fid === 30 || unsafeWindow.fid === 37) &&
    // 只在第一页生效
    !main.querySelector('.pg > .prev')) {
      let imgList = main.querySelectorAll('.t_fsz img');
      const updateImgList = () => {
        let i = imgList.length;
        while (i--) {
          const img = imgList[i];
          const file = img.getAttribute('file');
          if (file && img.src !== file) {
            img.setAttribute('src', file);
            img.setAttribute('lazyloaded', 'true');
          }

          // 测试例子：https://bbs.yamibo.com/thread-502399-1-1.html

          // 删掉表情和小图
          if (img.src.includes('static/image') || img.complete && img.naturalHeight && img.naturalWidth && img.naturalHeight < 500 && img.naturalWidth < 500) imgList.splice(i, 1);
        }
        return imgList.map(img => img.src);
      };
      setManga({
        // 在图片加载完成后再检查一遍有没有小图，有就删掉
        onLoading: img => {
          // 跳过符合标准的
          if (img.height && img.width && img.height > 500 && img.width > 500) return;
          const delImgIndex = imgList.findIndex(image => image.src === img.src);
          if (delImgIndex !== -1) imgList.splice(delImgIndex, 1);
          setManga({
            imgList: imgList.map(image => image.src)
          });
        },
        onExit: isEnd => {
          if (isEnd) main.scrollIntoView('.psth, .rate, #postlist > div:nth-of-type(2)');
          setManga({
            show: false
          });
        }
      });
      updateImgList();
      const showComic = init(() => imgList.map(img => img.src));
      setFab({
        progress: 1,
        tip: '阅读模式'
      });

      // 虽然有 Fab 了不需要这个按钮，但都点习惯了没有还挺别扭的（
      main.insertNode(main.querySelector('div.pti > div.authi'), '<span class="pipe show">|</span><a id="comicReadMode" class="show" href="javascript:;">漫画阅读</a>');
      document.getElementById('comicReadMode')?.addEventListener('click', showComic);

      // 如果帖子内有设置目录
      if (main.querySelector('#threadindex')) {
        let id;
        main.querySelectorAll('#threadindex li').forEach(dom => {
          dom.addEventListener('click', () => {
            if (id) return;
            id = window.setInterval(() => {
              imgList = main.querySelectorAll('.t_fsz img');
              if (!imgList.length || !updateImgList().length) {
                setFab({
                  progress: undefined
                });
                return;
              }
              setManga({
                imgList: updateImgList(),
                show: options.autoShow ?? undefined
              });
              setFab({
                progress: 1
              });
              window.clearInterval(id);
            }, 100);
          });
        });
      }
      const tagDom = main.querySelector('.ptg.mbm.mtn > a');
      // 通过标签确定上/下一话
      if (tagDom) {
        const tagId = tagDom.href.split('id=')[1];
        const reg = /(?<=<th>\s<a href="thread-)\d+(?=-)/g;
        let threadList = [];

        // 先获取包含当前帖后一话在内的同一标签下的帖子id列表，再根据结果设定上/下一话
        const setPrevNext = async (pageNum = 1) => {
          const res = await main.request(`https://bbs.yamibo.com/misc.php?mod=tag&id=${tagId}&type=thread&page=${pageNum}`);
          const newList = [...res.responseText.matchAll(reg)].map(([tid]) => +tid);
          threadList = threadList.concat(newList);
          const index = threadList.findIndex(tid => tid === unsafeWindow.tid);
          if (newList.length && (index === -1 || !threadList[index + 1])) return setPrevNext(pageNum + 1);
          return setManga({
            onPrev: threadList[index - 1] ? () => {
              window.location.assign(`thread-${threadList[index - 1]}-1-1.html`);
            } : undefined,
            onNext: threadList[index + 1] ? () => {
              window.location.assign(`thread-${threadList[index + 1]}-1-1.html`);
            } : undefined
          });
        };
        setTimeout(setPrevNext);
      }
    }
    if (options.记录阅读进度) {
      const {
        tid
      } = unsafeWindow;
      const res = await main.request(`https://bbs.yamibo.com/api/mobile/index.php?module=viewthread&tid=${tid}`, {
        errorText: '获取帖子回复数时出错'
      });
      /** 回复数 */
      const allReplies = parseInt(JSON.parse(res.responseText)?.Variables?.thread?.allreplies, 10);
      if (!allReplies) return;

      /** 当前所在页数 */
      const currentPageNum = parseInt(main.querySelector('#pgt strong')?.innerHTML ?? '1', 10);
      const cache = main.useCache(db => {
        db.createObjectStore('history', {
          keyPath: 'tid'
        });
      });
      const data = await cache.get('history', `${tid}`);
      // 如果是在翻阅之前页数的内容，则跳过不处理
      if (data && currentPageNum < data.lastPageNum) return;

      // 如果有上次阅读进度的数据，则监视上次的进度之后的楼层，否则监视所有
      /** 监视楼层列表 */
      const watchFloorList = main.querySelectorAll(data?.lastAnchor && currentPageNum === data.lastPageNum ? `#${data.lastAnchor} ~ div` : '#postlist > div');
      if (!watchFloorList.length) return;
      let id = 0;
      /** 储存数据，但是防抖 */
      const debounceSave = saveData => {
        if (id) window.clearTimeout(id);
        id = window.setTimeout(async () => {
          id = 0;
          await cache.set('history', saveData);
        }, 200);
      };

      // 在指定楼层被显示出来后重新存储进度数据
      const observer = new IntersectionObserver(entries => {
        // 找到触发楼层
        const trigger = entries.find(e => e.isIntersecting);
        if (!trigger) return;

        // 取消触发楼层上面楼层的监视
        const triggerIndex = watchFloorList.findIndex(e => e === trigger.target);
        if (triggerIndex === -1) return;
        watchFloorList.splice(0, triggerIndex + 1).forEach(e => observer.unobserve(e));

        // 储存数据
        debounceSave({
          tid: `${tid}`,
          lastPageNum: currentPageNum,
          lastReplies: allReplies,
          lastAnchor: trigger.target.id
        });
      }, {
        threshold: 1.0
      });
      watchFloorList.forEach(e => observer.observe(e));
    }
    return;
  }

  // 判断当前页是板块
  if (/forum(-\d+){2}|mod=forumdisplay/.test(document.URL)) {
    if (options.修正点击页数时的跳转判定) {
      const List = main.querySelectorAll('.tps>a');
      let i = List.length;
      while (i--) List[i].setAttribute('onclick', 'atarget(this)');
    }
    if (options.记录阅读进度) {
      const cache = main.useCache(db => {
        db.createObjectStore('history', {
          keyPath: 'tid'
        });
      });

      // 更新页面上的阅读进度提示
      const updateHistoryTag = () => {
        // 先删除所有进度提示
        main.querySelectorAll('.historyTag').forEach(e => e.remove());

        // 再添加上进度提示
        return Promise.all(main.querySelectorAll('tbody[id^=normalthread]').map(async e => {
          const tid = e.id.split('_')[1];
          const data = await cache.get('history', tid);
          if (!data) return;
          const lastReplies = +e.querySelector('.num a').innerHTML - data.lastReplies;
          main.insertNode(e.getElementsByTagName('th')[0], `
                <a
                  class="historyTag"
                  onclick="atarget(this)"
                  href="thread-${tid}-${data.lastPageNum}-1.html#${data.lastAnchor}"
                >
                  回第${data.lastPageNum}页
                </a>
                ${lastReplies > 0 ? `<div class="historyTag">+${lastReplies}</div>` : ''}
              `);
        }));
      };
      updateHistoryTag();

      // 切换回当前页时更新提示
      document.addEventListener('visibilitychange', updateHistoryTag);
      // 点击下一页后更新提示
      main.querySelector('#autopbn').addEventListener('click', updateHistoryTag);
    }
  }
})();

      break;
    }
  // #百合会新站
  case 'www.yamibo.com':
    {
const main = require('main');

(async () => {
  // 只在漫画页内运行
  if (!window.location.pathname.includes('/manga/view-chapter')) return;
  const {
    setManga,
    init
  } = await main.useInit('newYamibo');
  setManga({
    onNext: main.querySelectorClick('#btnNext'),
    onPrev: main.querySelectorClick('#btnPrev'),
    onExit: isEnd => {
      if (isEnd) main.scrollIntoView('#w1');
      setManga({
        show: false
      });
    }
  });
  const id = new URLSearchParams(window.location.search).get('id');
  /** 总页数 */
  const totalPageNum = +main.querySelector('section div:first-of-type div:last-of-type').innerHTML.split('：')[1];

  /** 获取指定页数的图片 url */
  const getImg = async (i = 1) => {
    const res = await main.request(`https://www.yamibo.com/manga/view-chapter?id=${id}&page=${i}`);
    return res.responseText.match(/(?<=<img id=['"]imgPic['"].+?src=['"]).+?(?=['"])/)[0].replaceAll('&amp;', '&');
  };
  init(() => main.plimit(Object.keys([...new Array(totalPageNum)]).map(i => () => getImg(+i + 1))));
})();

      break;
    }

  // #动漫之家——「解锁隐藏漫画」
  case 'manhua.idmzj.com':
  case 'manhua.dmzj.com':
    {
const web = require('solid-js/web');
const solidJs = require('solid-js');
const main = require('main');
const store = require('solid-js/store');
const dmzjDecrypt = require('dmzjDecrypt');

/** 根据漫画 id 和章节 id 获取章节数据 */
const getChapterInfo = async (comicId, chapterId) => {
  const res = await main.request(`https://m.dmzj.com/chapinfo/${comicId}/${chapterId}.html`, {
    errorText: '获取章节数据失败'
  });
  return JSON.parse(res.responseText);
};

/** 根据漫画 id 和章节 id 获取章节评论 */
const getViewpoint = async (comicId, chapterId) => {
  try {
    const res = await main.request(`https://manhua.dmzj.com/tpi/api/viewpoint/getViewpoint?type=0&type_id=${comicId}&chapter_id=${chapterId}&more=1`, {
      errorText: '获取章节评论失败'
    });
    return JSON.parse(res.responseText).data.list.map(({
      title,
      num
    }) => `${title} [+${num}]`);
  } catch (_) {
    return [];
  }
};
const getComicDetail_base = async comicId => {
  const res = await main.request(`https://api.dmzj.com/dynamic/comicinfo/${comicId}.json`);
  const {
    info: {
      last_updatetime,
      title
    },
    list
  } = JSON.parse(res.responseText).data;
  return {
    title,
    last_updatetime,
    last_update_chapter_id: null,
    chapters: [{
      name: '连载',
      list: list.map(({
        id,
        chapter_name,
        updatetime
      }) => ({
        id,
        title: chapter_name,
        updatetime
      }))
    }]
  };
};
const getComicDetail_v4Api = async comicId => {
  const res = await main.request(`https://v4api.idmzj.com/comic/detail/${comicId}?uid=2665531&disable_level=1`);
  const {
    comicInfo: {
      last_update_chapter_id,
      last_updatetime,
      chapters,
      title
    }
  } = dmzjDecrypt(res.responseText);
  Object.values(chapters).forEach(chapter => {
    chapter.data.sort((a, b) => a.chapter_order - b.chapter_order);
  });
  return {
    title,
    last_updatetime,
    last_update_chapter_id,
    chapters: chapters.map(({
      data,
      title: name
    }) => ({
      name,
      list: data.map(({
        chapter_id,
        chapter_title,
        updatetime
      }) => ({
        id: chapter_id,
        title: chapter_title,
        updatetime
      }))
    }))
  };
};
const getComicDetail_traversal = async (comicId, draftData) => {
  let nextId = draftData.last_update_chapter_id;
  if (!nextId) {
    console.warn('last_update_chapter_id 为空，无法通过遍历获取章节');
    return;
  }
  draftData.chapters[0] = {
    name: '连载',
    list: []
  };
  main.toast.warn('正在通过遍历获取所有章节，耗时可能较长', {
    id: 'traversalTip',
    duration: Infinity
  });
  while (nextId) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const {
        chapter_name,
        updatetime,
        prev_chap_id
      } = await getChapterInfo(comicId, nextId);
      draftData.chapters[0].list.push({
        id: nextId,
        title: chapter_name,
        updatetime
      });
      nextId = prev_chap_id;
    } catch (_) {
      nextId = undefined;
    }
  }
  main.toast.dismiss('traversalTip');
};

/** 返回可变 store 类型的漫画数据 */
const useComicDetail = comicId => {
  const data = store.createMutable({});
  const apiFn = [getComicDetail_v4Api, getComicDetail_base, getComicDetail_traversal];
  solidJs.onMount(async () => {
    for (let i = 0; i < apiFn.length; i++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        Object.assign(data, await apiFn[i](comicId, data));
        if (data.chapters?.some(chapter => chapter.list.length)) return;
      } catch (_) {}
    }
    main.toast.error('漫画数据获取失败', {
      duration: Infinity
    });
    console.error('漫画数据获取失败');
  });
  return data;
};

/** 根据漫画拼音简称找到对应的 id */
const getComicId = async py => {
  const res = await main.request(`https://manhua.dmzj.com/api/v1/comic2/comic/detail?${new URLSearchParams({
    channel: 'pc',
    app_name: 'comic',
    version: '1.0.0',
    timestamp: `${Date.now()}`,
    uid: '',
    comic_py: py
  }).toString()}`);
  return JSON.parse(res.responseText).data?.comicInfo?.id;
};

const _tmpl$ = /*#__PURE__*/web.template(`<div class="photo_part"><div class="h2_title2"><span class="h2_icon h2_icon22"></span><h2> `),
  _tmpl$2 = /*#__PURE__*/web.template(`<div class="cartoon_online_border_other"><ul></ul><div class="clearfix">`),
  _tmpl$3 = /*#__PURE__*/web.template(`<li><a target="_blank">`);
(async () => {
  // 通过 rss 链接，在作者作品页里添加上隐藏漫画的链接
  if (window.location.pathname.includes('/tags/')) {
    const res = await main.request(main.querySelector('a.rss').href, {
      errorText: '获取作者作品失败'
    });

    // 页面上原有的漫画标题
    const titleList = main.querySelectorAll('#hothit p.t').map(e => e.innerText.replace('[完]', ''));
    main.insertNode(document.getElementById('hothit'), res.responseText.split('item').filter((_, i) => i % 2).map(item => {
      const newComicUrl = /manhua.dmzj.com\/(.+?)\?from=rssReader/.exec(item)[1];
      return {
        newComicUrl,
        comicUrl: newComicUrl.split('/')[0],
        title: /title><!\[CDATA\[(.+?)]]/.exec(item)[1],
        imgUrl: /<img src='(.+?)'/.exec(item)[1],
        newComicTitle: /title='(.+?)'/.exec(item)[1]
      };
    }).filter(({
      title
    }) => !titleList.includes(title)).map(data => `
            <div class="pic">
              <a href="/${data.comicUrl}/" target="_blank">
              <img src="${data.imgUrl}" alt="${data.title}" title="" style="">
              <p class="t">【*隐藏*】${data.title}</p></a>
              <p class="d">最新：<a href="/${data.newComicUrl}" target="_blank">${data.newComicTitle}</a></p>
            </div>
          `).join(''));
    return;
  }

  // eslint-disable-next-line prefer-const
  let [, comicPy, chapterId] = window.location.pathname.split(/\/|\./);
  if (!comicPy) {
    main.toast.error('漫画数据获取失败', {
      duration: Infinity
    });
    throw new Error('获取漫画拼音简称失败');
  }
  const comicId = await getComicId(comicPy);

  // 判断当前页是漫画详情页
  if (/^\/[^/]*?\/?$/.test(window.location.pathname)) {
    await main.waitDom('.newpl_ans');
    // 判断漫画被禁
    // 测试例子：https://manhua.dmzj.com/yanquan/
    if (main.querySelector('.cartoon_online_border > img')) {
      main.querySelector('.cartoon_online_border').innerHTML = '获取漫画数据中';

      // 删掉原有的章节 dom
      main.querySelectorAll('.odd_anim_title ~ *').forEach(e => e.parentNode?.removeChild(e));
      web.render(() => {
        const comicDetail = useComicDetail(comicId);
        return web.createComponent(solidJs.For, {
          get each() {
            return comicDetail.chapters;
          },
          children: ({
            name,
            list
          }) => [(() => {
            const _el$ = _tmpl$(),
              _el$2 = _el$.firstChild,
              _el$3 = _el$2.firstChild,
              _el$4 = _el$3.nextSibling,
              _el$5 = _el$4.firstChild;
            web.insert(_el$4, () => comicDetail.title, _el$5);
            web.insert(_el$4, name === '连载' ? '在线漫画全集' : `漫画其它版本：${name}`, null);
            return _el$;
          })(), (() => {
            const _el$6 = _tmpl$2(),
              _el$7 = _el$6.firstChild;
            _el$6.style.setProperty("margin-top", "-8px");
            web.insert(_el$7, web.createComponent(solidJs.For, {
              each: list,
              children: ({
                title,
                id,
                updatetime
              }) => (() => {
                const _el$8 = _tmpl$3(),
                  _el$9 = _el$8.firstChild;
                web.setAttribute(_el$9, "title", title);
                web.setAttribute(_el$9, "href", `https://m.dmzj.com/view/${comicId}/${id}.html`);
                web.insert(_el$9, title);
                web.effect(() => _el$9.classList.toggle("color_red", !!(updatetime === comicDetail.last_updatetime)));
                return _el$8;
              })()
            }));
            return _el$6;
          })()]
        });
      }, main.querySelector('.middleright_mr'));
    }
    return;
  }

  // 跳过漫画页外的其他页面
  if (!/^\/.*?\/\d+\.shtml$/.test(window.location.pathname)) return;

  // 处理当前页是漫画页的情况
  const {
    setManga,
    init
  } = await main.useInit('dmzj');
  setManga({
    onExit: isEnd => {
      if (isEnd) setTimeout(() => main.scrollIntoView('#hd'));
      setManga({
        show: false
      });
    }
  });

  /** 切换至上下滚动阅读 */
  const waitSwitchScroll = async () => {
    await main.waitDom('#qiehuan_txt');
    await main.wait(() => {
      const dom = main.querySelector('#qiehuan_txt');
      if (!dom) return;
      if (dom.innerText !== '切换到上下滚动阅读') return true;
      dom.click();
    });
  };
  const getImgList = async () => {
    console.log('getImgList');
    await waitSwitchScroll();
    await main.waitDom('.comic_wraCon img');
    return main.querySelectorAll('.comic_wraCon img').map(e => e.src);
  };

  /** 当前是否跳到了上/下一话 */
  let isJumped = '';
  // 通过监听点击上/下一话的按钮来判断当前是否切换了章节
  // 直接绑定在点击按钮上会失效，所以只能全局监听
  window.addEventListener('click', e => {
    if (!e.target) return;
    const target = e.target;
    if (target.id === 'prev_chapter' || target.className === 'btm_chapter_btn fl') {
      isJumped = 'prev';
    } else if (target.id === 'next_chapter' || target.className === 'btm_chapter_btn fr') {
      isJumped = 'next';
    }
  });
  const checkButton = selector => {
    const dom = main.querySelector(selector);
    if (dom && dom.innerText) return () => dom.click();
  };
  const updateChapterJump = (num = 0) => {
    if (num >= 10) return;
    setManga({
      onNext: checkButton('#next_chapter'),
      onPrev: checkButton('#prev_chapter')
    });
    // 因为上/下一话的按钮不会立即出现，所以加一个延时
    window.setTimeout(updateChapterJump, num * 200, num + 1);
  };

  /** 章节信息 */
  let chapterInfo = await getChapterInfo(comicId, chapterId);
  let imgList = [];
  main.autoUpdate(async () => {
    let newImgList = await getImgList();
    if (isJumped) {
      // 如果当前跳到了上/下一话，就不断循环等待检测到新的图片列表
      while (isJumped && main.isEqualArray(newImgList, imgList)) newImgList = await getImgList();

      // 更新切换章节后的 chapterId
      // TODO: 当前刚改版后的 dmzj 切换章节时 url 不会跟着改变，导致必须这样变扭的获取新章节 id
      // 但是，这样会导致切换章节后刷新会跳回最开始的页面，之后肯定会改
      // 等 dmzj 改完后这里要改成直接通过 url 来获取 id
      //
      // 包括判断当前是否跳到了上/下一话，也要改成通过监听 url 的改变来实现
      if (isJumped === 'next' && chapterInfo.next_chap_id) chapterId = `${chapterInfo.next_chap_id}`;else if (isJumped === 'prev' && chapterInfo.prev_chap_id) chapterId = `${chapterInfo.prev_chap_id}`;
      chapterInfo = await getChapterInfo(comicId, chapterId);
      isJumped = '';
    } else if (main.isEqualArray(newImgList, imgList)) return;
    imgList = newImgList;
    // 先将 imgList 清空以便 activePageIndex 归零
    setManga({
      imgList: []
    });
    init(() => imgList);
    updateChapterJump();
    const commentList = await getViewpoint(comicId, chapterId);
    setManga({
      commentList
    });
  });
})();

      break;
    }
  case 'm.idmzj.com':
  case 'm.dmzj.com':
    {
const main = require('main');
const dmzjDecrypt = require('dmzjDecrypt');

/** 根据漫画 id 和章节 id 获取章节数据 */
const getChapterInfo = async (comicId, chapterId) => {
  const res = await main.request(`https://m.dmzj.com/chapinfo/${comicId}/${chapterId}.html`, {
    errorText: '获取章节数据失败'
  });
  return JSON.parse(res.responseText);
};

(async () => {
  const {
    options,
    setManga,
    init
  } = await main.useInit('dmzj');

  // 分别处理目录页和漫画页
  switch (window.location.pathname.split('/')[1]) {
    case 'info':
      {
        // 跳过正常漫画
        if (Reflect.has(unsafeWindow, 'obj_id')) return;
        const comicId = parseInt(window.location.pathname.split('/')[2], 10);
        if (Number.isNaN(comicId)) {
          document.body.removeChild(document.body.childNodes[0]);
          main.insertNode(document.body, `
          请手动输入漫画名进行搜索 <br />
          <input type="search"> <button>搜索</button> <br />
          <div id="list" />
        `);
          main.querySelector('button').addEventListener('click', async () => {
            const comicName = main.querySelector('input')?.value;
            if (!comicName) return;
            const res = await main.request(`https://s.acg.dmzj.com/comicsum/search.php?s=${comicName}`, {
              errorText: '搜索漫画时出错'
            });
            const comicList = JSON.parse(res.responseText.slice(20, -1));
            main.querySelector('#list').innerHTML = comicList.map(({
              id,
              comic_name,
              comic_author,
              comic_url
            }) => `
                <b>《${comic_name}》<b/>——${comic_author}
                <a href="${comic_url}">Web端</a>
                <a href="https://m.dmzj.com/info/${id}.html">移动端</a>
              `).join('<br />');
          });
          return;
        }
        const res = await main.request(`https://v4api.idmzj.com/comic/detail/${comicId}?uid=2665531&disable_level=1`, {
          errorText: '获取漫画数据失败'
        });
        const {
          comicInfo: {
            last_updatetime,
            title,
            chapters
          }
        } = dmzjDecrypt(res.responseText);
        document.title = title;
        main.insertNode(document.body, `<h1>${title}</h1>`);
        Object.values(chapters).forEach(chapter => {
          // 手动构建添加章节 dom
          let temp = `<h2>${chapter.title}</h2>`;
          let i = chapter.data.length;
          while (i--) temp += `<a target="_blank" title="${chapter.data[i].chapter_title}" href="https://m.dmzj.com/view/${comicId}/${chapter.data[i].chapter_id}.html" ${chapter.data[i].updatetime === last_updatetime ? 'style="color:red"' : ''}>${chapter.data[i].chapter_title}</a>`;
          main.insertNode(document.body, temp);
        });
        document.body.removeChild(document.body.childNodes[0]);
        await GM.addStyle(`
          h1 {
            margin: 0 -20vw;
          }

          h1,
          h2 {
            text-align: center;
          }

          body {
            padding: 0 20vw;
          }

          a {
            display: inline-block;

            min-width: 4em;
            margin: 0 1em;

            line-height: 2em;
            white-space: nowrap;
          }
        `);
        break;
      }
    case 'view':
      {
        // 如果不是隐藏漫画，直接进入阅读模式
        if (unsafeWindow.comic_id) {
          await GM.addStyle('.subHeader{display:none !important}');
          setManga({
            onNext: main.querySelectorClick('#loadNextChapter'),
            onPrev: main.querySelectorClick('#loadPrevChapter')
          });
          const showComic = init(() => main.querySelectorAll('#commicBox img').map(e => e.getAttribute('data-original')).filter(src => src));
          if (!options.autoShow) await showComic();
          return;
        }
        document.body.removeChild(document.body.childNodes[0]);
        const tipDom = document.createElement('p');
        tipDom.innerText = '正在加载中，请坐和放宽，若长时间无反应请刷新页面';
        document.body.appendChild(tipDom);
        let data;
        try {
          const [, comicId, chapterId] = /(\d+)\/(\d+)/.exec(window.location.pathname);
          data = await getChapterInfo(comicId, chapterId);
        } catch (error) {
          main.toast.error('获取漫画数据失败', {
            duration: Infinity
          });
          tipDom.innerText = error.message;
          throw error;
        }
        tipDom.innerText = `加载完成，即将进入阅读模式`;
        const {
          folder,
          chapter_name,
          next_chap_id,
          prev_chap_id,
          comic_id,
          page_url
        } = data;
        document.title = `${chapter_name} ${folder.split('/').at(1)}` ?? folder;
        setManga({
          // 进入阅读模式后禁止退出，防止返回空白页面
          onExit: () => {},
          onNext: next_chap_id ? () => {
            window.location.href = `https://m.dmzj.com/view/${comic_id}/${next_chap_id}.html`;
          } : undefined,
          onPrev: prev_chap_id ? () => {
            window.location.href = `https://m.dmzj.com/view/${comic_id}/${prev_chap_id}.html`;
          } : undefined,
          editButtonList: e => e
        });
        const showComic = init(() => {
          if (page_url.length) return page_url;
          tipDom.innerHTML = `无法获得漫画数据，请通过 <a href="https://github.com/hymbz/ComicReadScript/issues">Github</a> 或 <a href="https://greasyfork.org/zh-CN/scripts/374903-comicread/feedback#post-discussion">Greasy Fork</a> 进行反馈`;
          return [];
        });
        if (!options.autoShow) await showComic();
        break;
      }
  }
})();

      break;
    }
  case 'www.idmzj.com':
  case 'www.dmzj.com':
    {
const main = require('main');

/** 根据漫画 id 和章节 id 获取章节数据 */
const getChapterInfo = async (comicId, chapterId) => {
  const res = await main.request(`https://m.dmzj.com/chapinfo/${comicId}/${chapterId}.html`, {
    errorText: '获取章节数据失败'
  });
  return JSON.parse(res.responseText);
};

const chapterIdRe = /(?<=\/)\d+(?=\.html)/;
const turnPage = chapterId => {
  if (!chapterId) return undefined;
  return () => {
    window.open(window.location.href.replace(/(?<=\/)\d+(?=\.html)/, `${chapterId}`), '_self');
  };
};
(async () => {
  await main.waitDom('.head_wz');
  // 只在漫画页内运行
  const comicId = main.querySelector('.head_wz [id]')?.id;
  const chapterId = window.location.pathname.match(chapterIdRe)?.[0];
  if (!comicId || !chapterId) return;
  const {
    setManga,
    init
  } = await main.useInit('dmzj');
  try {
    const {
      next_chap_id,
      prev_chap_id,
      page_url
    } = await getChapterInfo(comicId, chapterId);
    init(() => page_url);
    setManga({
      onNext: turnPage(next_chap_id),
      onPrev: turnPage(prev_chap_id)
    });
  } catch (_) {
    main.toast.error('获取漫画数据失败', {
      duration: Infinity
    });
  }
})();

      break;
    }
  // 懒得整理导入导出的代码了，应该也没人用了吧，等有人需要的时候再说
  // case 'i.dmzj.com': {
  //   // dmzj_user_info
  //   break;
  // }

  // #ehentai——「匹配 nhentai 漫画」
  case 'exhentai.org':
  case 'e-hentai.org':
    {
const web = require('solid-js/web');
const main = require('main');

const _tmpl$ = /*#__PURE__*/web.template(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor" stroke-width="0"><path d="M19.5 12c0-.23-.01-.45-.03-.68l1.86-1.41c.4-.3.51-.86.26-1.3l-1.87-3.23a.987.987 0 0 0-1.25-.42l-2.15.91c-.37-.26-.76-.49-1.17-.68l-.29-2.31c-.06-.5-.49-.88-.99-.88h-3.73c-.51 0-.94.38-1 .88l-.29 2.31c-.41.19-.8.42-1.17.68l-2.15-.91c-.46-.2-1-.02-1.25.42L2.41 8.62c-.25.44-.14.99.26 1.3l1.86 1.41a7.343 7.343 0 0 0 0 1.35l-1.86 1.41c-.4.3-.51.86-.26 1.3l1.87 3.23c.25.44.79.62 1.25.42l2.15-.91c.37.26.76.49 1.17.68l.29 2.31c.06.5.49.88.99.88h3.73c.5 0 .93-.38.99-.88l.29-2.31c.41-.19.8-.42 1.17-.68l2.15.91c.46.2 1 .02 1.25-.42l1.87-3.23c.25-.44.14-.99-.26-1.3l-1.86-1.41c.03-.23.04-.45.04-.68zm-7.46 3.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z">`);
const MdSettings = ((props = {}) => (() => {
  const _el$ = _tmpl$();
  web.spread(_el$, props, true, true);
  return _el$;
})());

(async () => {
  const {
    options,
    setFab,
    setManga,
    init
  } = await main.useInit('ehentai', {
    匹配nhentai: true,
    快捷键翻页: true,
    autoShow: false
  });

  // 不是漫画页的话
  if (!Reflect.has(unsafeWindow, 'gid')) {
    await GM.registerMenuCommand('显示设置菜单', () => setFab({
      show: true,
      focus: true,
      tip: '设置',
      children: web.createComponent(MdSettings, {}),
      onBackdropClick: () => setFab({
        show: false,
        focus: false
      })
    }));
    if (options.快捷键翻页) {
      main.linstenKeyup(e => {
        switch (e.key) {
          case 'ArrowRight':
          case 'd':
            main.querySelector('#dnext')?.click();
            break;
          case 'ArrowLeft':
          case 'a':
            main.querySelector('#dprev')?.click();
            break;
        }
      });
    }
    return;
  }
  setManga({
    onExit: isEnd => {
      if (isEnd) main.scrollIntoView('#cdiv');
      setManga({
        show: false
      });
    }
  });

  // 虽然有 Fab 了不需要这个按钮，但都点习惯了没有还挺别扭的（
  main.insertNode(document.getElementById('gd5'), '<p class="g2 gsp"><img src="https://ehgt.org/g/mr.gif"><a id="comicReadMode" href="javascript:;"> Load comic</a></p>');
  const comicReadModeDom = document.getElementById('comicReadMode');

  /** 从图片页获取图片地址 */
  const getImgFromImgPage = async url => {
    const res = await main.request(url, {
      errorText: '从图片页获取图片地址失败'
    });
    return res.responseText.split('id="img" src="')[1].split('"')[0];
  };

  /** 从详情页获取图片页的地址的正则 */
  const getImgFromDetailsPageRe = /(?<=<a href=").{20,50}(?="><img alt="\d+")/gm;

  /** 从详情页获取图片页的地址 */
  const getImgFromDetailsPage = async (pageNum = 0) => {
    const res = await main.request(`${window.location.origin}${window.location.pathname}${pageNum ? `?p=${pageNum}` : ''}`, {
      errorText: '从详情页获取图片页地址失败'
    });

    // 从详情页获取图片页的地址
    const imgPageList = res.responseText.match(getImgFromDetailsPageRe);
    if (imgPageList === null) throw new Error('从详情页获取图片页的地址时出错');
    return imgPageList;
  };
  const showComic = init(async () => {
    const totalPageNum = +main.querySelector('.ptt td:nth-last-child(2)').innerText;
    comicReadModeDom.innerHTML = ` loading`;

    // 从详情页获取所有图片页的 url
    const imgPageUrlList = await main.plimit([...Array(totalPageNum).keys()].map(pageNum => () => getImgFromDetailsPage(pageNum)), (doneNum, totalNum) => {
      setFab({
        tip: `获取图片页中 - ${doneNum}/${totalNum}`
      });
    });
    return main.plimit(imgPageUrlList.flat().map(imgPageUrl => () => getImgFromImgPage(imgPageUrl)), (doneNum, totalNum) => {
      setFab({
        progress: doneNum / totalNum,
        tip: `加载图片中 - ${doneNum}/${totalNum}`
      });
      comicReadModeDom.innerHTML = doneNum !== totalNum ? ` loading - ${doneNum}/${totalNum}` : ` Read`;
    });
  });
  setFab({
    initialShow: options.autoShow
  });
  comicReadModeDom.addEventListener('click', showComic);
  if (options.快捷键翻页) {
    main.linstenKeyup(e => {
      switch (e.key) {
        case 'ArrowRight':
        case 'd':
          main.querySelector('.ptt td:last-child:not(.ptdd)')?.click();
          break;
        case 'ArrowLeft':
        case 'a':
          main.querySelector('.ptt td:first-child:not(.ptdd)')?.click();
          break;
      }
    });
  }
  if (options.匹配nhentai) {
    const titleDom = document.getElementById('gn');
    const taglistDom = main.querySelector('#taglist tbody');
    if (!titleDom || !taglistDom) {
      main.toast.error('页面结构发生改变，匹配 nhentai 漫画功能无法正常生效');
      return;
    }
    const newTagLine = document.createElement('tr');
    let res;
    try {
      res = await main.request(`https://nhentai.net/api/galleries/search?query=${encodeURI(titleDom.innerText)}`, {
        errorText: 'nhentai 匹配出错',
        noTip: true
      });
    } catch (_) {
      newTagLine.innerHTML = `
      <td class="tc">nhentai:</td>
      <td class="tc" style="text-align: left;">
        匹配失败，请尝试重新登陆
        <a href='https://nhentai.net/' target="_blank" >
          <u>nhentai</u>
        </a>
        后刷新
      </td>`;
      taglistDom.appendChild(newTagLine);
      return;
    }
    const nHentaiComicInfo = JSON.parse(res.responseText);

    // 构建新标签行
    if (nHentaiComicInfo.result.length) {
      let temp = '<td class="tc">nhentai:</td><td>';
      let i = nHentaiComicInfo.result.length;
      while (i) {
        i -= 1;
        const tempComicInfo = nHentaiComicInfo.result[i];
        temp += `<div id="td_nhentai:${tempComicInfo.id}" class="gtl" style="opacity:1.0" title="${tempComicInfo.title.japanese ? tempComicInfo.title.japanese : tempComicInfo.title.english}"><a href="https://nhentai.net/g/${tempComicInfo.id}/" index=${i} onclick="return toggle_tagmenu('nhentai:${tempComicInfo.id}',this)">${tempComicInfo.id}</a></a></div>`;
      }
      newTagLine.innerHTML = `${temp}</td>`;
    } else newTagLine.innerHTML = '<td class="tc">nhentai:</td><td class="tc" style="text-align: left;">Null</td>';
    taglistDom.appendChild(newTagLine);

    // 重写 _refresh_tagmenu_act 函数，加入脚本的功能
    const nhentaiImgList = {};
    const raw_refresh_tagmenu_act = unsafeWindow._refresh_tagmenu_act;
    unsafeWindow._refresh_tagmenu_act = function _refresh_tagmenu_act(a, b) {
      if (a.includes('nhentai:')) {
        const tagmenu_act_dom = document.getElementById('tagmenu_act');
        tagmenu_act_dom.innerHTML = ['', `<a href="${b.href}" target="_blank"> Jump to nhentai</a>`, `<a href="#"> ${nhentaiImgList[selected_tag] ? 'Read' : 'Load comic'}</a>`].join('<img src="https://ehgt.org/g/mr.gif" class="mr" alt=">">');
        const nhentaiComicReadModeDom = tagmenu_act_dom.querySelector('a[href="#"]');

        // 加载 nhentai 漫画
        nhentaiComicReadModeDom.addEventListener('click', async e => {
          e.preventDefault();
          const comicInfo = nHentaiComicInfo.result[+selected_link.getAttribute('index')];
          let loadNum = 0;
          if (!nhentaiImgList[selected_tag]) {
            nhentaiComicReadModeDom.innerHTML = ` loading - ${loadNum}/${comicInfo.num_pages}`;
            // 用于转换获得图片文件扩展名的 dict
            const fileType = {
              j: 'jpg',
              p: 'png',
              g: 'gif'
            };
            nhentaiImgList[selected_tag] = await Promise.all(comicInfo.images.pages.map(async ({
              t
            }, i) => {
              const imgRes = await main.request(`https://i.nhentai.net/galleries/${comicInfo.media_id}/${i + 1}.${fileType[t]}`, {
                headers: {
                  Referer: `https://nhentai.net/g/${comicInfo.media_id}`
                },
                responseType: 'blob'
              });
              const blobUrl = URL.createObjectURL(imgRes.response);
              loadNum += 1;
              nhentaiComicReadModeDom.innerHTML = ` loading - ${loadNum}/${comicInfo.num_pages}`;
              return blobUrl;
            }));
            nhentaiComicReadModeDom.innerHTML = ' Read';
          }
          setManga({
            imgList: nhentaiImgList[selected_tag],
            show: true
          });
        });
      }
      // 非 nhentai 标签列的用原函数去处理
      else raw_refresh_tagmenu_act(a, b);
    };
  }
})();

      break;
    }

  // #nhentai——「彻底屏蔽漫画，自动翻页」
  case 'nhentai.net':
    {
const main = require('main');

/** 用于转换获得图片文件扩展名 */
const fileType = {
  j: 'jpg',
  p: 'png',
  g: 'gif'
};
(async () => {
  const {
    options,
    setFab,
    setManga,
    init
  } = await main.useInit('nhentai', {
    自动翻页: true,
    彻底屏蔽漫画: true,
    在新页面中打开链接: true
  });

  // 在漫画详情页
  if (Reflect.has(unsafeWindow, 'gallery')) {
    setManga({
      onExit: isEnd => {
        if (isEnd) main.scrollIntoView('#comment-container');
        setManga({
          show: false
        });
      }
    });

    // 虽然有 Fab 了不需要这个按钮，但我自己都点习惯了没有还挺别扭的（
    main.insertNode(document.getElementById('download').parentNode, '<a href="javascript:;" id="comicReadMode" class="btn btn-secondary"><i class="fa fa-book"></i> Read</a>');
    const comicReadModeDom = document.getElementById('comicReadMode');
    const showComic = init(() => gallery.images.pages.map(({
      number,
      extension
    }) => `https://i.nhentai.net/galleries/${gallery.media_id}/${number}.${extension}`));
    setFab({
      initialShow: options.autoShow
    });
    comicReadModeDom.addEventListener('click', showComic);
    return;
  }

  // 在漫画浏览页
  if (document.getElementsByClassName('gallery').length) {
    if (options.在新页面中打开链接) main.querySelectorAll('a:not([href^="javascript:"])').forEach(e => e.setAttribute('target', '_blank'));
    const blacklist = (unsafeWindow?._n_app ?? unsafeWindow?.n)?.options?.blacklisted_tags;
    if (blacklist === undefined) main.toast.error('标签黑名单获取失败');
    // blacklist === null 时是未登录

    if (options.彻底屏蔽漫画 && blacklist?.length) await GM.addStyle('.blacklisted.gallery { display: none; }');
    if (options.自动翻页) {
      await GM.addStyle(`
        hr { bottom: 0; box-sizing: border-box; margin: -1em auto 2em; }
        hr:last-child { position: relative; animation: load .8s linear alternate infinite; }
        hr:not(:last-child) { display: none; }
        @keyframes load { 0% { width: 100%; } 100% { width: 0; } }
      `);
      let pageNum = Number(main.querySelector('.page.current')?.innerHTML ?? '');
      if (Number.isNaN(pageNum)) return;
      let loadLock = !pageNum;
      const contentDom = document.getElementById('content');
      const apiUrl = (() => {
        if (window.location.pathname === '/') return 'https://nhentai.net/api/galleries/all?';
        if (main.querySelector('a.tag')) return `https://nhentai.net/api/galleries/tagged?tag_id=${main.querySelector('a.tag')?.classList[1].split('-')[1]}&`;
        if (window.location.pathname.includes('search')) return `https://nhentai.net/api/galleries/search?query=${new URLSearchParams(window.location.search).get('q')}&`;
        return '';
      })();
      const loadNewComic = async () => {
        if (loadLock || contentDom.lastElementChild.getBoundingClientRect().top > window.innerHeight) return undefined;
        loadLock = true;
        pageNum += 1;
        const res = await main.request(`${apiUrl}page=${pageNum}${window.location.pathname.includes('popular') ? '&sort=popular ' : ''}`, {
          errorText: '下一页漫画信息加载出错'
        });
        const {
          result,
          num_pages
        } = JSON.parse(res.responseText);
        let comicDomHtml = '';

        // 在 用户已登录 且 有设置标签黑名单 且 开启了彻底屏蔽功能时，才对结果进行筛选
        (options.彻底屏蔽漫画 && blacklist?.length ? result.filter(({
          tags
        }) => tags.every(tag => !blacklist.includes(tag.id))) : result).forEach(comic => {
          comicDomHtml += `<div class="gallery" data-tags="${comic.tags.map(e => e.id).join(' ')}"><a ${options.在新页面中打开链接 ? 'target="_blank"' : ''} href="/g/${comic.id}/" class="cover" style="padding:0 0 ${comic.images.thumbnail.h / comic.images.thumbnail.w * 100}% 0"><img is="lazyload-image" class="" width="${comic.images.thumbnail.w}" height="${comic.images.thumbnail.h}" src="https://t.nhentai.net/galleries/${comic.media_id}/thumb.${fileType[comic.images.thumbnail.t]}"><div class="caption">${comic.title.english}</div></a></div>`;
        });

        // 构建页数按钮
        if (comicDomHtml) {
          const target = options.在新页面中打开链接 ? 'target="_blank" ' : '';
          const pageNumDom = [];
          for (let i = pageNum - 5; i <= pageNum + 5; i += 1) {
            if (i > 0 && i <= num_pages) pageNumDom.push(`<a ${target}href="?page=${i}" class="page${i === pageNum ? ' current' : ''}">${i}</a>`);
          }
          main.insertNode(contentDom, `<h1>${pageNum}</h1>
             <div class="container index-container">${comicDomHtml}</div>
             <section class="pagination">
              <a ${target}href="?page=1" class="first">
                <i class="fa fa-chevron-left"></i>
                <i class="fa fa-chevron-left"></i>
              </a>
              <a ${target}href="?page=${pageNum - 1}" class="previous">
                <i class="fa fa-chevron-left"></i>
              </a>
              ${pageNumDom.join('')}
                ${pageNum === num_pages ? '' : `<a ${target}shref="?page=${pageNum + 1}" class="next">
                        <i class="fa fa-chevron-right"></i>
                      </a>
                      <a ${target}href="?page=${num_pages}" class="last">
                        <i class="fa fa-chevron-right"></i>
                        <i class="fa fa-chevron-right"></i>
                      </a>`}
              </section>`);
        }

        // 添加分隔线
        contentDom.appendChild(document.createElement('hr'));
        if (pageNum < num_pages) loadLock = false;else contentDom.lastElementChild.style.animationPlayState = 'paused';

        // 当前页的漫画全部被屏蔽或当前显示的漫画少到连滚动条都出不来时，继续加载
        if (!comicDomHtml || contentDom.offsetHeight < document.body.offsetHeight) return loadNewComic();
        return undefined;
      };
      window.addEventListener('scroll', loadNewComic);
      if (main.querySelector('section.pagination')) contentDom.appendChild(document.createElement('hr'));
      await loadNewComic();
    }
  }
})();

      break;
    }

  // #明日方舟泰拉记事社
  case 'terra-historicus.hypergryph.com':
    {
const main = require('main');

(async () => {
  const {
    setManga,
    setFab,
    init
  } = await main.useInit('terraHistoricus');
  const apiUrl = () => `https://terra-historicus.hypergryph.com/api${window.location.pathname}`;
  const getImgUrl = i => async () => {
    const res = await main.request(`${apiUrl()}/page?pageNum=${i + 1}`);
    return JSON.parse(res.response).data.url;
  };
  const getImgList = async () => {
    const res = await main.request(apiUrl());
    const pageList = JSON.parse(res.response).data.pageInfos;
    if (pageList.length === 0 && window.location.pathname.includes('episode')) throw new Error('获取图片列表时出错');
    return main.plimit([...Array(pageList.length).keys()].map(getImgUrl), (doneNum, totalNum) => {
      setFab({
        tip: `获取图片中 - ${doneNum}/${totalNum}`
      });
    });
  };
  let lastUrl = window.location.href;
  main.autoUpdate(async () => {
    if (window.location.href === lastUrl) return;
    lastUrl = window.location.href;
    if (!lastUrl.includes('episode')) {
      setFab({
        show: false
      });
      setManga({
        show: false
      });
      return;
    }
    await main.waitDom('footer .HG_GAME_JS_BRIDGE__wrapper');

    // 先将 imgList 清空以便 activePageIndex 归零
    setManga({
      imgList: []
    });
    init(getImgList);
    setManga({
      onPrev: main.querySelectorClick('footer .HG_GAME_JS_BRIDGE__prev a'),
      onNext: main.querySelectorClick('footer .HG_GAME_JS_BRIDGE__buttonEp+.HG_GAME_JS_BRIDGE__buttonEp a')
    });
  });
})();

      break;
    }

  // #禁漫天堂
  case 'jmcomic.me':
  case 'jmcomic1.me':
  case '18comic.org':
  case '18comic.cc':
  case '18comic.vip':
    {
const main = require('main');

// 已知问题：某些漫画始终会有几页在下载原图时出错
// 并且这类漫画下即使关掉脚本，也还是会有几页就是加载不出来
// 比较神秘的是这两种情况下加载不出来的图片还不一样
// 并且在多次刷新的情况下都是那几张图片加载不出来
// 另外这类漫画也有概率出现，在关闭脚本的情况下所有图片都加载不出来的情况，只能刷新
// 就很怪
// 对此只能放弃
(async () => {
  // 只在漫画页内运行
  if (!window.location.pathname.includes('/photo/')) return;
  const {
    init,
    setManga,
    setFab
  } = await main.useInit('jm');
  while (!unsafeWindow?.onImageLoaded) {
    if (document.readyState === 'complete') {
      main.toast.error('无法获取图片', {
        duration: Infinity
      });
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await main.sleep(100);
  }
  setManga({
    onPrev: main.querySelectorClick(() => main.querySelector('.menu-bolock-ul .fa-angle-double-left')?.parentElement),
    onNext: main.querySelectorClick(() => main.querySelector('.menu-bolock-ul .fa-angle-double-right')?.parentElement)
  });
  const imgEleList = main.querySelectorAll('.scramble-page > img');

  // 判断当前漫画是否有被分割，没有就直接获取图片链接加载
  // 判断条件来自页面上的 scramble_image 函数
  if (unsafeWindow.aid < unsafeWindow.scramble_id || unsafeWindow.speed === '1') {
    init(() => imgEleList.map(e => e.getAttribute('data-original')));
    return;
  }
  const isBlobUrl = /^blob:https?:\/\//;
  const getImgUrl = async imgEle => {
    if (isBlobUrl.test(imgEle.src)) return imgEle.src;
    const originalUrl = imgEle.src;
    const res = await main.request(imgEle.getAttribute('data-original'), {
      responseType: 'blob',
      revalidate: true,
      fetch: true
    });
    if (!res.response.size) {
      console.error('下载原图时出错', imgEle.getAttribute('data-page'));
      return '';
    }
    imgEle.src = URL.createObjectURL(res.response);
    const err = await main.waitImgLoad(imgEle);
    if (err) {
      URL.revokeObjectURL(imgEle.src);
      imgEle.src = originalUrl;
      console.warn('加载原图时出错', imgEle.getAttribute('data-page'));
      return '';
    }
    try {
      unsafeWindow.onImageLoaded(imgEle);
      const blob = await new Promise(resolve => {
        imgEle.nextElementSibling.toBlob(resolve, 'image/webp', 1);
      });
      URL.revokeObjectURL(imgEle.src);
      if (!blob) throw new Error('');
      return `${URL.createObjectURL(blob)}#.webp`;
    } catch (error) {
      imgEle.src = originalUrl;
      console.warn('转换图片时出错', imgEle.getAttribute('data-page'));
      return '';
    }
  };

  // 先等网页自己的懒加载加载完毕
  await main.wait(() => main.querySelectorAll('.lazy-loaded.hide').length && main.querySelectorAll('.lazy-loaded.hide').length === main.querySelectorAll('canvas').length);
  init(() => main.plimit(imgEleList.map(img => () => getImgUrl(img)), (doneNum, totalNum) => {
    setFab({
      progress: doneNum / totalNum,
      tip: `加载图片中 - ${doneNum}/${totalNum}`
    });
  }));
  const retry = (num = 0) => setManga(async state => {
    for (let i = 0; i < imgEleList.length; i++) {
      if (state.imgList[i]) continue;
      state.imgList[i] = await getImgUrl(imgEleList[i]);
      await main.sleep(1000);
    }
    if (num < 60 && state.imgList.some(url => !url)) setTimeout(retry, 1000 * 5, num + 1);
  });
  retry();
})();

      break;
    }

  // #拷贝漫画(copymanga)
  case 'copymanga.site':
  case 'copymanga.info':
  case 'copymanga.net':
  case 'copymanga.org':
  case 'copymanga.tv':
  case 'copymanga.com':
  case 'www.copymanga.site':
  case 'www.copymanga.info':
  case 'www.copymanga.net':
  case 'www.copymanga.org':
  case 'www.copymanga.tv':
  case 'www.copymanga.com':
    {
const main = require('main');

(async () => {
  // 只在漫画页内运行
  if (!window.location.href.includes('/chapter/')) return;
  const {
    setManga,
    init
  } = await main.useInit('copymanga');
  setManga({
    onNext: main.querySelectorClick('.comicContent-next a:not(.prev-null)'),
    onPrev: main.querySelectorClick('.comicContent-prev:not(.index,.list) a:not(.prev-null)')
  });
  init(async () => {
    const res = await main.request(window.location.href.replace(/.*?(?=\/comic\/)/, 'https://api.copymanga.site/api/v3'));
    const {
      results: {
        chapter: {
          contents
        }
      }
    } = JSON.parse(res.responseText);
    return contents.map(({
      url
    }) => url);
  });
  const chapter_id = window.location.pathname.split('/').at(-1);
  const res = await main.request(`https://api.copymanga.site/api/v3/roasts?chapter_id=${chapter_id}&limit=100&offset=0&_update=true`);
  const commentList = JSON.parse(res.responseText).results.list.map(({
    comment
  }) => comment);
  setManga({
    commentList
  });
})();

      break;
    }

  // #漫画柜(manhuagui)
  case 'www.manhuagui.com':
  case 'www.mhgui.com':
  case 'tw.manhuagui.com':
    {
const main = require('main');

(async () => {
  // 只在漫画页内运行
  if (!Reflect.has(unsafeWindow, 'cInfo')) return;

  // 让切换章节的提示可以显示在漫画页上
  await GM.addStyle(`#smh-msg-box { z-index: 9999999999 !important }`);
  const {
    setManga,
    init
  } = await main.useInit('manhuagui');
  setManga({
    onNext: cInfo.nextId !== 0 ? main.querySelectorClick('a.nextC') : undefined,
    onPrev: cInfo.prevId !== 0 ? main.querySelectorClick('a.prevC') : undefined
  });
  init(() => {
    const comicInfo = JSON.parse(
    // 只能通过 eval 获得数据
    // eslint-disable-next-line no-eval
    eval(main.querySelectorAll('body > script')[1].innerHTML.slice(26)).slice(12, -12));
    const sl = Object.entries(comicInfo.sl).map(attr => `${attr[0]}=${attr[1]}`).join('&');
    return comicInfo.files.map(file => `${pVars.manga.filePath}${file}?${sl}`);
  });
})();

      break;
    }

  // #漫画DB(manhuadb)
  case 'www.manhuadb.com':
    {
const main = require('main');

(async () => {
  // 只在漫画页内运行
  if (!Reflect.has(unsafeWindow, 'img_data_arr')) return;
  const {
    setManga,
    init
  } = await main.useInit('manhuaDB');

  /**
   * 检查是否有上/下一话
   */
  const checkTurnPage = async type => {
    const res = await $.ajax({
      method: 'POST',
      url: '/book/goNumPage',
      dataType: 'json',
      data: main.dataToParams({
        ccid: p_ccid,
        id: p_id,
        num: vg_r_data.data('num') + (type === 'next' ? 1 : -1),
        d: p_d,
        type
      })
    });
    if (res.state) return main.querySelectorClick(`a[title="${type === 'next' ? '下集' : '上集'}"]`);
    return undefined;
  };
  setManga({
    onNext: await checkTurnPage('next'),
    onPrev: await checkTurnPage('pre')
  });
  init(() => img_data_arr.map(data => `${img_host}/${img_pre}/${data.img}`));
})();

      break;
    }

  // #漫画猫(manhuacat)
  case 'www.manhuacat.com':
  case 'www.maofly.com':
    {
const main = require('main');

(async () => {
  // 只在漫画页内运行
  if (!Reflect.has(unsafeWindow, 'cdnImage')) return;
  const {
    setManga,
    init
  } = await main.useInit('manhuacat');

  /**
   * 检查是否有上/下一页
   */
  const checkTurnPage = async type => {
    const res = await $.ajax({
      type: 'get',
      url: `/chapter_num?chapter_id=${chapter_num}&ctype=${type === 'next' ? 1 : 2}&type=${chapter_type}`,
      dataType: 'json'
    });
    if (res.code === '0000') return () => goNumPage(type);
    return undefined;
  };
  setManga({
    onNext: await checkTurnPage('next'),
    onPrev: await checkTurnPage('pre')
  });
  init(() => img_data_arr.map(img => cdnImage(img_pre + img, asset_domain, asset_key)));
})();

      break;
    }

  // #动漫屋(dm5)
  case 'tel.dm5.com':
  case 'en.dm5.com':
  case 'www.dm5.com':
  case 'www.dm5.cn':
  case 'www.1kkk.com':
    {
const main = require('main');

(async () => {
  // 只在漫画页内运行
  if (!Reflect.has(unsafeWindow, 'DM5_CID')) return;
  const {
    setFab,
    setManga,
    init
  } = await main.useInit('dm5');
  setManga({
    onNext: main.querySelectorClick('.logo_2'),
    onPrev: main.querySelectorClick('.logo_1'),
    onExit: isEnd => {
      if (isEnd) main.scrollIntoView('.top');
      setManga({
        show: false
      });
    }
  });
  const getImgList = async (imgList = [], errorNum = 0) => {
    try {
      const res = await $.ajax({
        type: 'GET',
        url: 'chapterfun.ashx',
        data: {
          cid: DM5_CID,
          page: imgList.length + 1,
          key: $('#dm5_key').length ? $('#dm5_key').val() : '',
          language: 1,
          gtk: 6,
          _cid: DM5_CID,
          _mid: DM5_MID,
          _dt: DM5_VIEWSIGN_DT,
          _sign: DM5_VIEWSIGN
        }
      });

      // 返回的数据只能通过 eval 获得
      // eslint-disable-next-line no-eval
      const newImgList = [...imgList, ...eval(res)];
      if (newImgList.length !== DM5_IMAGE_COUNT) {
        setFab({
          progress: newImgList.length / DM5_IMAGE_COUNT,
          tip: `加载图片中 - ${newImgList.length}/${DM5_IMAGE_COUNT}`
        });
        return getImgList(newImgList);
      }
      return newImgList;
    } catch (error) {
      if (errorNum > 3) throw new Error('加载图片时出错');
      console.error('加载图片时出错');
      main.toast.error('加载图片时出错');
      await main.sleep(1000 * 3);
      return getImgList(imgList, errorNum + 1);
    }
  };
  init(getImgList);
})();

      break;
    }

  // #绅士漫画(wnacg)
  case 'www.wnacg.com':
    {
const main = require('main');

(async () => {
  // 只在漫画页内运行
  if (!Reflect.has(unsafeWindow, 'imglist')) return;
  const {
    init
  } = await main.useInit('wnacg');
  init(() => imglist.filter(({
    caption
  }) => caption !== '喜歡紳士漫畫的同學請加入收藏哦！').map(({
    url
  }) => url));
})();

      break;
    }

  // #mangabz
  case 'www.mangabz.com':
  case 'mangabz.com':
    {
const main = require('main');

(async () => {
  // 只在漫画页内运行
  if (!Reflect.has(unsafeWindow, 'MANGABZ_CID')) return;
  const {
    setFab,
    setManga,
    init
  } = await main.useInit('mangabz');
  setManga({
    onNext: main.querySelectorClick('body > .container a[href^="/"]:last-child'),
    onPrev: main.querySelectorClick('body > .container a[href^="/"]:first-child')
  });
  const getImgList = async (imgList = []) => {
    const urlParams = main.dataToParams({
      cid: MANGABZ_CID,
      page: imgList.length + 1,
      key: '',
      _cid: MANGABZ_CID,
      _mid: MANGABZ_MID,
      _dt: MANGABZ_VIEWSIGN_DT.replace(' ', '+').replace(':', '%3A'),
      _sign: MANGABZ_VIEWSIGN
    });
    const res = await main.request(`http://${MANGABZ_COOKIEDOMAIN}${MANGABZ_CURL}chapterimage.ashx?${urlParams}`);

    // 返回的数据只能通过 eval 获得
    // eslint-disable-next-line no-eval
    const newImgList = [...imgList, ...eval(res.responseText)];
    if (newImgList.length !== MANGABZ_IMAGE_COUNT) {
      // 在 Fab 按钮上通过进度条和提示文本显示当前进度
      setFab({
        progress: newImgList.length / MANGABZ_IMAGE_COUNT,
        tip: `加载图片中 - ${newImgList.length}/${MANGABZ_IMAGE_COUNT}`
      });
      return getImgList(newImgList);
    }
    return newImgList;
  };
  init(getImgList);
})();

      break;
    }

  // #welovemanga
  case 'nicomanga.com':
  case 'weloma.art':
  case 'welovemanga.one':
    {
const main = require('main');

(async () => {
  const imgList = main.querySelectorAll('img.chapter-img').map(e => e.getAttribute('data-src') ?? e.getAttribute('data-original') ?? e.src);
  // 只在漫画页内运行
  if (!imgList.length) return;
  const {
    setManga,
    init
  } = await main.useInit('manhuagui');
  setManga({
    onNext: main.querySelectorClick('.rd_top-right.next:not(.disabled)'),
    onPrev: main.querySelectorClick('.rd_top-left.prev:not(.disabled)')
  });
  init(() => imgList);
})();

      break;
    }
  default:
    {
const main = require('main');
const store = require('solid-js/store');

/**
 * 求 a 和 b 的差集，相当于从 a 中删去和 b 相同的属性
 *
 * 不会修改参数对象，返回的是新对象
 */
const difference = (a, b) => {
  const res = {};
  const keys = Object.keys(a);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (typeof a[key] === 'object') {
      const _res = difference(a[key], b[key]);
      if (Object.keys(_res).length) res[key] = _res;
    } else if (a[key] !== b[key]) res[key] = a[key];
  }
  return res;
};

const defaultOption = {
  dir: 'rtl',
  scrollbar: {
    enabled: true,
    autoHidden: false,
    showProgress: true
  },
  onePageMode: false,
  scrollMode: false,
  clickPage: {
    enabled: 'ontouchstart' in document.documentElement,
    overturn: false
  },
  firstPageFill: true,
  disableZoom: false,
  darkMode: false,
  swapTurnPage: false,
  flipToNext: true,
  alwaysLoadAllImg: false,
  scrollModeImgScale: 1,
  showComment: true
};

/**
 * 对修改站点配置的相关方法的封装
 * @param name 站点名
 * @param defaultOptions 默认配置
 */
const useSiteOptions = async (name, defaultOptions = {}) => {
  const _defaultOptions = {
    autoShow: true,
    hiddenFAB: false,
    ...defaultOptions,
    option: {
      ...defaultOption,
      ...defaultOptions?.option
    }
  };
  const rawValue = await GM.getValue(name);
  const options = store.createMutable({
    ..._defaultOptions,
    ...rawValue
  });
  const changeCallbackList = [];
  return {
    options,
    /** 该站点是否有储存配置 */
    isRecorded: rawValue !== undefined,
    /**
     * 设置新 Option
     * @param newValue newValue
     * @param trigger 是否触发变更事件
     */
    setOptions: async (newValue, trigger = true) => {
      Object.assign(options, newValue);
      if (trigger) await Promise.all(changeCallbackList.map(callback => callback(options)));

      // 只保存和默认设置不同的部分
      return GM.setValue(name, difference(options, _defaultOptions));
    },
    /**
     * 监听配置变更事件
     */
    onOptionChange: callback => {
      changeCallbackList.push(callback);
    }
  };
};

setTimeout(async () => {
  const {
    options,
    setOptions,
    isRecorded
  } = await useSiteOptions(window.location.hostname, {
    autoShow: false
  });

  /** 图片列表 */
  let imgList = [];
  /** 是否正在后台不断检查图片 */
  let running = 0;
  let setManga;
  let setFab;
  const init = async () => {
    if (setManga !== undefined) return;
    [setManga] = await main.useManga({
      imgList,
      show: options.autoShow,
      onOptionChange: option => setOptions({
        ...options,
        option
      }, false)
    });
    setFab = await main.useFab({
      tip: '阅读模式',
      onClick: () => setManga({
        show: true
      }),
      speedDial: main.useSpeedDial(options, setOptions)
    });
    setFab();
  };

  /** 已经被触发过懒加载的图片 */
  const triggedImgList = new Set();
  /** 触发懒加载 */
  const triggerLazyLoad = () => {
    const targetImgList = [...document.getElementsByTagName('img')]
    // 过滤掉已经被触发过懒加载的图片
    .filter(e => !triggedImgList.has(e))
    // 根据位置从小到大排序
    .sort((a, b) => a.offsetTop - b.offsetTop);

    /** 上次触发的图片 */
    let lastTriggedImg;
    targetImgList.forEach(e => {
      triggedImgList.add(e);

      // 过滤掉位置相近，在触发上一张图片时已经顺带被触发了的
      if (e.offsetTop >= (lastTriggedImg?.offsetTop ?? 0) + window.innerHeight) return;

      // 通过瞬间滚动到图片位置、触发滚动事件、再瞬间滚回来，来触发图片的懒加载
      const nowScroll = window.scrollY;
      window.scroll({
        top: e.offsetTop,
        behavior: 'auto'
      });
      e.dispatchEvent(new Event('scroll', {
        bubbles: true
      }));
      window.scroll({
        top: nowScroll,
        behavior: 'auto'
      });
      lastTriggedImg = e;
    });
  };

  /**
   * 检查搜索页面上符合标准的图片
   * @returns 返回是否成功找到图片
   */
  const checkFindImg = () => {
    triggerLazyLoad();
    const newImgList = [...document.getElementsByTagName('img')].filter(e => e.naturalHeight > 500 && e.naturalWidth > 500).map(e => e.src);
    if (newImgList.length === 0) {
      if (!options.autoShow) {
        clearInterval(running);
        main.toast.error('没有找到图片');
      }
      return false;
    }

    // 在发现新图片后重新渲染
    if (!main.isEqualArray(imgList, newImgList)) {
      imgList = newImgList;
      setManga({
        imgList
      });
      setFab({
        progress: 1
      });
    }
    return true;
  };
  await GM.registerMenuCommand('进入漫画阅读模式', async () => {
    await init();
    if (!running) running = window.setInterval(checkFindImg, 2000);
    if (!checkFindImg()) return;
    setManga({
      show: true
    });

    // 自动启用自动加载功能
    await setOptions({
      ...options,
      autoShow: true
    });
    await GM.registerMenuCommand('停止在此站点自动运行脚本', () => GM.deleteValue(window.location.hostname));
  });
  if (isRecorded) {
    await init();
    // 为了保证兼容，只能简单粗暴的不断检查网页的图片来更新数据
    running = window.setInterval(checkFindImg, 2000);
    await GM.registerMenuCommand('停止在此站点自动运行脚本', () => GM.deleteValue(window.location.hostname));
  }
});

    }
}
