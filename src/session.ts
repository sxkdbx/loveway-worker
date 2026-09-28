import type { Env } from './env';
import { parseCookies } from './util';

export const SESSION_COOKIE = 'loveway_session';
const SESSION_TTL_SECONDS = 86400;

// 获取当前会话 id；若请求中没有则生成新的，并返回需要 Set-Cookie 的值
export function getSessionId(req: Request): { sessionId: string; setCookie?: string } {
  const cookies = parseCookies(req);
  const existing = cookies[SESSION_COOKIE];
  if (existing && /^[A-Za-z0-9_-]{16,}$/.test(existing)) {
    return { sessionId: existing };
  }
  const sessionId = crypto.randomUUID();
  const setCookie = `${SESSION_COOKIE}=${sessionId}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; SameSite=Lax`;
  return { sessionId, setCookie };
}

// 保存本次图形验证码答案（一次性）
export async function setVcode(env: Env, sessionId: string, code: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO loveway_sessions(id, vcode, created_at) VALUES(?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET vcode = excluded.vcode, created_at = excluded.created_at`,
  )
    .bind(sessionId, code, now)
    .run();
  // 顺手清理过期会话
  await env.DB.prepare('DELETE FROM loveway_sessions WHERE created_at < ?')
    .bind(now - SESSION_TTL_SECONDS)
    .run();
}

// 校验并消费验证码；成功或失败后该验证码都失效
export async function consumeVcode(
  env: Env,
  sessionId: string,
  input: string,
): Promise<boolean> {
  const row = await env.DB.prepare('SELECT vcode FROM loveway_sessions WHERE id = ?')
    .bind(sessionId)
    .first<{ vcode: string | null }>();
  // 无论对错，先作废
  await env.DB.prepare('UPDATE loveway_sessions SET vcode = NULL WHERE id = ?')
    .bind(sessionId)
    .run();
  if (!row || row.vcode == null) return false;
  return row.vcode === String(input).trim();
}
