import type { Env } from './env';
import type { Settings } from './env';
import { jsonResponse, formatDateTimeShanghai, randomLoveId } from './util';
import { getSessionId, setVcode, consumeVcode } from './session';
import { generateCode, renderCaptchaSVG } from './captcha';
import { parseComments } from './pages';
import { isAdmin, adminTokenCookie, timestampOk } from './auth';
import { md5 } from './md5';

function formStr(form: FormData, key: string): string {
  const v = form.get(key);
  return v == null ? '' : String(v);
}

function json(data: unknown, status = 200, setCookie?: string): Response {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
  };
  if (setCookie) headers['set-cookie'] = setCookie;
  return new Response(JSON.stringify(data), { status, headers });
}

// 校验是否为真实 PNG/JPEG 的文件头（对应原 getimagesize）
function isImageBytes(b: Uint8Array): boolean {
  if (b.length < 4) return false;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return true;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
  return false;
}

// GET /api/vcode.php —— 图形验证码
export async function handleVcode(req: Request, env: Env): Promise<Response> {
  const { sessionId, setCookie } = getSessionId(req);
  const code = generateCode();
  await setVcode(env, sessionId, code);
  const svg = renderCaptchaSVG(code);
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'no-store',
      ...(setCookie ? { 'set-cookie': setCookie } : {}),
    },
  });
}

// POST /api/submit.php —— 提交表白
export async function handleSubmit(req: Request, env: Env, s: Settings): Promise<Response> {
  const form = await req.formData();
  const { sessionId } = getSessionId(req);

  const confessor = formStr(form, 'name');
  const rawContact = formStr(form, 'contact');
  const ta = formStr(form, 'taName');
  const image = formStr(form, 'image');
  const introduction = formStr(form, 'introduceTA');
  const content = formStr(form, 'toTA');
  const timestamp = formStr(form, 'timestamp');
  const vCode = formStr(form, 'vCode');
  const key = formStr(form, 'key');

  const contactNum = parseInt(rawContact, 10);
  const contact = Number.isNaN(contactNum) ? '' : String(contactNum);

  if (!confessor || !contact || contact === '0' || !ta || !introduction || !content) {
    return json({ code: -3, msg: '表单未填写完整或存在错误！' });
  }

  if (!(await consumeVcode(env, sessionId, vCode))) {
    return json({ code: -2, msg: '抱歉，人机验证失败', result: '' });
  }

  if (!timestampOk(timestamp)) {
    return json({ code: -5, msg: '提交失败！请检查您的系统时间！' });
  }

  const all =
    'Kagamine Yes!' + contact + confessor + ta + image + introduction + content + timestamp;
  if (md5(all) !== key) {
    return json({ code: -5, msg: '出现了一个未知错误！请联系管理员！' });
  }

  try {
    let loveId = randomLoveId();
    for (let i = 0; i < 5; i++) {
      const existing = await env.DB.prepare('SELECT id FROM loveway_data WHERE id = ?')
        .bind(loveId)
        .first();
      if (!existing) break;
      loveId = randomLoveId();
    }
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO loveway_data(id,favorite,confessor,contact,time,to_who,introduction,content,image,comment)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        loveId,
        0,
        confessor,
        contact,
        formatDateTimeShanghai(now),
        ta,
        introduction,
        content,
        image,
        '[]',
      )
      .run();
    return json({ code: 1, id: String(loveId), msg: '表白信息提交成功！' });
  } catch {
    return json({ code: -1, msg: '抱歉，出现了一个致命错误！请与管理员联系！' });
  }
}

// POST /api/favorite.php —— 点赞
export async function handleFavorite(req: Request, env: Env, s: Settings): Promise<Response> {
  const form = await req.formData();
  const { sessionId } = getSessionId(req);
  const id = formStr(form, 'id');
  const timestamp = formStr(form, 'timestamp');
  const vCode = formStr(form, 'vCode');

  if (!(await consumeVcode(env, sessionId, vCode))) {
    return json({ code: -2, msg: '抱歉，人机验证失败', result: '' });
  }
  if (!timestampOk(timestamp)) {
    return json({ code: -5, msg: '提交失败！请检查您的系统时间！' });
  }

  try {
    const row = await env.DB.prepare('SELECT favorite FROM loveway_data WHERE id = ?')
      .bind(id)
      .first<{ favorite: number }>();
    if (!row) {
      return json({ code: -2, msg: '抱歉，出现了一个未知错误！请与管理员联系！' });
    }
    const newCount = (row.favorite ?? 0) + 1;
    await env.DB.prepare('UPDATE loveway_data SET favorite = ? WHERE id = ?')
      .bind(newCount, id)
      .run();
    return json({ code: 1, favorite: String(newCount), msg: '点赞成功！' });
  } catch {
    return json({ code: -1, msg: '抱歉，出现了一个致命错误！请与管理员联系！' });
  }
}

// POST /api/comment.php —— 评论
export async function handleComment(req: Request, env: Env, s: Settings): Promise<Response> {
  const form = await req.formData();
  const { sessionId } = getSessionId(req);
  const id = formStr(form, 'id');
  const nickname = formStr(form, 'nickname');
  const content = formStr(form, 'content');
  const timestamp = formStr(form, 'timestamp');
  const vCode = formStr(form, 'vCode');

  if (!(await consumeVcode(env, sessionId, vCode))) {
    return json({ code: -2, msg: '抱歉，人机验证失败', result: '' });
  }
  if (!timestampOk(timestamp)) {
    return json({ code: -5, msg: '提交失败！请检查您的系统时间！' });
  }
  if (!id || !nickname || !content) {
    return json({ code: -6, msg: '表单提交失败！某些参数为空！' });
  }

  try {
    const row = await env.DB.prepare('SELECT comment FROM loveway_data WHERE id = ?')
      .bind(id)
      .first<{ comment: string }>();
    if (!row) {
      return json({ code: -2, msg: '抱歉，出现了一个未知错误！请与管理员联系！' });
    }
    const comments = parseComments(row.comment);
    comments.push({ time: Math.floor(Date.now() / 1000), nickname, content });
    await env.DB.prepare('UPDATE loveway_data SET comment = ? WHERE id = ?')
      .bind(JSON.stringify(comments), id)
      .run();
    return json({
      code: 1,
      commentNum: comments.length,
      commentSrc: comments,
      msg: '评论提交成功！',
    });
  } catch {
    return json({ code: -1, msg: '抱歉，出现了一个致命错误！请与管理员联系！' });
  }
}

// POST /api/login.php —— 管理员登录
export async function handleLogin(req: Request, env: Env, s: Settings): Promise<Response> {
  const form = await req.formData();
  const { sessionId } = getSessionId(req);
  const username = formStr(form, 'username');
  const password = formStr(form, 'password');
  const vcode = formStr(form, 'vcode');
  const timestamp = formStr(form, 'timestamp');

  if (!(await consumeVcode(env, sessionId, vcode))) {
    return json({ code: -1, msg: '抱歉，人机验证失败', result: '' });
  }
  if (!timestampOk(timestamp)) {
    return json({ code: -2, msg: '请求失败！请检查您的系统时间！' });
  }

  if (username === s.adminUser && password === s.adminPass) {
    return json({ code: 1, msg: '登录成功！' }, 200, adminTokenCookie(s));
  }
  return json({ code: -1, msg: '登录失败！用户名或密码错误！' });
}

// POST /api/delete_confession.php —— 删除表白（管理员）
export async function handleDeleteConfession(
  req: Request,
  env: Env,
  s: Settings,
): Promise<Response> {
  if (!isAdmin(req, s)) {
    return json({ code: -1, msg: '鉴权失败！' });
  }
  if (s.adminPass === 'kagamine1234') {
    return json({ code: -2, msg: '弱密码禁止操作！请修改密码后登录！' });
  }
  const form = await req.formData();
  const id = formStr(form, 'id');
  try {
    await env.DB.prepare('DELETE FROM loveway_data WHERE id = ?').bind(id).run();
    return json({ code: 1, msg: '删除成功！' });
  } catch {
    return json({ code: -3, msg: '操作失败！[DELETE DATABASE]失败！' });
  }
}

// POST /api/update_config.php —— 更新站点配置（管理员）
export async function handleUpdateConfig(
  req: Request,
  env: Env,
  s: Settings,
): Promise<Response> {
  if (!isAdmin(req, s)) {
    return json({ code: -1, msg: '鉴权失败！' });
  }
  if (s.adminPass === 'kagamine1234') {
    return json({ code: -2, msg: '弱密码禁止操作！请修改密码后登录！' });
  }
  const form = await req.formData();
  const name = formStr(form, 'name');
  const value = formStr(form, 'value');
  try {
    const existing = await env.DB.prepare('SELECT id FROM loveway_config WHERE name = ?')
      .bind(name)
      .first();
    if (existing) {
      await env.DB.prepare('UPDATE loveway_config SET value = ? WHERE name = ?')
        .bind(value, name)
        .run();
    } else {
      await env.DB.prepare('INSERT INTO loveway_config(id, name, value) VALUES(?, ?, ?)')
        .bind(Math.floor(100000 + Math.random() * 900000), name, value)
        .run();
    }
    return json({ code: 1, msg: '操作成功！' });
  } catch {
    return json({ code: -3, msg: '操作失败！[UPDATE DATABASE]失败！' });
  }
}

// POST /api/upload.php —— 图片上传（存入 R2）
export async function handleUpload(req: Request, env: Env, s: Settings): Promise<Response> {
  const form = await req.formData();
  const { sessionId } = getSessionId(req);
  const timestamp = formStr(form, 'timestamp');
  const vcode = formStr(form, 'vcode');

  if (!timestampOk(timestamp)) {
    return json({ code: -2, msg: '上传失败！请检查您的系统时间！' });
  }
  if (!(await consumeVcode(env, sessionId, vcode))) {
    return json({ code: -1, msg: '抱歉，人机验证失败', result: '' });
  }
  if (!s.uploadImage) {
    return json({ code: -5, msg: '上传失败！上传接口被关闭！', path: '' });
  }

  const file = form.get('file');
  if (!file || typeof file === 'string' || !file.name) {
    return json({ code: -12, msg: '上传失败！没有文件！', path: '' });
  }

  const dotIdx = file.name.lastIndexOf('.');
  const ext = dotIdx === -1 ? '' : file.name.slice(dotIdx).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
    return json({ code: -6, msg: '上传失败！文件类型不符合要求！', path: '' });
  }
  if (!['image/png', 'image/jpg', 'image/jpeg'].includes(file.type)) {
    return json({ code: -7, msg: '上传失败！文件类型错误！', path: '' });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > s.maxUploadSize * 1024) {
    return json({ code: -8, msg: '上传失败！文件过大', path: '' });
  }
  if (!isImageBytes(bytes)) {
    return json({ code: -9, msg: '上传失败！读取图像文件失败！', path: '' });
  }

  const newName = md5(s.verificationKey + String(Math.floor(Date.now() / 1000)));
  const objectKey = newName + ext;
  const contentType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  try {
    // 存入 KV：图片字节作为 value，contentType 放在 metadata
    await env.UPLOADS.put(objectKey, bytes, {
      metadata: { contentType },
    });
  } catch {
    return json({ code: -11, msg: '上传失败！未知错误！', path: '' });
  }
  return json({ code: 1, msg: '上传成功！', path: '/uploads/' + objectKey });
}
