-- 未知表白墙 - Cloudflare D1 初始化脚本
-- 用法：
--   本地：wrangler d1 execute loveway --local --file=./schema.sql
--   线上：wrangler d1 execute loveway --remote --file=./schema.sql

-- 站点配置表（对应原 loveway_config）
DROP TABLE IF EXISTS loveway_config;
CREATE TABLE loveway_config (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  value TEXT NOT NULL
);

-- 表白数据表（对应原 loveway_data）
DROP TABLE IF EXISTS loveway_data;
CREATE TABLE loveway_data (
  id           INTEGER PRIMARY KEY,
  favorite     INTEGER NOT NULL DEFAULT 0,
  confessor    TEXT NOT NULL,
  contact      TEXT NOT NULL,
  time         TEXT NOT NULL,
  to_who       TEXT NOT NULL,
  introduction TEXT NOT NULL,
  content      TEXT NOT NULL,
  image        TEXT NOT NULL,
  comment      TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX idx_loveway_data_time ON loveway_data (time);

-- 会话表（替代 PHP session，用于保存图形验证码答案）
DROP TABLE IF EXISTS loveway_sessions;
CREATE TABLE loveway_sessions (
  id         TEXT PRIMARY KEY,
  vcode      TEXT,
  created_at INTEGER NOT NULL
);

-- 初始站点配置
INSERT INTO loveway_config (id, name, value) VALUES
(216039, 'title', '未知表白墙'),
(345445, 'about', '关于本站'),
(385031, 'more', '开发初衷'),
(393564, 'about_content', '欢迎来到由吴先森开发的表白墙！<br />本站使用MDUI开发<br /><br />另外...说一下本表白墙的服务条款吧...<br />1.发言请遵守当地法律法规和学校规章制度，吴先森的表白墙保留对于发布不良信息和人身攻击的自然人追究法律责任的权利。<br />2.如发现有消息对个人生活产生困扰或想要获取告白者的联系方式，请联系网站管理员。<br />3.让我当大号电灯泡和吃点狗粮吧，23333333333'),
(572965, 'submit', '去表白'),
(578760, 'keywords', '未知表白墙,Kagamine'),
(782431, 'description', '本表白墙献给最可爱的镜音双子！！'),
(878767, 'audio', 'https://static.llilii.cn/music/pLwBSoCOjwTtBPQyahC.mp3'),
(928519, 'more_content', '其实....开发这个表白墙的初衷...
        其实是主要是为了让更多人知道镜音双子，233
        （你应该发现了整个表白墙的图片都是镜音连和镜音铃的，且这些图片都没有更换的设置，2333，要你手动改代码
        虽然现在镜音双子基本上活成了小透明，连B站某些V家爱好者自己办的节目，都一首双子的歌都没有（虽然其他一些不知名虚拟歌姬好像也没有的也没有），555555，只有双子和初音、GUMI的绘师作品集
        另外吐槽一下B站，把VTB和虚拟歌姬混为一谈，有些VTB还自称“虚拟歌姬”，真的是...无语了，真的想回到那个有一首初音或其他虚拟歌姬的歌就能全站沸腾的局面了
        现在甚至希望B站不要破圈，不要引入那些乱七八糟的流量明星进来（虽然叔叔我呀，最讨厌不能赚钱的东西了）');
