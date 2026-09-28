import type { Env } from './env';
import type { Settings } from './env';
import { esc, nl2br, formatDateTimeShanghai } from './util';
import { titleScript, listActiveScript, type ActiveNav } from './layouts';

export interface ConfessionRow {
  id: number;
  favorite: number;
  confessor: string;
  contact: string;
  time: string;
  to_who: string;
  introduction: string;
  content: string;
  image: string;
  comment: string;
}

export interface CommentItem {
  time: number;
  nickname: string;
  content: string;
}

export function parseComments(comment: string): CommentItem[] {
  try {
    const arr = JSON.parse(comment);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export interface PageContext {
  env: Env;
  origin: string;
  page: string;
  cardId: string;
  search: string;
  pageNo: number; // 1-based，未指定为 1
  settings: Settings;
  // 路由层统一预加载的站点配置
  cfg: Record<string, string>;
}

// 点赞对话框（首页与卡片页共用，对应原 like 函数）
export function likeDialogScript(): string {
  return `<script>
    function like(id) {
        mdui.dialog({
            title: '请输入图片中的验证码',
            content: '<center><div class="mdui-row"> <div class="mdui-col-xs-9"> <div class="mdui-textfield"> <input class="mdui-textfield-input" id="vCode" type="text" placeholder="请输入您的答案" /></div> </div> <div class="mdui-col-xs-3"> <img style="position: relative;top:15px" id="vcode" src="/api/vcode.php" /> </div> </div></center>',
            modal: true,
            buttons: [{
                    text: '取消'
                },
                {
                    text: '确认',
                    onClick: function(inst) {
                        requestApi("favorite", {
                            id: id,
                            vCode: $("#vCode").val(),
                            timestamp: this.timestamp = Date.parse(new Date()) / 1000
                        }, false, true, true, "")
                    }
                }
            ]
        });
    }
</script>`;
}

// 单条表白卡片（首页列表用）
function confessionCardHtml(row: ConfessionRow, origin: string): string {
  const cardUrl = `${origin}/?page=card&id=${row.id}`;
  const commentCount = parseComments(row.comment).length;
  const media = row.image
    ? `<div v-if="data.image != ''">
                            <img style="max-height: 2000px" onclick="if($(this).attr('origin-src') == undefined) { window.open($(this).attr('src')) } else { window.open($(this).attr('origin-src')) }" onerror="randomImage()" src="${esc(row.image)}" />
                        </div>`
    : `<div class="mdui-divider"></div>`;
  return `            <br /><br />
            <div class="mdui-card mdui-hoverable" style="border-radius: 16px">
                <div class="mdui-card-header">
                    <img class="mdui-card-header-avatar" src="https://q1.qlogo.cn/g?b=qq&s=640&nk=${esc(row.contact)}" />
                    <div class="mdui-card-header-title">${esc(row.confessor)}</div>
                    <div class="mdui-card-header-subtitle">${esc(row.time)}</div>
                </div>
                <div class="mdui-card-media">
                    ${media}
                </div>
                <div class="mdui-card-primary">
                    <div class="mdui-card-primary-title">To ${esc(row.to_who)}</div>
                    <div class="mdui-card-primary-subtitle">
                        ${esc(row.introduction)}
                    </div>
                </div>
                <div class="mdui-card-content">
                    ${esc(row.content)}
                </div>
                <div class="mdui-card-actions">
                    <a class="copy mdui-btn mdui-btn-icon mdui-float-right" style="color:#4F4F4F" href="javascript:void(0);" data-clipboard-text="${esc(cardUrl)}"><i class="mdui-icon material-icons">share</i></a>
                    <div id="comment-${row.id}" class="mdui-float-right mdui-card-primary-subtitle">
                        ${commentCount}
                    </div>
                    <a target="_blank" style="color:#4F4F4F" href="${cardUrl}" class="mdui-btn mdui-btn-icon mdui-float-right">
                        <i class="mdui-icon material-icons">comment</i>
                    </a>
                    <div id="like-${row.id}" class="mdui-float-right mdui-card-primary-subtitle">
                        ${row.favorite}
                    </div>
                    <button style="color:#4F4F4F" class="mdui-btn mdui-btn-icon mdui-float-right" onclick="like('${row.id}')">
                        <i class="mdui-icon material-icons">favorite</i>
                    </button>
                </div>
            </div>
`;
}

// 首页
export async function renderHomePage(ctx: PageContext): Promise<string> {
  const cfg = ctx.cfg;
  const siteTitle = cfg.title || '未知表白墙';
  const nowPage = ctx.pageNo - 1;
  const searchString = `%${ctx.search}%`;

  let body = '';
  let flag = true;
  let rowCount = 0;
  try {
    const countRow = await ctx.env.DB.prepare('SELECT COUNT(*) AS c FROM loveway_data').first<{
      c: number;
    }>();
    rowCount = countRow?.c ?? 0;

    const rows = await ctx.env.DB.prepare(
      `SELECT * FROM loveway_data
       WHERE confessor LIKE ? OR to_who LIKE ? OR introduction LIKE ? OR content LIKE ? OR comment LIKE ?
       ORDER BY time DESC LIMIT ? OFFSET ?`,
    )
      .bind(
        searchString,
        searchString,
        searchString,
        searchString,
        searchString,
        ctx.settings.pageMax,
        nowPage * ctx.settings.pageMax,
      )
      .all<ConfessionRow>();

    for (const row of rows.results ?? []) {
      flag = false;
      body += confessionCardHtml(row, ctx.origin);
    }
  } catch {
    body += '抱歉！连接数据库失败！';
  }

  body += `<br /><br />
`;

  if (flag) {
    body += `    <div class="mdui-card mdui-hoverable" style="border-radius: 16px">
        <div class="mdui-card-media">
            <img style="max-height: 2000px" onerror="randomImage()" src="" />
        </div>
        <div class="mdui-card-primary">
            <div class="mdui-card-primary-title">啊噢！</div>
            <div class="mdui-card-primary-subtitle">这里还没有任何表白呢！</div>
        </div>
        <div class="mdui-card-content">
            快点击“去表白”去向喜欢的人表白吧！<br><br>
        </div>
    </div>
`;
  } else if (searchString === '%%') {
    if (rowCount / ctx.settings.pageMax - 1 > nowPage) {
      body += `<a style="border-radius: 4px" href="?p=${nowPage + 2}" class="mdui-float-right mdui-btn mdui-btn-dense mdui-color-theme-accent mdui-ripple">下一页</a>`;
    }
    body += ` <button onclick="jumpPage()" style="border-radius: 4px" class="mdui-float-right mdui-btn mdui-btn-dense">第${nowPage + 1}页</button> `;
    if (nowPage > 0) {
      body += `<a style="border-radius: 4px" href="?p=${nowPage}" class="mdui-float-right mdui-btn mdui-btn-dense mdui-color-theme-accent mdui-ripple">上一页</a>`;
    }
  }

  return likeDialogScript() + body + listActiveScript('home') + titleScript('', siteTitle);
}

// 提交表白页
export async function renderSubmitPage(ctx: PageContext): Promise<string> {
  const cfg = ctx.cfg;
  const siteTitle = cfg.title || '未知表白墙';
  const uploadBlock = ctx.settings.uploadImage
    ? `<div class="mdui-row">
                    <div class="mdui-col-md-10 mdui-col-sm-10 mdui-col-xs-7">
                        <textarea id="image" class="mdui-textfield-input" placeholder="https://kagamine.top/img.png"></textarea>
                    </div>
                    <div class="mdui-col-md-2 mdui-col-sm-2 mdui-col-xs-5">
                        <a href="javascript:;" id="upload" class="mdui-color-theme-accent a-upload mr10">
                            <input type="file" name="" accept=".png,.jpeg,.jpg" id="upload-image">选择图片
                        </a>
                    </div>
                </div>`
    : `<textarea id="image" class="mdui-textfield-input" placeholder="https://kagamine.top/img.png"></textarea>`;

  const body = `<br /><br />
<div class="mdui-card mdui-hoverable" style="border-radius: 16px">
    <div class="mdui-card-primary">
        <div class="mdui-card-primary-title">立即表白</div>
        <div class="mdui-card-primary-subtitle">快向你喜欢的TA表白吧！</div>
    </div>
    <div class="mdui-divider"></div>
    <div class="mdui-card-content">
        <div class="mdui-textfield">
            <label class="mdui-textfield-label">你的QQ</label>
            <textarea id="qq" class="mdui-textfield-input" placeholder="2333333333"></textarea>
        </div>
        <div class="mdui-textfield">
            <label class="mdui-textfield-label">你的名字</label>
            <textarea id="name" class="mdui-textfield-input" placeholder="镜音连"></textarea>
        </div>
        <div class="mdui-textfield">
            <label class="mdui-textfield-label">TA的名字</label>
            <textarea id="taName" class="mdui-textfield-input" placeholder="镜音铃"></textarea>
        </div>
        <div class="mdui-textfield">
            <label class="mdui-textfield-label">表白配图（可选）</label>
            ${uploadBlock}
        </div>
        <div class="mdui-textfield">
            <label class="mdui-textfield-label">一句话介绍一下TA</label>
            <textarea id="introduceTA" class="mdui-textfield-input" placeholder="镜音铃是一个元气的二次元少女"></textarea>
        </div>
        <div class="mdui-textfield">
            <label class="mdui-textfield-label">你要对TA说的话</label>
            <textarea id="toTA" class="mdui-textfield-input" rows="4" placeholder="我喜欢你..."></textarea>
        </div>
    </div>

    <div class="mdui-card-actions">
        <button id="submitbtn" style="border-radius: 8px" class="mdui-btn mdui-color-theme-accent mdui-ripple mdui-float-right" onclick="submit()">
            发射！
        </button>
    </div>
    <script>
        function submit() {
            imageVerification(function(answer) {
                request(answer)
            })
        }

        $("#upload").on("change", "input[type='file']", function() {
            max_size = ${ctx.settings.maxUploadSize * 1024};
            file = $(this).prop('files')[0]
            ext = $(this).val().substring($(this).val().lastIndexOf(".") + 1).toLowerCase()
            allow_ext = ["jpg", "png", "jpeg"];
            if (allow_ext.indexOf(ext) == -1) {
                mdui.alert("上传失败！不允许的图片格式！本站仅允许jpg、png、jpeg格式的图片！")
                return false
            }
            if (file.size > max_size) {
                mdui.alert("上传失败！图片过大！本站允许上传的最大大小：" + (${ctx.settings.maxUploadSize}).toString() + "KB")
                return false
            }
            imageVerification(function(answer) {
                $('#upload-image').attr("disabled", "disabled")
                $("#isLoading").show(100)
                timestamp = this.timestamp = Date.parse(new Date()) / 1000;
                data = new FormData()
                data.append('file', file)
                data.append('vcode', answer)
                data.append('timestamp', timestamp)
                $.ajax({
                    type: 'POST',
                    url: "/api/upload.php",
                    data: data,
                    cache: false,
                    processData: false,
                    contentType: false,
                    success: function(rdata) {
                        $("#isLoading").hide(100)
                        $("#image").val(rdata.path)
                        $('#upload-image').removeAttr("disabled")
                        if (rdata.code == 1) {
                            mdui.snackbar({
                                message: rdata.msg,
                                position: 'right-top',
                            })
                        } else {
                            mdui.alert(rdata.msg)
                        }
                    },
                    error: function(data) {
                        $("#image").val("")
                        $('#upload-image').removeAttr("disabled")
                        mdui.snackbar({
                            message: "请求接口[upload]时，出现了一个致命错误！",
                            position: 'right-top'
                        })
                    }
                })
            })
        });

        function request(vCode) {
            var contact = $("#qq").val();
            var name = $("#name").val();
            var taName = $("#taName").val();
            var image = $("#image").val();
            var introduceTA = $("#introduceTA").val();
            var toTA = $("#toTA").val();
            var timestamp = this.timestamp = Date.parse(new Date()) / 1000;
            var key = $.md5(
                'Kagamine Yes!' +
                contact +
                name +
                taName +
                image +
                introduceTA +
                toTA +
                timestamp)
            requestApi("submit", {
                key: key,
                timestamp: timestamp,
                contact: contact,
                name: name,
                taName: taName,
                image: image,
                introduceTA: introduceTA,
                toTA: toTA,
                vCode: vCode
            }, function(rdata) {
                if (rdata.id === undefined) return;
                $("#qq").val("");
                $("#name").val("");
                $("#taName").val("");
                $("#image").val("");
                $("#introduceTA").val("");
                $("#toTA").val("");
                $.pjax({
                    url: '/?page=card&id=' + rdata.id,
                    container: '#pjax-container'
                });
            }, true, false, "#submitbtn")
        }
    </script>
</div>
<br /><br />
`;

  return (
    body +
    listActiveScript('submit') +
    titleScript(cfg.submit || '', siteTitle)
  );
}

// 卡片详情页
export async function renderCardPage(ctx: PageContext): Promise<string> {
  const cfg = ctx.cfg;
  const siteTitle = cfg.title || '未知表白墙';

  let row: ConfessionRow | null = null;
  try {
    row =
      (await ctx.env.DB.prepare('SELECT * FROM loveway_data WHERE id = ?')
        .bind(ctx.cardId)
        .first<ConfessionRow>()) ?? null;
  } catch {
    row = null;
  }

  if (!row) {
    return `<script> setTimeout(function () { $.pjax({ url: '/?page=404', container: '#pjax-container' }); }, 10) </script>`;
  }

  const media = row.image
    ? `<img style="max-height: 1000px" onclick="if($(this).attr('origin-src') == undefined) { window.open($(this).attr('src')) } else { window.open($(this).attr('origin-src')) }" onerror="randomImage()" src="${esc(row.image)}" />`
    : `<div class="mdui-divider"></div>`;

  const comments = parseComments(row.comment);
  let commentHtml = '';
  if (comments.length === 0) {
    commentHtml += "<script>$('#commentBoxMain').hide();</script>";
  }
  for (let i = 0; i < comments.length; i++) {
    const c = comments[i];
    commentHtml += `<div class="mdui-card-primary-subtitle">${esc(c.nickname)}在 ${formatDateTimeShanghai(Number(c.time))} 的评论</div><br>
                            ${nl2br(c.content)}`;
    if (i !== comments.length - 1) {
      commentHtml += `<br><br><div class="mdui-divider"></div><br>`;
    }
  }

  const cardUrl = `${ctx.origin}/?page=card&id=${row.id}`;
  const body = `<br /><br />

        <div class="mdui-card mdui-hoverable" style="border-radius: 16px;">
            <div class="mdui-card-header">
                <img class="mdui-card-header-avatar" src="https://q1.qlogo.cn/g?b=qq&s=640&nk=${esc(row.contact)}" />
                <div class="mdui-card-header-title">${esc(row.confessor)}</div>
                <div class="mdui-card-header-subtitle">${esc(row.time)}</div>
            </div>
            <div class="mdui-card-media">
                ${media}
                <div class="mdui-card-menu">
                    <a target="_blank" style="color:#4F4F4F" href="/" class="mdui-btn mdui-btn-icon mdui-float-right">
                        <i class="mdui-icon material-icons">arrow_back</i>
                    </a>
                </div>
            </div>
            <div class="mdui-card-primary">
                <div class="mdui-card-primary-title">To ${esc(row.to_who)}</div>
                <div class="mdui-card-primary-subtitle">
                    ${esc(row.introduction)}
                </div>
            </div>
            <div class="mdui-card-content">
                ${esc(row.content)}
                <br><br>
                <div class="mdui-card" style="border-radius: 16px;">
                    <div class="mdui-card-primary">
                        <div class="mdui-card-primary-title">发表您的评论</div>
                        <div class="mdui-card-primary-subtitle">可以发表您的感想以及感受哦！</div>
                    </div>
                    <div class="mdui-card-content">
                        <div class="mdui-textfield">
                            <label class="mdui-textfield-label">您的昵称</label>
                            <input placeholder="镜音连" id="nickname" class="mdui-textfield-input" type="text" />
                        </div>
                        <div class="mdui-textfield">
                            <label class="mdui-textfield-label">你要说....</label>
                            <textarea id="content" class="mdui-textfield-input" rows="4" placeholder="加油！你一定能成功的！"></textarea>
                        </div>
                    </div>
                    <div class="mdui-card-actions">
                        <button id="submitbtn" style="border-radius: 8px" class="mdui-btn mdui-color-theme-accent mdui-ripple mdui-float-right" onclick="commentSubmit()">
                            发射！
                        </button>
                    </div>
                </div>
                <br>
                <div class="mdui-card" id="commentBoxMain" style="border-radius: 16px;">
                    <div class="mdui-card-primary">
                        <div class="mdui-card-primary-title">所有评论</div>
                        <div class="mdui-card-primary-subtitle">这些都是给信的主人的评论啦！</div>
                    </div>
                    <div id="commentBox" class="mdui-card-content">
                        ${commentHtml}
                        <br><br>
                    </div>
                </div>
            </div>
            <div class="mdui-card-actions">
                <a class="copy mdui-btn mdui-btn-icon mdui-float-right" href="javascript:void(0);" data-clipboard-text="${esc(cardUrl)}"><i class="mdui-icon material-icons">share</i></a>
                <div id="like-${row.id}" class="mdui-float-right mdui-card-primary-subtitle">
                    ${row.favorite}
                </div>
                <button style="color:#4F4F4F" class="mdui-btn mdui-btn-icon mdui-float-right" onclick="like('${row.id}')">
                    <i class="mdui-icon material-icons">favorite</i>
                </button>
            </div>
        </div>

<script>
    function commentSubmit() {
        mdui.dialog({
            title: '请输入图片中的验证码',
            content: '<center><div class="mdui-row"> <div class="mdui-col-xs-9"> <div class="mdui-textfield"> <input class="mdui-textfield-input" id="answer" type="text" placeholder="请输入您的答案" /></div> </div> <div class="mdui-col-xs-3"> <img style="position: relative;top:15px" id="vcode" src="/api/vcode.php" /> </div> </div></center>',
            modal: true,
            buttons: [{
                    text: '取消'
                },
                {
                    text: '确认',
                    onClick: function(inst) {
                        requestApi("comment", {
                            id: ${row.id},
                            nickname: $("#nickname").val(),
                            content: $("#content").val(),
                            vCode: $("#answer").val(),
                            timestamp: this.timestamp = Date.parse(new Date()) / 1000
                        }, false, true, true, "#submitbtn")
                    }
                }
            ]
        });
    }
</script>
`;

  return body + likeDialogScript() + titleScript('', siteTitle);
}

// 开发初衷页
export async function renderMorePage(ctx: PageContext): Promise<string> {
  const cfg = ctx.cfg;
  const siteTitle = cfg.title || '未知表白墙';
  const body = `<br /><br />
<div class="mdui-card mdui-hoverable" style="border-radius: 16px">
    <div class="mdui-card-media">
        <img style="max-height: 1000px" src="https://img.llilii.cn/compression/vocaloid/kagamine/78688114_p0.png" />
    </div>
    <div class="mdui-card-primary">
        <div class="mdui-card-primary-title">${esc(cfg.more || '开发初衷')}</div>
        <div class="mdui-card-primary-subtitle">哇！终于等到你来看这个页面！</div>
    </div>
    <div class="mdui-card-content">
        ${cfg.more_content ?? ''}
    </div>
</div>
<br /><br />
`;
  return body + listActiveScript('more') + titleScript(cfg.more || '', siteTitle);
}

// 关于页
export async function renderAboutPage(ctx: PageContext): Promise<string> {
  const cfg = ctx.cfg;
  const siteTitle = cfg.title || '未知表白墙';
  const body = `<br /><br />
<div class="mdui-card mdui-hoverable" style="border-radius: 16px">
    <div class="mdui-card-media">
        <img style="max-height: 1000px" src="https://img.llilii.cn/compression/vocaloid/kagamine/32639516_p2.jpg" />
    </div>
    <div class="mdui-card-primary">
        <div class="mdui-card-primary-title">关于本站</div>
        <div class="mdui-card-primary-subtitle">ABOUT US</div>
    </div>
    <div class="mdui-card-content">
        <div class="mdui-typo">
            ${cfg.about_content ?? ''}
            <br><br>
            <div class="mdui-divider"></div><br>
            程序版本:V1.5.9 (Cloudflare Workers)<br />
            原作者博客:<a href="https://www.wunote.cn" class="text-decoration: none;">吴先森的笔记</a><br />原作者邮箱:i@mr-wu.top<br>
        </div>
    </div>
</div>
<br /><br />
`;
  return body + listActiveScript('about') + titleScript(cfg.about || '关于本站', siteTitle);
}

// 登录页
export function renderLoginPage(ctx: PageContext): string {
  const body = `<div class="mdui-container" style="max-width: 400px; ">
    <br><br>
    <div class="mdui-card">

        <div class="mdui-card-media">
            <div class="mdui-card-menu">
                <button onclick="javascript:history.go(-1);" class="mdui-color-theme-accent mdui-btn mdui-btn-icon mdui-text-color-white"><i class="mdui-icon material-icons">arrow_back</i></button>
            </div>
        </div>

        <div class="mdui-card-primary">
            <div class="mdui-card-primary-title">登录</div>
            <div class="mdui-card-primary-subtitle">此处为未知表白墙的后台，闲人免进！</div>
        </div>

        <div class="mdui-card-content">
            <div class="mdui-textfield">
                <input class="mdui-textfield-input" id='username' type="text" placeholder="用户名" />
            </div>
            <div class="mdui-textfield">
                <input class="mdui-textfield-input" id='password' type="password" placeholder="密码" />
            </div>
        </div>

        <div class="mdui-card-actions">
            <button onclick="submit()" style="border-radius: 8px" id='login-BTN' class="mdui-btn mdui-ripple mdui-btn-dense mdui-color-theme-accent mdui-float-right">立即登录</button>
        </div>

    </div>
</div>
<script>
    function submit() {
        imageVerification(function(answer) {
            login(answer)
        })
    }

    function login(vcode) {
        var timestamp = this.timestamp = Date.parse(new Date()) / 1000;
        requestApi("login", {
            username: $("#username").val(),
            password: $("#password").val(),
            vcode: vcode,
            timestamp: timestamp
        }, function() {
            $("#username").val("")
            $("#password").val("")
        }, true, true, "login-BTN")
    }
</script>
`;
  return body;
}

// 404 页面（独立完整页面，对应 404.php）
export function render404(ctx: PageContext): string {
  const siteTitle = ctx.cfg.title || '未知表白墙';
  return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="theme-color" content="#3f51b5">
    <meta name="mdui-main-color" content="#3f51b5">
    <link rel="stylesheet" href="/static/mdui/css/mdui.min.css" />
    <script src="/static/js/jquery.min.js"></script>
    <script src="/static/mdui/js/mdui.min.js"></script>
    <Title>页面走丢啦 - ${esc(siteTitle)}</Title>
    <style>
        .mdui-background-404 {
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
            width: 100%;
            height: 61.8%;
            text-align: center
        }

        .mdui-background-404 {
            background-color: #212121 !important
        }

        .mdui-background-404 span {
            position: relative;
            display: inline-block;
            width: 100%;
            letter-spacing: 0 !important
        }

        .mdui-background-404 span span {
            display: inline-block;
            margin: -10px 0 0 !important;
            opacity: .54
        }

        .mdui-main-404 {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 38.2%
        }

        .mdui-main-404 a {
            margin: 10px 20px;
            padding: 0 22px;
            height: 55px;
            font-size: 20px;
            line-height: 55px
        }

        .mdui-main-404 div {
            width: 100%;
            text-align: center
        }
    </style>
</head>

<body class="mdui-theme-primary-indigo mdui-theme-accent-pink">
    <div class="mdui-color-theme mdui-typo-display-4 mdui-valign mdui-background-404">
        <span>404<span class="mdui-typo-headline">这个页面似乎找不到了哦</span></span>
    </div>
    <div class="mdui-valign mdui-main-404">
        <div>
            <a href="/" class="mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme-accent">返回主页面</a>
            <a href="/" class="mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme-accent">返回上一级</a>
            <div>
            </div>

        </div>
    </div>
</body>

</html>
`;
}

// 500 错误页（独立完整页面，对应 err.php）
export function renderErrPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="theme-color" content="#3f51b5">
    <meta name="mdui-main-color" content="#3f51b5">
    <link rel="stylesheet" href="/static/mdui/css/mdui.min.css" />
    <script src="/static/js/jquery.min.js"></script>
    <script src="/static/mdui/js/mdui.min.js"></script>
    <Title>出错啦</Title>
    <style>
        .mdui-background-404 {
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
            width: 100%;
            height: 61.8%;
            text-align: center
        }

        .mdui-background-404 {
            background-color: #212121 !important
        }

        .mdui-background-404 span {
            position: relative;
            display: inline-block;
            width: 100%;
            letter-spacing: 0 !important
        }

        .mdui-background-404 span span {
            display: inline-block;
            margin: -10px 0 0 !important;
            opacity: .54
        }

        .mdui-main-404 {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 38.2%
        }

        .mdui-main-404 a {
            margin: 10px 20px;
            padding: 0 22px;
            height: 55px;
            font-size: 20px;
            line-height: 55px
        }

        .mdui-main-404 div {
            width: 100%;
            text-align: center
        }
    </style>
</head>

<body class="mdui-theme-primary-indigo mdui-theme-accent-pink">
    <div class="mdui-color-theme mdui-typo-display-4 mdui-valign mdui-background-404">
        <span>Err<span class="mdui-typo-headline">连接数据库出现了一个错误</span></span>
    </div>
    <div class="mdui-valign mdui-main-404">
        <div>
            <a href="javascript:mdui.alert('如果您是本站管理，请检查是否已创建 D1 数据库并执行 schema.sql，且 wrangler.jsonc 中的 database_id 填写正确。如果您无法解决此问题，可以与本程序开发者联系。如果您是普通访客，请尝试刷新本页，并尝试与此站点的管理员联系。')" class="mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme-accent">这是为什么</a>
            <a href="javascript:location.reload()" class="mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme-accent">刷新本页</a>
            <div>
            </div>

        </div>
    </div>
</body>

</html>
`;
}
