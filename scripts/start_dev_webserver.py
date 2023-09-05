import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

script_directory = os.path.dirname(os.path.realpath(__file__))

os.chdir(script_directory)
os.chdir("../html")

httpd = HTTPServer(('localhost', 8000), SimpleHTTPRequestHandler)
httpd.serve_forever()