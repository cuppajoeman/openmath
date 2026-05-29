const fs = require("fs");
const http = require("http");
const path = require("path");

const rootDir = path.join(__dirname, "..", "dist");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
};

function sendFile(res, filePath) {
    fs.readFile(filePath, function (error, data) {
        if (error) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not found");
            return;
        }

        res.writeHead(200, {
            "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
        });
        res.end(data);
    });
}

const server = http.createServer(function (req, res) {
    const url = new URL(req.url, `http://${host}:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    let requestedPath = pathname;

    if (requestedPath.endsWith("/")) {
        requestedPath += "index.html";
    } else if (!path.extname(requestedPath)) {
        requestedPath += "/index.html";
    }

    const filePath = path.resolve(rootDir, `.${requestedPath}`);

    if (!filePath.startsWith(rootDir)) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
    }

    sendFile(res, filePath);
});

server.listen(port, host, function () {
    console.log(`Serving ${rootDir} at http://${host}:${port}/`);
});
