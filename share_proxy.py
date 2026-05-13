from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import http.client

FRONTEND_HOST = "127.0.0.1"
FRONTEND_PORT = 8080
BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 8001


class ShareProxy(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        self.forward()

    def do_POST(self):
        self.forward()

    def do_PUT(self):
        self.forward()

    def do_PATCH(self):
        self.forward()

    def do_DELETE(self):
        self.forward()

    def do_OPTIONS(self):
        self.forward()

    def forward(self):
        is_api = self.path.startswith("/api/")
        host = BACKEND_HOST if is_api else FRONTEND_HOST
        port = BACKEND_PORT if is_api else FRONTEND_PORT
        path = self.path[4:] if is_api else self.path
        if not path:
            path = "/"

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length else None
        headers = {key: value for key, value in self.headers.items() if key.lower() not in {"host", "connection"}}

        conn = http.client.HTTPConnection(host, port, timeout=60)
        try:
            conn.request(self.command, path, body=body, headers=headers)
            response = conn.getresponse()
            data = response.read()
            self.send_response(response.status, response.reason)
            for key, value in response.getheaders():
                if key.lower() in {"connection", "transfer-encoding", "content-length"}:
                    continue
                self.send_header(key, value)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        finally:
            conn.close()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 9000), ShareProxy)
    print("Share proxy running at http://127.0.0.1:9000")
    server.serve_forever()
