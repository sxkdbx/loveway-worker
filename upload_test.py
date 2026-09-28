#!/usr/bin/env python3
"""测试图片上传（R2）与读取。"""
import json
import subprocess
import time
import zlib
import struct
import urllib.request
import http.cookiejar
import uuid

BASE = "http://localhost:8787"
WRANGLER_DIR = "/home/user/Doubao/chats/38443842937762050/loveway-worker"
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))


def make_png():
    # 生成一个 8x8 粉色 PNG
    width = height = 8
    raw = b""
    for _ in range(height):
        raw += b"\x00" + b"\xff\x9e\xb8" * width  # filter byte + RGB rows

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


def get_vcode():
    opener.open(BASE + "/api/vcode.php").read()
    sid = next(c.value for c in cj if c.name == "loveway_session")
    out = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "loveway", "--local", "--json",
         "--command", f"SELECT vcode FROM loveway_sessions WHERE id='{sid}'"],
        cwd=WRANGLER_DIR, capture_output=True, text=True)
    return json.loads(out.stdout)[0]["results"][0]["vcode"]


def multipart_upload(png, code, ts, filename="test.png", content_type="image/png"):
    boundary = "----test" + uuid.uuid4().hex
    parts = []
    for name, value in [("vcode", code), ("timestamp", str(ts))]:
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode())
    parts.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
        f"Content-Type: {content_type}\r\n\r\n".encode() + png + b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    body = b"".join(parts)
    req = urllib.request.Request(BASE + "/api/upload.php", data=body, method="POST",
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    return json.loads(opener.open(req).read().decode())


# 1. 正常上传
png = make_png()
r = multipart_upload(png, get_vcode(), int(time.time()))
print("上传:", r)
assert r["code"] == 1, r
path = r["path"]

# 2. 从 R2 读取
resp = opener.open(BASE + path)
read_back = resp.read()
print("读取:", resp.status, resp.headers.get("content-type"), len(read_back), "bytes")
assert read_back == png, "读回内容不一致"

# 3. 伪造扩展名（.txt）应被拒
r = multipart_upload(png, get_vcode(), int(time.time()), filename="evil.txt", content_type="text/plain")
print("扩展名拒绝:", r)
assert r["code"] == -6, r

# 4. 非图片内容伪装成 PNG（文件头不对）应被拒
fake = b"not an image" * 10
r = multipart_upload(fake, get_vcode(), int(time.time()))
print("假图片拒绝:", r)
assert r["code"] == -9, r

print("\n上传功能全部通过")
