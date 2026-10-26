"""StarsFuel: navbatdagi postlarni Telegram kanalga yuboradi.
telegram/queue/*.json -> vaqti kelganlarini yuboradi -> telegram/sent/ ga ko'chiradi."""
import json, os, sys, glob, shutil, datetime, urllib.request, uuid, mimetypes

TOKEN = os.environ["TG_BOT_TOKEN"]
CHAT = os.environ.get("TG_CHAT", "@starsFuel")
API = f"https://api.telegram.org/bot{TOKEN}/"

def call(method, fields, files=None):
    if not files:
        data = json.dumps(fields).encode()
        req = urllib.request.Request(API + method, data=data, headers={"Content-Type": "application/json"})
    else:
        b = uuid.uuid4().hex; body = b""
        for k, v in fields.items():
            if not isinstance(v, str): v = json.dumps(v)
            body += f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
        for k, path in files.items():
            ct = mimetypes.guess_type(path)[0] or "application/octet-stream"
            body += f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"; filename=\"{os.path.basename(path)}\"\r\nContent-Type: {ct}\r\n\r\n".encode()
            body += open(path, "rb").read() + b"\r\n"
        body += f"--{b}--\r\n".encode()
        req = urllib.request.Request(API + method, data=body, headers={"Content-Type": f"multipart/form-data; boundary={b}"})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        r = json.loads(e.read() or b"{}")
    if not r.get("ok"):
        raise RuntimeError(f"{method}: {r}")
    return r["result"]

def kb(buttons):
    return {"inline_keyboard": [[{"text": b["text"], "url": b["url"]} for b in row] for row in buttons]} if buttons else None

def send(p):
    media = p.get("media", [])
    markup = kb(p.get("buttons"))
    if p["type"] == "album":
        items, files = [], {}
        for i, m in enumerate(media):
            key = f"f{i}"; files[key] = m
            items.append({"type": "photo", "media": f"attach://{key}"})
        msgs = call("sendMediaGroup", {"chat_id": CHAT, "media": items}, files)
        f = {"chat_id": CHAT, "text": p["text"], "parse_mode": "HTML",
             "reply_parameters": {"message_id": msgs[0]["message_id"]}, "link_preview_options": {"is_disabled": True}}
        if markup: f["reply_markup"] = markup
        call("sendMessage", f)
    elif p["type"] in ("video", "photo"):
        f = {"chat_id": CHAT, "caption": p["text"], "parse_mode": "HTML"}
        if markup: f["reply_markup"] = markup
        if p["type"] == "video": f["supports_streaming"] = "true"
        call("sendVideo" if p["type"] == "video" else "sendPhoto", f, {p["type"]: media[0]})
    else:
        f = {"chat_id": CHAT, "text": p["text"], "parse_mode": "HTML", "link_preview_options": {"is_disabled": True}}
        if markup: f["reply_markup"] = markup
        call("sendMessage", f)

now = datetime.datetime.now(datetime.timezone.utc)
done = 0
for path in sorted(glob.glob("telegram/queue/*.json")):
    p = json.load(open(path, encoding="utf-8"))
    when = datetime.datetime.fromisoformat(p.get("send_at", "2000-01-01T00:00:00+00:00"))
    if when > now:
        print("kutilmoqda:", path, when.isoformat()); continue
    send(p)
    shutil.move(path, path.replace("/queue/", "/sent/"))
    print("yuborildi:", path); done += 1
print("jami yuborildi:", done)
