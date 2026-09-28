// Cloudflare Workers 环境绑定与配置类型
export interface Env {
  // D1 数据库
  DB: D1Database;
  // KV 命名空间（存储表白配图）
  UPLOADS: KVNamespace;
  // 管理员账号
  ADMIN_USER: string;
  // 管理员密码（建议使用 wrangler secret put ADMIN_PASS）
  ADMIN_PASS: string;
  // 验证码签名用的任意字符串
  VERIFICATION_KEY: string;
  // 单页最多表白数
  PAGEMAX: string;
  // 最大上传大小（KB）
  MAX_UPLOAD_SIZE: string;
  // 是否允许上传图片
  UPLOAD_IMAGE: string;
}

// 一次请求中需要的派生配置
export interface Settings {
  adminUser: string;
  adminPass: string;
  verificationKey: string;
  pageMax: number;
  maxUploadSize: number; // KB
  uploadImage: boolean;
}

export function getSettings(env: Env): Settings {
  return {
    adminUser: env.ADMIN_USER ?? 'kagamine',
    adminPass: env.ADMIN_PASS ?? 'kagamine1234',
    verificationKey: env.VERIFICATION_KEY ?? 'KAGAMINE YES!',
    pageMax: parseInt(env.PAGEMAX ?? '10', 10) || 10,
    maxUploadSize: parseInt(env.MAX_UPLOAD_SIZE ?? '200', 10) || 200,
    uploadImage: (env.UPLOAD_IMAGE ?? 'true') === 'true',
  };
}
