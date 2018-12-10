/* global qiehuan, huPoint, g_comic_name, g_chapter_name, g_comic_id, g_comic_url, userId, ___json___ */
GM_addStyle(':root {--color1: #05a7ca;--color2: #f8fcff;--color3: #ffffff;--color4: #aea5a5;}');

loadScriptMenu({
  '漫画阅读': {
    'Enable': true,
    '双页显示': true,
    '页面填充': true,
    '点击翻页': false,
    '阅读进度': true,
    '夜间模式': true
  },
  '体验优化': {
    'Enable': true,
    '阅读被封漫画': true,
    '在新页面中打开链接': true,
    '解除吐槽的字数限制': true,
    '优化网页右上角用户信息栏的加载': true
  },
  'Version': GM_info.script.version
});

switch (location.hostname) {
  case 'manhua.dmzj.com': {
    window.addEventListener('load',()=>{
      if (ScriptMenu.UserSetting['体验优化']['优化网页右上角用户信息栏的加载'] && ___json___.result !== true) {
        GM_xmlhttpRequest({
          method: 'GET',
          url: 'https://user.dmzj.com/passport/message',
          onload: function (xhr) {
            eval(xhr.responseText.slice(4));
            document.querySelector('script[src="https://user.dmzj.com/passport/message"]').onreadystatechange();
          }
        });
      }
    });
    if (document.title === '页面找不到') {
      let urlInfo = document.URL.split('/');
      GM_xmlhttpRequest({
        method: 'GET',
        url: `https://manhua.dmzj.com/${urlInfo[3]}`,
        onload: (xhr) => {
          if (xhr.status === 200) {
            self.location.href = `https://m.dmzj.com/view/${RegExp('g_current_id = "(\\d+)').exec(xhr.responseText)[1]}/${urlInfo[4].split('.')[0]}.html`;
          }
        }
      });
    } else {
      // 判断当前页是漫画页
      if (typeof g_chapter_name !== 'undefined') {
        if (ScriptMenu.UserSetting['漫画阅读'].Enable) {
          GM_addStyle(`${JSON.parse(GM_getResourceText('DMZJcss')).sections[0].code}@@DMZJScriptRaw.css@@`);
          if (!ScriptMenu.UserSetting['漫画阅读']['夜间模式'])
            document.body.className = 'day';

          // 切换至上下翻页阅读
          if ($.cookie('display_mode') === '0')
            qiehuan();

          let List = document.querySelectorAll('.inner_img img'),
              i = List.length;
          while (i--)
            if (List[i].getAttribute('data-original'))
              List[i].setAttribute('src', List[i].getAttribute('data-original'));

          let comicReadMode = document.querySelector('.btns a:last-of-type');
          comicReadMode.innerHTML = '阅读模式';
          comicReadMode.setAttribute('href', 'javascript:;');
          comicReadMode.removeAttribute('target');
          comicReadMode.onclick = () => {
            if (typeof ComicReadWindow === 'undefined') {
              loadComicReadWindow({
                'comicImgList': List,
                'readSetting': ScriptMenu.UserSetting['漫画阅读'],
                'EndExit': () => {
                  huPoint();
                  scrollTo(0, getTop(document.getElementById('hd')));
                },
                'comicName': `${g_comic_name} ${g_chapter_name}`,
                'nextChapter': document.getElementById('next_chapter') ? `${document.getElementById('next_chapter').href}#comicMode` : null,
                'prevChapter': document.getElementById('prev_chapter') ? `${document.getElementById('prev_chapter').href}#comicMode` : null
              });
            }
            ComicReadWindow.start();
          };
          if (location.hash === '#comicMode')
            window.addEventListener('load',comicReadMode.onclick);
        }
        // 修改发表吐槽的函数，删去字数判断。只是删去了原函数的一个判断条件而已，所以将这段压缩了一下
        if (ScriptMenu.UserSetting['体验优化']['解除吐槽的字数限制'])
          unsafeWindow.addpoint = function () { let e = $('#gdInput').val(); let c = $('input[name=length]').val(); if (e == '') { alert('沉默是你的个性，但还是吐个槽吧！'); return false; } else { if ($.trim(e) == '') { alert('空寂是你的个性，但还是吐个槽吧！'); return false; } } let d = $('#suBtn'); let b = d.attr('onclick'); let a = d.html(); d.attr('onclick', '').html('发表中..').css({ 'background': '#eee', 'color': '#999', 'cursor': 'not-allowed' }); if (is_login) { $.ajax({ type: 'get', url: `${comicUrl}/api/viewpoint/add`, dataType: 'jsonp', jsonp: 'callback', jsonpCallback: 'success_jsonpCallback_201508281119', data: `type=${type}&type_id=${comic_id}&chapter_id=${chapter_id}&uid=${uid}&nickname=${nickname}&title=${encodeURIComponent(e)}`, success: function (f) { if (f.result == 1000) { $('#gdInput').val(''); if ($('#moreLi').length > 0) { $('#moreLi').before(`<li><a href="javascript:;"  class="c9 said" onclick="clickZ($(this));clickY($(this))"  vote_id="${f.data.id}"  >${e}</a></li>`); } else { $('#tc').hide(); if (c == undefined) { $('.comic_gd_li').append(`<li><a href="javascript:;"  class="c0 said" onclick="clickZ($(this));clickY($(this))"  vote_id="${f.data.id}" >${e}</a></li>`); } else { if (c > 9) { $('.comic_gd_li').append(`<li><a href="javascript:;"  class="c9 said" onclick="clickZ($(this));clickY($(this))"  vote_id="${f.data.id}" >${e}</a></li>`); } else { $('.comic_gd_li').append(`<li><a href="javascript:;"  onclick="clickZ($(this));clickY($(this))" class="c${c} said"    vote_id="${f.data.id}">${e}</a></li>`); } } } alert('吐槽成功'); } else { if (f.result == 2001) { $('body').append(zcHtml); zcClick(); } else { alert(f.msg); } } d.attr({ 'onclick': b, 'style': '' }).html(a); } }); } };
      } else {
        GM_addStyle('#floatCode,.toppic_content+div:not(.wrap),#type_comics+a,icorss_acg{display: none !important;}.cartoon_online_border>img{transform: rotate(180deg);}');

        // 判断当前页是漫画详情页
        if (typeof g_comic_name !== 'undefined') {
          // 判断漫画被禁
          if (ScriptMenu.UserSetting['体验优化']['阅读被封漫画'] && document.querySelector('.cartoon_online_border>img')) {
            [...document.querySelectorAll('.odd_anim_title ~ div')].forEach(e => e.parentNode.removeChild(e));

            GM_xmlhttpRequest({
              method: 'GET',
              url: `http://v2api.dmzj.com/comic/${g_comic_id}.json`,
              onload: (xhr) => {
                if (xhr.status === 200) {
                  let temp = '',
                      Info = JSON.parse(xhr.responseText),
                      List = Info.chapters;
                  for (let i = 0; i < List.length; i++) {
                    temp += `<div class="photo_part"><div class="h2_title2"><span class="h2_icon h2_icon22"></span><h2>${Info.title}：${List[i].title}</h2></div></div><div class="cartoon_online_border" style="border-top: 1px dashed #0187c5;"><ul>`;
                    let chaptersList = List[i].data;
                    for (let i = 0; i < chaptersList.length; i++)
                      temp += `<li><a target="_blank" title="${chaptersList[i].chapter_title}" href="https://manhua.dmzj.com/${g_comic_url}${chaptersList[i].chapter_id}.shtml">${chaptersList[i].chapter_title}</a></li>`;
                    temp += '</ul><div class="clearfix"></div></div>';
                  }
                  appendDom(document.getElementsByClassName('middleright_mr')[0], temp);
                }
              }
            });
          } else if (ScriptMenu.UserSetting['体验优化']['在新页面中打开链接'])
            [...document.querySelectorAll('a:not([href^="javascript:"])')].forEach(e => e.setAttribute('target', '_blank'));
        }
      }
    }
    break;
  }
  case 'm.dmzj.com': {
    if (ScriptMenu.UserSetting['体验优化']['阅读被封漫画'] && typeof obj_id === 'undefined') {
      GM_addStyle('body{display:flex;margin:0;flex-direction:column;align-items:center}body.hide img{display:none}img{max-width:95%;margin:1em 0}#comicRead{order:9999}');
      if (ScriptMenu.UserSetting['漫画阅读']['夜间模式']) {
        document.body.style.backgroundColor = '#171717';
        document.body.style.color = '#fff';
      }
      document.body.innerText = '';
      document.body.className = 'hide';
      let loadText = document.createElement('p');
      loadText.innerText = '正在加载中，请坐和放宽，若长时间无反应请刷新页面';
      document.body.appendChild(loadText);
      GM_xmlhttpRequest({
        method: 'GET',
        url: `http://v2api.dmzj.com/chapter/${RegExp('\\d+/\\d+').exec(document.URL)[0]}.json`,
        onload: (xhr) => {
          if (xhr.status === 200) {
            let Info = JSON.parse(xhr.responseText),
                blobList = [],
                loadImgNum = 0;
            const imgTotalNum = Info.picnum;

            document.title = Info.title;
            let loadImg = (index) => {
              let i = index;
              GM_xmlhttpRequest({
                method: 'GET',
                url: Info.page_url[i],
                headers: {
                  'Referer': 'http://images.dmzj.com/'
                },
                responseType: 'blob',
                onload: (xhr) => {
                  if (xhr.status === 200) {
                    blobList[i] = [xhr.response, xhr.finalUrl.split('.').pop()];
                    if (++loadImgNum === imgTotalNum) {
                      let tempDom = document.createDocumentFragment();
                      for (let i = 0; i < imgTotalNum; i++)
                        appendDom(tempDom, `<img src="${URL.createObjectURL(blobList[i][0])}">`);
                      document.body.appendChild(tempDom);
                      // 等待图片全部加载完毕在进行其他操作
                      let checkLoad = () => {
                        const imgList = [...document.getElementsByTagName('img')];
                        if (imgList.every(e => e.complete)) {
                          document.body.removeChild(loadText);
                          loadComicReadWindow({
                            'comicImgList': imgList,
                            'readSetting': ScriptMenu.UserSetting['漫画阅读'],
                            'comicName': document.title,
                            'blobList': blobList
                          });
                          ComicReadWindow.start();
                          document.body.className = '';
                          GM_registerMenuCommand('进入漫画阅读模式', ComicReadWindow.start);
                        } else
                          setTimeout(checkLoad, 100);
                      };
                      setTimeout(checkLoad, 100);
                    } else
                      loadText.innerText = `正在加载中，请坐和放宽，若长时间无反应请刷新页面。目前已加载${loadImgNum}/${imgTotalNum}`;
                  } else
                    loadImg(i);
                }
              });
            };
            let i = Info.picnum;
            while (i--)
              loadImg(i);
          }
        }
      });
    }
    break;
  }
  case 'i.dmzj.com': {
    if (location.pathname.includes('subscribe') && document.querySelector('#yc1.optioned')) {
      GM_addStyle('.sub_center_con{position: relative;}#script{position: absolute;right: 0;top: 0;border-width: 1px;border-color: #e6e6e6;border-top-style: solid;border-left-style: solid;cursor: pointer;}#importDetails .account_btm_cont p{margin: 1em 0;}');
      appendDom(document.getElementsByClassName('sub_potion')[0], `
        <div id="script">
          <li>
            <label for="scriptImport"><a>导入</a></label>
            <input type="file" id="scriptImport" accept=".json" hidden>
          </li>
          <li>
            <label id="scriptExpor"><a>导出</a></label>
          </li>
        </div>
      `);

      const importDom = document.getElementById('scriptImport'),
          exportDom = document.getElementById('scriptExpor');
      let subscriptionData = '';

      /**
       * 获取订阅数据，之后执行函数 run
       *
       * @param {*} run 取得订阅数据后执行的函数
       */
      let getSubscriptionData = (run) => {
        // 取得尾页页数
        const pageNum = (() => {
          let temp = document.querySelectorAll('#page_id a[href^="#"]');
          return +temp[temp.length - 1].innerText;
        })();
        let loadPageNum = pageNum;
        const loadDom = document.createElement('span');
        loadDom.className = 'mess_num';
        exportDom.parentNode.appendChild(loadDom);

        for (let i = 0; i <= pageNum; i++) {
          $.ajax({
            url: '/ajax/my/subscribe',
            type: 'POST',
            data: {
              page: i,
              type_id: 1,
              letter_id: 0,
              read_id: 1
            },
            success: (data) => {
              subscriptionData += data;
              if (--loadPageNum)
                loadDom.innerText = loadPageNum;
              else {
                let tempDom = document.createElement('div');
                tempDom.innerHTML = subscriptionData;
                subscriptionData = [...tempDom.getElementsByClassName('dy_content_li')].map(e => {
                  const aList = e.getElementsByTagName('a');
                  return {
                    name: aList[1].innerText,
                    url: aList[0].href,
                    id: aList[aList.length - 1].getAttribute('value')
                  };
                });
                loadDom.innerText = subscriptionData.length;
                run(subscriptionData);
              }
            }
          });
        }
      };

      exportDom.addEventListener('click', () => {
        getSubscriptionData(subscriptionData => {
          if (typeof saveAs === 'undefined')
            loadExternalScripts['FileSaver']();
          saveAs(new Blob([JSON.stringify(subscriptionData, null, 4)], { type: 'text/plain;charset=utf-8' }), '动漫之家订阅信息.json');
        });
      });

      importDom.addEventListener('change', (e) => {
        if (e.target.files.length) {
          getSubscriptionData(serverSubscriptionData => {
            let reader = new FileReader();
            reader.onload = (event) => {
              const loadDom = document.createElement('span'),
                  // 从服务器上获得的已订阅漫画的 id 列表
                  serverSubscriptionList = serverSubscriptionData.map(e => e.id),
                  // 导入文件的订阅数据
                  subscriptionData = JSON.parse(event.target.result),
                  // 需要订阅的漫画数据
                  needSubscribeList = subscriptionData.filter(e => !serverSubscriptionList.includes(e.id)),
                  needSubscribeNum = needSubscribeList.length;

              if (needSubscribeNum) {
                let subscribeIndex = needSubscribeNum - 1;

                loadDom.className = 'mess_num';
                importDom.parentNode.appendChild(loadDom);

                let subscribe = () => {
                  $.ajax({
                    url: 'https://interface.dmzj.com/api/subscribe/add',
                    type: 'get',
                    jsonp: 'callback',
                    data: {
                      sub_id: needSubscribeList[subscribeIndex].id,
                      uid: userId,
                      sub_type: 0
                    },
                    dataType: 'jsonp',
                    jsonpCallback: 'success',
                    error: () => { subscribe(needSubscribeList[subscribeIndex].id); },
                    success: (data) => {
                      // 1000:成功订阅, 809:已订阅
                      if (data.result !== 1000 && data.result !== 809)
                        throw `订阅返回值:${data.result}`;
                      if (subscribeIndex) {
                        loadDom.innerText = --subscribeIndex;
                        subscribe(needSubscribeList[subscribeIndex].id);
                      } else {
                        loadDom.parentNode.removeChild(loadDom);
                        appendDom(document.body, `
                      <div id="importDetails">
                        <div class="Choose_way box_show" style="display: block;height: auto;z-index: 9999;">
                          <div class="pwdno_bound_tit">
                            <p class="account_tit_font">导入完成</p>
                            <span class="account_close"></span>
                          </div>
                          <div class="account_btm_cont">
                            <p class="Choose_way_p">共导入 ${subscriptionData.length} 部漫画数据</p>
                            <p class="Choose_way_p">成功订阅 ${needSubscribeNum} 部：</p>
                            <p style="overflow: auto;max-height: 7em;border: 1px solid #3591d5;margin-bottom: 1em;">
                              ${needSubscribeList.map(e => e.name).join('<br />')}
                            </p>
                            <p class="Choose_way_p">其余 ${subscriptionData.length - needSubscribeNum} 部漫画已订阅</p>
                          </div>
                        </div>
                        <div style="width: 100%;height: 100%;position: fixed;left: 0;top: 0;background: rgba(0, 0, 0, .3);"></div>
                      </div>
                    `);
                        document.querySelector('#importDetails .account_close').addEventListener('click', (e) => {
                          document.body.removeChild(e.path[3]);
                        });
                      }
                    }
                  });
                };
                subscribe();
              } else
                alert(`导入 ${subscriptionData.length} 部漫画数据，均已订阅`);
            };
            reader.readAsText(e.target.files[0]);
          });
        }
      });
    }
    break;
  }
}
