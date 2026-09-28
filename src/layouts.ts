// 全站布局模板（对应原 includes/header.php 与 includes/footer.php）

export type ActiveNav = 'home' | 'submit' | 'more' | 'about' | '';

interface HeaderData {
  siteTitle: string;
  pageTitle: string;
  keywords: string;
  description: string;
  audio: string;
  navLabels: { submit: string; more: string; about: string };
  active: ActiveNav;
}

export function renderHeader(d: HeaderData): string {
  const fullTitle = d.pageTitle ? `${d.pageTitle} - ${d.siteTitle}` : d.siteTitle;
  const nav = d.navLabels;
  return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
    <title>${fullTitle}</title>
    <meta name="keywords" content="${d.keywords}">
    <meta name="description" content="${d.description}">
    <link rel="stylesheet" href="/static/mdui/css/mdui.min.css" />
    <link rel="stylesheet" href="/static/css/main.css" />
    <script src="https://static.llilii.cn/libs/loveway/main.js"></script>
    <script src="/static/mdui/js/mdui.min.js"></script>
    <script src="/static/js/jquery.min.js"></script>
    <script src="/static/js/jquery.pjax.js"></script>
    <script src="/static/js/jquery.md5.js"></script>
    <script src="/static/js/clipboard.min.js"></script>
    <script src="/static/js/main.js"></script>
</head>

<body class="mdui-drawer-body-left mdui-bottom-nav-fixed mdui-appbar-with-toolbar mdui-theme-primary-pink mdui-theme-accent-pink mdui-theme-layout-auto mdui-loaded">
    <header id="appbar" class="mdui-appbar mdui-appbar-fixed">
        <audio src="${d.audio}" loop autoplay>
            抱歉...您的浏览器暂不支持audio标签哦！
        </audio>
        <div class="mdui-progress" id="isLoading">
            <div class="mdui-progress-indeterminate"></div>
        </div>
        <div class="mdui-toolbar mdui-color-theme">
            <span class="mdui-btn mdui-btn-icon mdui-ripple mdui-ripple-white " onclick="inst.toggle();"><i class="mdui-icon material-icons">menu</i></span>
            <a href="/" class="mdui-typo-headline mdui-hidden-xs">${d.siteTitle}</a>
            <div class="mdui-toolbar-spacer"></div>
            <button onclick="search()" mdui-tooltip="{content: '搜索'}" class="mdui-btn mdui-btn-icon mdui-ripple mdui-ripple-white"><i class="mdui-icon material-icons">search</i></button>
            <a target="_BLANK" href="https://www.wunote.cn" mdui-tooltip="{content: '吴先森的笔记'}" class="mdui-btn mdui-btn-icon mdui-ripple mdui-ripple-white"><i class="mdui-icon material-icons">code</i></a>
        </div>
    </header>
    <div class="mdui-drawer" id="main-drawer">
        <div class="mdui-list " mdui-collapse="{accordion: true}" style="margin-bottom: 76px;">
            <div class="mdui-list">
                <a href="/" id="homePage" class="mdui-list-item mdui-ripple${d.active === 'home' ? ' mdui-list-item-active' : ''}" style="border-radius: 16px;">
                    <i class="mdui-list-item-icon mdui-icon material-icons">home</i>
                    <div class="mdui-list-item-content">主页</div>
                </a>
                <a href="/?page=submit" id="submitPage" class="mdui-list-item mdui-ripple${d.active === 'submit' ? ' mdui-list-item-active' : ''}" style="border-radius: 16px;">
                    <i class="mdui-list-item-icon mdui-icon material-icons">favorite</i>
                    <div class="mdui-list-item-content">${nav.submit}</div>
                </a>
                <a href="/?page=more" id="morePage" class="mdui-list-item mdui-ripple${d.active === 'more' ? ' mdui-list-item-active' : ''}" style="border-radius: 16px;">
                    <i class="mdui-list-item-icon mdui-icon material-icons">tag_faces</i>
                    <div class="mdui-list-item-content">${nav.more}</div>
                </a>
                <a href="/?page=about" id="aboutPage" class="mdui-list-item mdui-ripple${d.active === 'about' ? ' mdui-list-item-active' : ''}" style="border-radius: 16px;">
                    <i class="mdui-list-item-icon mdui-icon material-icons">code</i>
                    <div class="mdui-list-item-content">${nav.about}</div>
                </a>
            </div>
            <div class="copyright">
                <div class="mdui-typo">
                    <p class="mdui-typo-caption-opacity">© 2021 <a href="https://www.wunote.cn" target="_blank">UnknownO</a></p>
                    <p class="mdui-typo-caption-opacity">
                        Powered by <a href="https://mdui.org" target="_blank">MDUI</a>
                    </p>
                </div>
            </div>
        </div>
    </div>
    <div class="mdui-container" id="pjax-container" style="max-width: 800px;">
`;
}

export function renderFooter(): string {
  return `</div>
<script>
    $(document).pjax('a', '#pjax-container', {
        'timeout': false
    })
    $("#isLoading").hide(200)
    var inst = new mdui.Drawer('#main-drawer');
    $(document).on('pjax:send', function() {
        if (isMobile()) {
            inst.close();
        }
        $("#pjax-container").hide(200)
        $("#isLoading").show(200)

    })
    $(document).on('pjax:complete', function() {
        setTimeout(function() {
            $("#isLoading").hide(200)
        }, 2000);
        $("#pjax-container").show(200)
    })

    function isMobile() {
        var userAgentInfo = navigator.userAgent;
        var mobileAgents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
        var mobile_flag = false;
        for (var v = 0; v < mobileAgents.length; v++) {
            if (userAgentInfo.indexOf(mobileAgents[v]) > 0) {
                mobile_flag = true;
                break;
            }
        }
        var screen_width = window.screen.width;
        var screen_height = window.screen.height;
        if (screen_width < 500 && screen_height < 800) {
            mobile_flag = true;
        }
        return mobile_flag;
    }

    function getNowURL() {
        return window.location.protocol + '//' + window.location.host
    }

    $(function() {
        var clipboard = new ClipboardJS('.copy');
        clipboard.on('success', function(e) {
            mdui.snackbar({
                message: '复制表白卡片地址成功！',
                position: 'right-top'
            });
        });
        clipboard.on('error', function(e) {
            mdui.snackbar({
                message: '复制表白卡片地址失败！请尝试手动复制！',
                position: 'right-top'
            });
        });
    });
</script>
</body>
</html>
`;
}

// pjax 局部刷新后更新标题（对应 titleChange）
export function titleScript(pageTitle: string, siteTitle: string): string {
  const fullTitle = pageTitle ? `${pageTitle} - ${siteTitle}` : siteTitle;
  return `<script>$(document).attr("title",${JSON.stringify(fullTitle)});</script>`;
}

// pjax 局部刷新后设置导航高亮（对应 listActive）
export function listActiveScript(active: ActiveNav): string {
  if (!active) return '';
  return `<script>
        pageArr = ['homePage', 'submitPage', 'morePage', 'aboutPage'];
        for (let i = 0; i < pageArr.length; i++) {
            if ($("#" + pageArr[i]).hasClass("mdui-list-item-active")) {
                $("#" + pageArr[i]).removeClass("mdui-list-item-active");
            }
        }
        $("#${active}Page").addClass("mdui-list-item-active");
    </script>
`;
}
