const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.join(__dirname, "..");
const buildCommand = process.platform === "win32" ? "node.exe" : "node";
const args = parseArgs(process.argv.slice(2));
const scanIntervalMs = args.interval;
const ignoredDirs = new Set([".git", "dist", "node_modules"]);
const watchedExtensions = new Set([".css", ".html", ".js", ".json", ".toml"]);

let lastSnapshot = new Map();
let buildRunning = false;
let buildQueued = false;
let lastChangeAt = 0;
let serverStarted = false;

function parseArgs(argv) {
    const parsed = {
        host: process.env.HOST || "127.0.0.1",
        interval: 700,
        port: Number(process.env.PORT || 4173),
        serve: false,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];

        if (arg === "--serve") {
            parsed.serve = true;
        } else if (arg === "--host") {
            parsed.host = argv[i + 1] || parsed.host;
            i += 1;
        } else if (arg.startsWith("--host=")) {
            parsed.host = arg.slice("--host=".length);
        } else if (arg === "--port") {
            parsed.port = Number(argv[i + 1] || parsed.port);
            i += 1;
        } else if (arg.startsWith("--port=")) {
            parsed.port = Number(arg.slice("--port=".length));
        } else if (arg === "--interval") {
            parsed.interval = Number(argv[i + 1] || parsed.interval);
            i += 1;
        } else if (arg.startsWith("--interval=")) {
            parsed.interval = Number(arg.slice("--interval=".length));
        } else if (arg === "--help" || arg === "-h") {
            printHelp();
            process.exit(0);
        } else {
            console.warn(`Ignoring unknown option: ${arg}`);
        }
    }

    if (!Number.isFinite(parsed.port) || parsed.port <= 0) {
        parsed.port = 4173;
    }

    if (!Number.isFinite(parsed.interval) || parsed.interval < 100) {
        parsed.interval = 700;
    }

    return parsed;
}

function printHelp() {
    console.log(`Usage: node scripts/watch.js [options]

Options:
  --serve              Start the static web server after the first build.
  --host <host>        Host for --serve. Defaults to HOST or 127.0.0.1.
  --port <port>        Port for --serve. Defaults to PORT or 4173.
  --interval <ms>      Polling interval. Defaults to 700.
  -h, --help           Show this help text.
`);
}

function shouldWatchFile(filePath) {
    const ext = path.extname(filePath);

    if (filePath === path.join(rootDir, "build.js")) {
        return true;
    }

    return watchedExtensions.has(ext);
}

function snapshotDir(dir, snapshot) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ignoredDirs.has(entry.name)) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            snapshotDir(fullPath, snapshot);
        } else if (entry.isFile() && shouldWatchFile(fullPath)) {
            const stat = fs.statSync(fullPath);
            snapshot.set(fullPath, `${stat.mtimeMs}:${stat.size}`);
        }
    }
}

function snapshot() {
    const next = new Map();
    snapshotDir(rootDir, next);
    return next;
}

function changedFiles(previous, next) {
    const changed = [];

    for (const [filePath, stamp] of next) {
        if (previous.get(filePath) !== stamp) {
            changed.push(filePath);
        }
    }

    for (const filePath of previous.keys()) {
        if (!next.has(filePath)) {
            changed.push(filePath);
        }
    }

    return changed;
}

function relativeList(files) {
    return files
        .map((filePath) => path.relative(rootDir, filePath))
        .sort()
        .join(", ");
}

function runBuild(reason) {
    if (buildRunning) {
        buildQueued = true;
        return;
    }

    buildRunning = true;
    buildQueued = false;
    const startedAt = Date.now();
    console.log("");
    console.log(`[watch] build started: ${reason}`);

    const child = spawn(buildCommand, ["build.js"], {
        cwd: rootDir,
        env: process.env,
        shell: false,
        stdio: "inherit",
    });

    child.on("exit", (code, signal) => {
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
        buildRunning = false;

        if (code === 0) {
            console.log(`[watch] build finished in ${elapsed}s`);
            if (args.serve && !serverStarted) {
                startServer();
                serverStarted = true;
            }
        } else {
            console.log(`[watch] build failed in ${elapsed}s${signal ? ` (${signal})` : ` with exit code ${code}`}`);
        }

        lastSnapshot = snapshot();

        if (buildQueued) {
            runBuild("queued changes");
        }
    });
}

function startServer() {
    const child = spawn(buildCommand, ["scripts/serve.js"], {
        cwd: rootDir,
        env: {
            ...process.env,
            HOST: args.host,
            PORT: String(args.port),
        },
        shell: false,
        stdio: "inherit",
    });

    child.on("exit", (code, signal) => {
        console.log(`[watch] server stopped${signal ? ` (${signal})` : ` with exit code ${code}`}`);
    });
}

function poll() {
    const next = snapshot();
    const changed = changedFiles(lastSnapshot, next);
    lastSnapshot = next;

    if (changed.length === 0) {
        return;
    }

    lastChangeAt = Date.now();
    setTimeout(() => {
        if (Date.now() - lastChangeAt < 250) {
            return;
        }

        runBuild(relativeList(changed));
    }, 250);
}

console.log(`[watch] watching ${rootDir}`);
lastSnapshot = snapshot();
runBuild("initial build");

if (args.serve) {
    console.log(`[watch] server requested at http://${args.host}:${args.port}/`);
}

setInterval(poll, scanIntervalMs);
