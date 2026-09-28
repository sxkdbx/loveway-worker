import type { PageContext, ConfessionRow } from './pages';
import { esc } from './util';
import { titleScript } from './layouts';

// 管理后台首页
export async function renderAdminHome(ctx: PageContext): Promise<string> {
  const cfg = ctx.cfg;
  const siteTitle = cfg.title || '未知表白墙';
  const isWeakPass = ctx.settings.adminPass === 'kagamine1234';

  const content = isWeakPass
    ? `    <div class="mdui-card mdui-hoverable" style="border-radius: 16px">
        <div class="mdui-card-media">
            <img style="max-height: 2000px" onerror="randomImage()" src="" />
        </div>
        <div class="mdui-card-primary">
            <div class="mdui-card-primary-title">抱歉！</div>
            <div class="mdui-card-primary-subtitle">出于安全原因，管理页面被屏蔽！</div>
        </div>
        <div class="mdui-card-content">
            请在 Cloudflare 后台修改环境变量 ADMIN_PASS（或使用 wrangler secret put ADMIN_PASS）后再次访问本页！<br><br>
        </div>
    </div>
`
    : `    <div class="mdui-table-fluid" style="border-radius: 16px">
        <table class="mdui-table">
            <thead>
                <tr>
                    <th>功能</th>
                    <th>描述</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>基础设置</td>
                    <td>可以设置本站标题或其他信息</td>
                    <td><a class="mdui-btn mdui-color-theme-accent mdui-ripple" style="border-radius: 8px" href="/?page=admin&id=general">去设置</a></td>
                </tr>
                <tr>
                    <td>表白管理</td>
                    <td>可以删除本站表白信息</td>
                    <td><a class="mdui-btn mdui-color-theme-accent mdui-ripple" style="border-radius: 8px" href="/?page=admin&id=confession">去管理</a></td>
                </tr>
            </tbody>
        </table>
    </div>
`;

  const body = `<button id="submitbtn" style="color:#4F4F4F; border-radius: 8px" class="mdui-btn mdui-btn-icon mdui-float-right" onclick="logout()">
    <i class="mdui-icon material-icons">exit_to_app</i>
</button>
<div class="mdui-typo">
    <h1 class="doc-chapter-title doc-chapter-title-first mdui-text-color-theme">管理页面</h1>
</div>
<br /><br />
${content}`;

  return body + titleScript('', siteTitle);
}

// 基础设置页
export async function renderAdminGeneral(ctx: PageContext): Promise<string> {
  const cfg = ctx.cfg;
  const siteTitle = cfg.title || '未知表白墙';

  const field = (
    id: string,
    label: string,
    value: string,
    rows = false,
  ): string => {
    const valueAttr = esc(value);
    if (rows) {
      return `        <div class="mdui-textfield">
            <label class="mdui-textfield-label">${label}</label>
            <textarea id="${id}" class="mdui-textfield-input" rows="4" placeholder="${valueAttr}">${esc(value)}</textarea>
        </div>
`;
    }
    return `        <div class="mdui-textfield">
            <label class="mdui-textfield-label">${label}</label>
            <textarea id="${id}" class="mdui-textfield-input" placeholder="${valueAttr}">${esc(value)}</textarea>
        </div>
`;
  };

  const body = `<br /><br />
<div class="mdui-card mdui-hoverable" style="border-radius: 16px">
    <div class="mdui-card-media">
        <div class="mdui-card-menu">
            <a target="_blank" style="color:#4F4F4F" href="/?page=admin" class="mdui-btn mdui-btn-icon mdui-float-right">
                <i class="mdui-icon material-icons">arrow_back</i>
            </a>
        </div>
    </div>
    <div class="mdui-card-primary">
        <div class="mdui-card-primary-title">表白墙设置</div>
        <div class="mdui-card-primary-subtitle">此处可以设置您的表白墙！</div>
    </div>
    <div class="mdui-divider"></div>
    <div class="mdui-card-content">
${field('title', '表白墙标题', cfg.title ?? '')}${field('keywords', 'SEO关键词', cfg.keywords ?? '')}${field(
    'description',
    'SEO简介',
    cfg.description ?? '',
  )}${field('audio', '网站音频', cfg.audio ?? '')}${field(
    'more',
    '自定义页面标题（本站右侧应用栏的第三个列表）',
    cfg.more ?? '',
  )}${field(
    'more_content',
    '自定义页面（请使用html格式、本站右侧应用栏的第三个列表）',
    cfg.more_content ?? '',
    true,
  )}${field('about_content', '关于本站页面（请使用html格式）', cfg.about_content ?? '', true)}    </div>

    <div class="mdui-card-actions">
        <button id="submit-btn" style="border-radius: 8px" class="mdui-btn mdui-color-theme-accent mdui-ripple mdui-float-right" onclick="submit()">
            保存数据
        </button>
        <button id="help-btn" style="border-radius: 8px" class="mdui-btn mdui-color-theme-accent mdui-ripple mdui-float-right" onclick="getHelp()">
            使用帮助
        </button>
    </div>
    <script>
        function submit() {
            configArr = ['title', 'keywords', 'description', 'audio', 'more', 'more_content', 'about_content'];
            for (let i = 0; i < configArr.length; i++) {
                if ($("#" + configArr[i]).val() != $("#" + configArr[i]).attr('placeholder')) {
                    value = $("#" + configArr[i]).val();
                    requestApi("update_config", {
                        name: configArr[i],
                        value: value
                    }, false, true, false, "submit-btn")
                }
            }
        }

        function getHelp() {
            mdui.snackbar({
                message: "正在加载帮助信息中...",
                position: 'right-top'
            });
            $.get("https://static.llilii.cn/json/loveway_help.json", function(data, status) {
                mdui.snackbar({
                    message: "加载成功！",
                    position: 'right-top'
                });
                mdui.dialog({
                    title: data.title,
                    content: data.content,
                });
            });
        }
    </script>
</div>
<br /><br />
`;

  return body + titleScript('', siteTitle);
}

// 表白管理页
export async function renderAdminConfession(ctx: PageContext): Promise<string> {
  let rows: ConfessionRow[] = [];
  let failed = false;
  try {
    const result = await ctx.env.DB.prepare('SELECT * FROM loveway_data ORDER BY time ASC').all<
      ConfessionRow
    >();
    rows = result.results ?? [];
  } catch {
    failed = true;
  }

  let tbody = '';
  if (failed) {
    tbody = '<tr><td colspan="6">抱歉！连接数据库失败！</td></tr>';
  } else if (rows.length === 0) {
    tbody = '<tr><td colspan="6">暂无表白信息。</td></tr>';
  } else {
    for (const row of rows) {
      const cardUrl = `/?page=card&id=${row.id}`;
      tbody += `                        <tr id="id-${row.id}">
                            <td>${row.id}</td>
                            <td>${row.favorite}</td>
                            <td>${esc(row.confessor)}</td>
                            <td>${esc(row.to_who)}</td>
                            <td>${esc(row.time)}</td>
                            <td>
                                <button id="delete-${row.id}" mdui-tooltip="{content: '删除此表白'}" class="mdui-color-theme-accent mdui-btn mdui-btn-icon mdui-text-color-white" onclick="deleteF('${row.id}')"><i class="mdui-icon material-icons">delete</i></button>
                                <a id="to-${row.id}" mdui-tooltip="{content: '去看看'}" class="mdui-color-theme-accent mdui-btn mdui-btn-icon mdui-text-color-white" href="${cardUrl}" target="_BLANK"><i class="mdui-icon material-icons">keyboard_arrow_right</i></a>
                            </td>
                        </tr>
`;
    }
  }

  const body = `<a target="_blank" style="color:#4F4F4F" href="/?page=admin" class="mdui-btn mdui-btn-icon mdui-float-right">
    <i class="mdui-icon material-icons">arrow_back</i>
</a>

<div class="mdui-typo">
    <h1 class="doc-chapter-title doc-chapter-title-first mdui-text-color-theme">表白管理</h1>
</div>
<br /><br />
<div class="mdui-table-fluid" style="border-radius: 16px">
    <table class="mdui-table">
        <thead>
            <tr>
                <th>表白标识符</th>
                <th>被点赞的次数</th>
                <th>表白人</th>
                <th>表白给</th>
                <th>时间</th>
                <th>可用操作</th>
            </tr>
        </thead>
        <tbody>
${tbody}        </tbody>
    </table>
</div>

<script>
    function deleteF(id) {
        requestApi("delete_confession", {
            id: id
        }, false, true, true, "")
    }
</script>
`;

  return body;
}
