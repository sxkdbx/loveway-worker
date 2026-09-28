#!/usr/bin/env python3
"""端到端冒烟测试：在本地 wrangler dev 上走一遍核心流程。"""
import json
import subprocess
import time
import hashlib
import urllib.request
import urllib.parse
import urllib.error
import http.cookiejar

BASE = "http://localhost:8787"
WRANGLER_DIR = "/home/user/Doubao/chats/38443842937762050/loveway-worker"

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'} {name} {detail}")


def get_vcode():
    """请求验证码并从本地 D1 查出答案。"""
    opener.open(BASE + "/api/vcode.php").read()
    sid = None
    for c in cj:
        if c.name == "loveway_session":
            sid = c.value
    out = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "loveway", "--local", "--json",
         "--command", f"SELECT vcode FROM loveway_sessions WHERE id='{sid}'"],
        cwd=WRANGLER_DIR, capture_output=True, text=True,
    )
    data = json.loads(out.stdout)
    return data[0]["results"][0]["vcode"]


def post_form(path, fields):
    body = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(BASE + path, data=body, method="POST")
    resp = opener.open(req)
    return json.loads(resp.read().decode())


# 1. 提交表白
code = get_vcode()
ts = int(time.time())
contact = "2333333333"
fields = {
    "name": "镜音连", "contact": contact, "taName": "镜音铃",
    "image": "https://example.com/a.png", "introduceTA": "元气的二次元少女",
    "toTA": "我喜欢你！", "timestamp": ts, "vCode": code,
}
key_src = "Kagamine Yes!" + contact + fields["name"] + fields["taName"] + fields["image"] + fields["introduceTA"] + fields["toTA"] + str(ts)
fields["key"] = hashlib.md5(key_src.encode()).hexdigest()
r = post_form("/api/submit.php", fields)
check("提交表白", r.get("code") == 1, r)
love_id = r.get("id")

# 2. 卡片页
html = opener.open(BASE + f"/?page=card&id={love_id}").read().decode()
check("卡片页渲染", "镜音铃" in html and "我喜欢你" in html, f"len={len(html)}")

# 3. 点赞
code = get_vcode()
r = post_form("/api/favorite.php", {"id": love_id, "vCode": code, "timestamp": int(time.time())})
check("点赞", r.get("code") == 1 and r.get("favorite") == "1", r)

# 4. 评论
code = get_vcode()
r = post_form("/api/comment.php", {
    "id": love_id, "nickname": "路人", "content": "加油！\n一定会成功的",
    "vCode": code, "timestamp": int(time.time())})
check("评论", r.get("code") == 1 and r.get("commentNum") == 1, r)

# 5. 错误验证码被拒
r = post_form("/api/favorite.php", {"id": love_id, "vCode": "0000", "timestamp": int(time.time())})
check("错误验证码拒绝", r.get("code") == -2, r)

# 6. 管理后台登录（默认密码）
code = get_vcode()
r = post_form("/api/login.php", {
    "username": "kagamine", "password": "kagamine1234",
    "vcode": code, "timestamp": int(time.time())})
check("管理员登录", r.get("code") == 1, r)

# 7. 访问后台首页
html = opener.open(BASE + "/?page=admin").read().decode()
check("后台首页（弱密码屏蔽）", "管理页面被屏蔽" in html, f"len={len(html)}")

# 8. 错误密码登录失败
code = get_vcode()
r = post_form("/api/login.php", {
    "username": "kagamine", "password": "wrong",
    "vcode": code, "timestamp": int(time.time())})
check("错误密码拒绝", r.get("code") == -1, r)

# 9. pjax 请求只返回片段
req = urllib.request.Request(BASE + "/?page=about&_pjax=true")
frag = opener.open(req).read().decode()
check("Pjax 片段", frag.lstrip().startswith("<br") and "<!DOCTYPE" not in frag, f"len={len(frag)}")

# 10. 404
try:
    resp = opener.open(BASE + "/?page=notexist")
    status, body = resp.status, resp.read().decode()
except urllib.error.HTTPError as e:
    status, body = e.code, e.read().decode()
check("404 页面", status == 404 and "404" in body, f"status={status}")

passed = sum(1 for _, ok, _ in results if ok)
print(f"\n{passed}/{len(results)} passed")
exit(0 if passed == len(results) else 1)
