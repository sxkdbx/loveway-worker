# 未知表白墙 · Cloudflare Workers 版

把 PHP + MySQL 版 [loveway-php](https://github.com/unknown-o/loveway-php) 完整移植到 Cloudflare Workers，无需自己买服务器，免费额度即可运行。

## 技术对应关系

| 原 PHP 版本 | Workers 版本 |
|---|---|
| PHP 服务端渲染 | Worker（TypeScript）SSR |
| MySQL（PDO） | Cloudflare **D1**（SQLite） |
| 本地文件 `static/uploads` | Cloudflare **KV** 命名空间 |
| GD 生成验证码 PNG | 纯代码生成验证码 **SVG** |
| PHP Session（验证码答案） | D1 会话表 + HttpOnly Cookie |
| 静态资源（MDUI/jQuery/字体） | Workers **Static Assets** |
| `config.php` 管理员账号密码 | `wrangler.jsonc` 变量 / Secret |

功能与原版一致：表白列表、搜索、分页、提交表白、卡片详情、点赞、评论、图形验证码、图片上传、管理后台（基础设置 / 表白管理）、Pjax 无刷新切换。

## 前置要求

- [Node.js](https://nodejs.org) 18 及以上
- 一个 Cloudflare 账号（免费即可）
- 在终端登录 Wrangler：

```bash
npm install
npx wrangler login
```

## 部署步骤

### 1. 创建 D1 数据库

```bash
npx wrangler d1 create loveway
```

命令会输出一个 `database_id`，把它复制到 `wrangler.jsonc` 中对应的位置：

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "loveway",
    "database_id": "把上面的 id 粘贴到这里"
  }
]
```

### 2. 初始化数据库（建表 + 初始站点配置）

```bash
npx wrangler d1 execute loveway --remote --file=./schema.sql
```

### 3. 创建 KV 命名空间（用于表白配图上传）

```bash
npx wrangler kv namespace create UPLOADS
```

把命令输出的 `id` 填入 `wrangler.jsonc` 中 `kv_namespaces` 对应的 `id` 字段。

> 不需要图片上传功能时：可删除 `wrangler.jsonc` 里的 `kv_namespaces` 段，并把 `vars.UPLOAD_IMAGE` 改为 `"false"`，提交页会隐藏“选择图片”按钮。

### 4. 修改管理员账号密码

**方式一（简单）**：直接改 `wrangler.jsonc` 里的 `vars`：

```jsonc
"vars": {
  "ADMIN_USER": "你的用户名",
  "ADMIN_PASS": "你的强密码",
  ...
}
```

**方式二（更安全，推荐）**：密码用 Secret 保存，先从 `vars` 中删掉 `ADMIN_PASS` 一行，然后执行：

```bash
npx wrangler secret put ADMIN_PASS
```

> 务必改掉默认密码 `kagamine1234`。沿用默认（弱）密码时，管理后台会被安全屏蔽，且无法删除表白 / 修改配置。

### 5. 部署

```bash
npx wrangler deploy
```

部署成功后会得到一个 `https://loveway.<你的子域>.workers.dev` 地址，打开即可使用。

后台登录入口：`https://你的域名/?page=admin`

## 本地开发

```bash
# 初始化本地 D1（首次）
npx wrangler d1 execute loveway --local --file=./schema.sql

# 启动本地开发服务器（含本地 D1 / KV 模拟）
npx wrangler dev
```

本地跑自动化测试：

```bash
python3 smoke_test.py    # 提交/点赞/评论/登录/后台/Pjax/404
python3 upload_test.py   # KV 图片上传与安全校验
```

## 常用运维命令

```bash
# 修改站点配置后重新部署
npx wrangler deploy

# 查看 D1 数据
npx wrangler d1 execute loveway --remote --command="SELECT id, confessor, time FROM loveway_data ORDER BY time DESC;"

# 查看已设置的 Secret
npx wrangler secret list

# 绑定自定义域名：Cloudflare 控制台 → Workers & Pages → 你的 Worker → Settings → Domains & Routes
```

## 说明与注意事项

- 页面路由沿用原版的 query string 形式（`/?page=card&id=...`），前端 JS 与原版保持一致，无需伪静态配置。
- 表白时间、评论时间按 UTC+8 显示；管理登录 token 按 UTC+8 日期计算，有效期 1 小时。
- KV 免费额度：1 GB 存储、每天 10 万次读 / 1000 次写；D1 免费额度：5 GB 存储、每天 500 万次读。200 KB 以内的小图片、小型表白墙完全够用。
- KV 为最终一致性（通常 1 分钟内全球生效），单值上限 25 MB；图片 content-type 保存在 KV metadata 中。
- 上传图片默认限制 200 KB，仅允许 PNG/JPG/JPEG，并校验真实文件头；可在 `wrangler.jsonc` 的 `MAX_UPLOAD_SIZE`、`UPLOAD_IMAGE` 调整。
- 原程序版权归原作者 UnknownO，采用 GPL-2.0；本移植版同样遵循该协议。
