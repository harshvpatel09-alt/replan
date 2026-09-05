#!/usr/bin/env python3
"""Static file server for local development.

Serves this folder on http://localhost:4173 so that relative script paths
(assets/*.js) resolve the way they will in production. Opening app.html as a
file:// URL also works in a normal browser; this exists because some embedded
previews load pages from a data: URL, where relative paths cannot resolve.
"""
import functools
import http.server
import os
import socketserver

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", 4173))

os.chdir(ROOT)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), functools.partial(Handler, directory=ROOT)) as httpd:
    print(f"serving {ROOT} on http://localhost:{PORT}", flush=True)
    httpd.serve_forever()
