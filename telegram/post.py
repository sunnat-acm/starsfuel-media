"""StarsFuel: navbatdagi postlarni Telegram kanalga yuboradi.
telegram/queue/*.json -> vaqti kelganlarini yuboradi -> telegram/sent/ ga ko'chiradi."""
import json, os, sys, glob, shutil, datetime, urllib.request, uuid, mimetypes

TOKEN = os.environ.get("TG_BOT_TOKEN", "").strip()
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

def send_rich(p):
    media = p.get("media", [])
    files, items = {}, []
    for i, m in enumerate(media):
        key = f"f{i}"; files[key] = m
        kind = "video" if m.endswith(".mp4") else "photo"
        items.append({"id": f"s{i+1}", "media": {"type": kind, "media": f"attach://{key}"}})
    rich = {"html": p["html"]}
    if items: rich["media"] = items
    f = {"chat_id": CHAT, "rich_message": rich}
    if p.get("buttons"): f["reply_markup"] = kb(p["buttons"])
    return call("sendRichMessage", f, files or None)

def send(p):
    media = p.get("media", [])
    markup = kb(p.get("buttons"))
    if p["type"] == "rich":
        try:
            send_rich(p); return
        except Exception as e:
            if not p.get("fallback"): raise
            print("rich xato, oddiy usulga o'tildi:", str(e).replace(TOKEN, "***"))
            p = dict(p, **p["fallback"]); media = p.get("media", []); markup = kb(p.get("buttons"))
    if p["type"] == "album":
        items, files = [], {}
        for i, m in enumerate(media):
            key = f"f{i}"; files[key] = m
            items.append({"type": "photo", "media": f"attach://{key}"})
        msgs = call("sendMediaGroup", {"chat_id": CHAT, "media": items}, files)
        if not p.get("text") and not markup:
            return
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
errs = []
if not TOKEN: print('TG_BOT_TOKEN topilmadi')
for path in sorted(glob.glob("telegram/queue/*.json")):
    p = json.load(open(path, encoding="utf-8"))
    when = datetime.datetime.fromisoformat(p.get("send_at", "2000-01-01T00:00:00+00:00"))
    if when > now:
        print("kutilmoqda:", path, when.isoformat()); continue
    try:
        send(p)
    except Exception as e:
        errs.append(f"{path}: {str(e).replace(TOKEN, '***')}"); continue
    os.makedirs("telegram/sent", exist_ok=True)
    shutil.move(path, path.replace("/queue/", "/sent/"))
    print("yuborildi:", path); done += 1
print("jami yuborildi:", done)
open("telegram/status.txt", "w", encoding="utf-8").write(f"{now.isoformat()}\nyuborildi: {done}\n" + ("XATO:\n" + "\n".join(errs) if errs else "xato yo'q") + "\n")
