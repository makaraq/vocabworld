"""A stand-in for the Supabase API: signs everyone in as one sample user and
answers table reads from SAMPLE (else an empty list)."""
import json, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

USER = {
    "id": "00000000-0000-4000-8000-000000000001", "aud": "authenticated", "role": "authenticated",
    "email": "alex@example.com", "app_metadata": {"provider": "google"},
    "user_metadata": {"full_name": "Alex Martin", "name": "Alex Martin"},
    "created_at": "2026-01-01T00:00:00Z",
}
SAMPLE = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else {}
LOG = open(sys.argv[2], "a") if len(sys.argv) > 2 else None

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin") or "*")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Expose-Headers", "*")
    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()
    def reply(self, body, extra=None):
        data = json.dumps(body).encode()
        self.send_response(200); self.cors()
        self.send_header("Content-Type", "application/json")
        for k, v in (extra or {}).items(): self.send_header(k, v)
        self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)
    def handle_any(self):
        global SAMPLE
        if len(sys.argv) > 1: SAMPLE = json.load(open(sys.argv[1]))
        u = urlparse(self.path)
        if LOG: LOG.write(f"{self.command} {self.path}\n"); LOG.flush()
        if u.path.startswith("/auth/v1/user"): return self.reply(USER)
        if u.path.startswith("/auth/v1/"): return self.reply({})
        if u.path.startswith("/rest/v1/"):
            table = u.path.split("/")[3]
            if table == "rpc": return self.reply(SAMPLE.get("rpc:" + u.path.split("/")[4], []))
            rows = self.filtered(table, parse_qs(u.query))
            single = "vnd.pgrst.object" in (self.headers.get("Accept") or "")
            if single:
                return self.reply(rows[0] if rows else None) if rows else self.reply_err()
            return self.reply(rows, {"Content-Range": f"0-{max(0,len(rows)-1)}/{len(rows)}"})
        if u.path.startswith("/rest/v1/rpc"): return self.reply(None)
        self.reply({})
    def do_HEAD(self):
        global SAMPLE
        if len(sys.argv) > 1: SAMPLE = json.load(open(sys.argv[1]))
        u = urlparse(self.path)
        table = u.path.split("/")[3] if u.path.startswith("/rest/v1/") else ""
        rows = self.filtered(table, parse_qs(u.query))
        self.send_response(200); self.cors()
        self.send_header("Content-Range", f"*/{len(rows)}"); self.end_headers()
    def filtered(self, table, q):
        rows = SAMPLE.get(table, [])
        for k, v in q.items():
            if k in ("select", "order", "limit", "offset"): continue
            val = v[0]
            if val.startswith("eq."): rows = [r for r in rows if str(r.get(k)).lower() == val[3:].lower()]
            elif val.startswith("in.("): allowed = set(val[4:-1].split(",")); rows = [r for r in rows if str(r.get(k)) in allowed]
        return rows
    def reply_err(self):
        data = json.dumps({"code": "PGRST116", "message": "no rows"}).encode()
        self.send_response(406); self.cors(); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(data)
    do_GET = do_POST = do_PATCH = do_PUT = do_DELETE = handle_any

ThreadingHTTPServer(("127.0.0.1", 54321), H).serve_forever()
