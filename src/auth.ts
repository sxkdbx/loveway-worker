import type { Settings } from './env';
import { parseCookies, todayInShanghai } from './util';
import { md5 } from './md5';

export const TOKEN_COOKIE = 'loveway_token';

// 对应原项目：md5(ADMIN_USER . ADMIN_PASS . 'KAGAMINE WORLD!' . date('Y-m-d'))
export function adminToken(settings: Settings, day: string = todayInShanghai()): string {
  return md5(settings.adminUser + settings.adminPass + 'KAGAMINE WORLD!' + day);
}

// 校验请求是否已登录为管理员（兼容当天与前一天的 token，避免时区边界掉线）
export function isAdmin(req: Request, settings: Settings): boolean {
  const token = parseCookies(req)[TOKEN_COOKIE];
  if (!token) return false;
  const today = todayInShanghai();
  const yesterday = todayInShanghai(new Date(Date.now() - 86400000));
  return token === adminToken(settings, today) || token === adminToken(settings, yesterday);
}

// 登录成功后设置的 cookie
export function adminTokenCookie(settings: Settings): string {
  return `${TOKEN_COOKIE}=${adminToken(settings)}; Path=/; Max-Age=3600; HttpOnly; SameSite=Lax`;
}

// 时间戳是否在 ±60 秒内
export function timestampOk(ts: string): boolean {
  const t = parseInt(ts, 10);
  if (Number.isNaN(t)) return false;
  return Math.abs(t - Math.floor(Date.now() / 1000)) <= 60;
}
