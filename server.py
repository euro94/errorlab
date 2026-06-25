#!/usr/bin/env python3
"""ErrorLab HTTP server — always serves index.html for root/directory requests."""
import http.server, os, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8734
ROOT = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        # Redirect root and directory-like paths to index.html
        path = self.path.split('?')[0].split('#')[0]
        if path == '/' or path.endswith('/') or ('.' not in os.path.basename(path.rstrip('/')) and path != '/sw.js'):
            self.path = '/index.html'
        super().do_GET()

if __name__ == '__main__':
    http.server.HTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
