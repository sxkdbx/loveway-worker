import type { Env } from './env';

// 等价于 PHP 的 htmlspecialchars（默认标志：转义 & " < >，不转义单引号）
export function esc(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 等价于 PHP 的 nl2br
export function nl2br(input: string): string {
  return esc(input).replace(/\r\n|\n|\r/g, '<br />');
}

// 读取站点配置项（对应 getInfo）
export async function getInfo(env: Env, name: string): Promise<string> {
  const row = await env.DB.prepare('SELECT value FROM loveway_config WHERE name = ?')
    .bind(name)
    .first<{ value: string }>();
  return row?.value ?? '';
}

// 一次性读取全部配置项，减少数据库查询次数
export async function getConfigMap(env: Env, names: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (names.length === 0) return result;
  const placeholders = names.map(() => '?').join(',');
  const rows = await env.DB.prepare(
    `SELECT name, value FROM loveway_config WHERE name IN (${placeholders})`,
  )
    .bind(...names)
    .all<{ name: string; value: string }>();
  for (const r of rows.results ?? []) result[r.name] = r.value;
  return result;
}

// 解析 Cookie 头
export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get('Cookie') || '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    let val = part.slice(idx + 1).trim();
    try {
      val = decodeURIComponent(val);
    } catch {
      // 保留原始值
    }
    out[key] = val;
  }
  return out;
}

// 返回 JSON 响应
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// 返回 HTML 响应
export function htmlResponse(html: string, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', ...(extraHeaders ?? {}) },
  });
}

// 等价于 PHP date('Y-m-d')，使用 UTC+8（与原项目面向中文用户一致）
export function todayInShanghai(now: Date = new Date()): string {
  // 取 UTC+8 的日期部分
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const sh = new Date(utc + 8 * 3600000);
  const y = sh.getFullYear();
  const m = String(sh.getMonth() + 1).padStart(2, '0');
  const d = String(sh.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 格式化为 YYYY-MM-DD HH:mm:ss（UTC+8）
export function formatDateTimeShanghai(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const sh = new Date(utc + 8 * 3600000);
  const y = sh.getFullYear();
  const mo = String(sh.getMonth() + 1).padStart(2, '0');
  const da = String(sh.getDate()).padStart(2, '0');
  const h = String(sh.getHours()).padStart(2, '0');
  const mi = String(sh.getMinutes()).padStart(2, '0');
  const s = String(sh.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${da} ${h}:${mi}:${s}`;
}

// 生成表白 id（对应原 rand(100000000, 999999999)）
export function randomLoveId(): number {
  return Math.floor(100000000 + Math.random() * 900000000);
}
