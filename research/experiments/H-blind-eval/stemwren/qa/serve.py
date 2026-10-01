#!/usr/bin/env python3
"""Local preview server for the static site, with a stand-in for the shop's order service.

    python3 qa/serve.py <port> [site-dir]

Serves <site-dir> (default: the repo root) and answers POST /api/order the way the
README describes the real service: { "order": "SW-xxxxx", "total": 0.00 }. The stand-in
does NOT recalculate prices; it echoes back the total the page computed (sent nowhere in
the contract), so it returns 0.00. Every payload is appended to qa/orders.log so a test
can read exactly what a build sent. This file is a QA tool, not part of the site.
"""
import http.server, json, os, random, sys, time

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4811
ROOT = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'orders.log')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if self.path.split('?')[0] != '/api/order':
            self.send_error(404)
            return
        n = int(self.headers.get('Content-Length') or 0)
        raw = self.rfile.read(n).decode('utf-8', 'replace')
        with open(LOG, 'a') as f:
            f.write(json.dumps({'t': time.strftime('%Y-%m-%dT%H:%M:%S'), 'port': PORT, 'body': raw}) + '\n')
        try:
            json.loads(raw)
        except Exception:
            self.send_response(400); self.end_headers(); return
        out = json.dumps({'order': 'SW-%05d' % random.randint(0, 99999), 'total': 0.00}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
