import type { Env } from './env';
import { getSettings } from './env';
import { getConfigMap, jsonResponse, htmlResponse } from './util';
import {
  type PageContext,
  renderHomePage,
  renderSubmitPage,
  renderCardPage,
  renderMorePage,
  renderAboutPage,
  renderLoginPage,
  render404,
  renderErrPage,
} from './pages';
import { renderAdminHome, renderAdminGeneral, renderAdminConfession } from './admin';
import { renderHeader, renderFooter, type ActiveNav } from './layouts';
import { isAdmin } from './auth';
import {
  handleVcode,
  handleSubmit,
  handleFavorite,
  handleComment,
  handleLogin,
  handleDeleteConfession,
  handleUpdateConfig,
  handleUpload,
} from './api';

const CONFIG_NAMES = [
  'title',
  'keywords',
  'description',
  'audio',
  'submit',
  'more',
  'about',
  'more_content',
  'about_content',
];

// API 路由
async function routeApi(req: Request, env: Env, path: string): Promise<Response> {
  const settings = getSettings(env);
  if (req.method !== 'POST' && path !== '/api/vcode.php') {
    return jsonResponse({ code: 405, msg: 'method not allowed' }, 405);
  }
  switch (path) {
    case '/api/vcode.php':
      return handleVcode(req, env);
    case '/api/submit.php':
      return handleSubmit(req, env, settings);
    case '/api/favorite.php':
      return handleFavorite(req, env, settings);
    case '/api/comment.php':
      return handleComment(req, env, settings);
    case '/api/login.php':
      return handleLogin(req, env, settings);
    case '/api/delete_confession.php':
      return handleDeleteConfession(req, env, settings);
    case '/api/update_config.php':
      return handleUpdateConfig(req, env, settings);
    case '/api/upload.php':
      return handleUpload(req, env, settings);
    default:
      return jsonResponse({ code: 404, msg: 'api not found' }, 404);
  }
}

// GET /uploads/<key> —— 从 KV 读取已上传的图片
async function routeUploadsGet(env: Env, path: string): Promise<Response> {
  let key = path.slice('/uploads/'.length);
  try {
    key = decodeURIComponent(key);
  } catch {
    // 保留原始 key
  }
  if (!key) return new Response('not found', { status: 404 });
  const { value, metadata } = await env.UPLOADS.getWithMetadata<{ contentType?: string }>(
    key,
    { type: 'arrayBuffer' },
  );
  if (!value) return new Response('not found', { status: 404 });
  const headers = new Headers();
  headers.set('content-type', metadata?.contentType ?? 'application/octet-stream');
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(value, { headers });
}

// 页面路由
async function routePage(req: Request, env: Env, url: URL): Promise<Response> {
  const settings = getSettings(env);
  const page = url.searchParams.get('page') ?? '';
  const cardId = url.searchParams.get('id') ?? '';
  const search = url.searchParams.get('search') ?? '';
  const pageNo = Math.max(1, parseInt(url.searchParams.get('p') ?? '1', 10) || 1);
  const isPjax =
    url.searchParams.has('_pjax') || req.headers.get('x-pjax') !== null;

  let cfg: Record<string, string> = {};
  try {
    cfg = await getConfigMap(env, CONFIG_NAMES);
  } catch {
    return new Response(renderErrPage(), {
      status: 500,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const pctx: PageContext = {
    env,
    origin: url.origin,
    page,
    cardId,
    search,
    pageNo,
    settings,
    cfg,
  };

  const siteTitle = cfg.title || '未知表白墙';

  try {
    // 404 是独立完整页面，直接返回
    if (page === '404') {
      return htmlResponse(render404(pctx), 404);
    }

    let fragment = '';
    let active: ActiveNav = '';
    let pageTitle = '';

    switch (page) {
      case '':
        fragment = await renderHomePage(pctx);
        active = 'home';
        break;
      case 'submit':
        fragment = await renderSubmitPage(pctx);
        active = 'submit';
        pageTitle = cfg.submit || '';
        break;
      case 'more':
        fragment = await renderMorePage(pctx);
        active = 'more';
        pageTitle = cfg.more || '';
        break;
      case 'about':
        fragment = await renderAboutPage(pctx);
        active = 'about';
        pageTitle = cfg.about || '';
        break;
      case 'card':
        fragment = await renderCardPage(pctx);
        break;
      case 'login':
        fragment = renderLoginPage(pctx);
        break;
      case 'admin':
        if (isAdmin(req, settings)) {
          if (cardId === '') {
            fragment = await renderAdminHome(pctx);
          } else if (cardId === 'general') {
            fragment = await renderAdminGeneral(pctx);
          } else if (cardId === 'confession') {
            fragment = await renderAdminConfession(pctx);
          } else {
            return htmlResponse(render404(pctx), 404);
          }
        } else {
          fragment = renderLoginPage(pctx);
        }
        break;
      default:
        return htmlResponse(render404(pctx), 404);
    }

    if (isPjax) {
      return htmlResponse(fragment);
    }

    const header = renderHeader({
      siteTitle,
      pageTitle,
      keywords: cfg.keywords || '',
      description: cfg.description || '',
      audio: cfg.audio || '',
      navLabels: {
        submit: cfg.submit || '',
        more: cfg.more || '',
        about: cfg.about || '',
      },
      active,
    });
    return htmlResponse(header + fragment + renderFooter());
  } catch {
    return new Response(renderErrPage(), {
      status: 500,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path.startsWith('/api/')) {
      return routeApi(req, env, path);
    }
    if (path.startsWith('/uploads/')) {
      return routeUploadsGet(env, path);
    }
    if (path === '/' || path === '') {
      return routePage(req, env, url);
    }
    // 其他路径（非静态资源）输出 404
    const settings = getSettings(env);
    let cfg: Record<string, string> = {};
    try {
      cfg = await getConfigMap(env, ['title']);
    } catch {
      cfg = {};
    }
    const pctx: PageContext = {
      env,
      origin: url.origin,
      page: '404',
      cardId: '',
      search: '',
      pageNo: 1,
      settings,
      cfg,
    };
    return htmlResponse(render404(pctx), 404);
  },
};
