import os
from http.server import HTTPServer, SimpleHTTPRequestHandler


def start_webserver(ip_address='localhost', port=8000):
    script_directory = os.path.dirname(os.path.realpath(__file__))

    muted_handler = SimpleHTTPRequestHandler
    muted_handler.log_message = lambda a, b, c, d, e: None

    os.chdir(script_directory)
    os.chdir("../html")

    httpd = HTTPServer((ip_address, port), muted_handler)
    httpd.serve_forever()


if __name__ == "__main__":
    start_webserver()
