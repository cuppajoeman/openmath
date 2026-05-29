const fs = require("fs");
const path = require("path");
const temml = require("temml");

const rootDir = __dirname;
const contentDir = path.join(rootDir, "content");
const staticDir = path.join(rootDir, "static");
const templatePath = path.join(rootDir, "templates", "page.html");
const distDir = path.join(rootDir, "dist");

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function copyDir(source, destination) {
    if (!fs.existsSync(source)) {
        return;
    }

    ensureDir(destination);
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
        if (entry.name === ".git") {
            continue;
        }

        const sourcePath = path.join(source, entry.name);
        const destinationPath = path.join(destination, entry.name);

        if (entry.isDirectory()) {
            copyDir(sourcePath, destinationPath);
        } else {
            ensureDir(path.dirname(destinationPath));
            fs.copyFileSync(sourcePath, destinationPath);
        }
    }
}

function pageTitleFromPath(filePath) {
    const name = path.basename(filePath, ".html");
    return name
        .split("_")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function renderMath(html, filePath) {
    let errors = 0;

    html = html.replace(/\\\[([\s\S]*?)\\\]/g, function (match, tex) {
        try {
            return temml.renderToString(tex.trim(), { displayMode: true });
        } catch (e) {
            errors += 1;
            console.error(`Error rendering display math in ${filePath}: ${tex.trim()}`);
            console.error(e.message);
            return match;
        }
    });

    html = html.replace(/\\\(([\s\S]*?)\\\)/g, function (match, tex) {
        try {
            return temml.renderToString(tex.trim(), { displayMode: false });
        } catch (e) {
            errors += 1;
            console.error(`Error rendering inline math in ${filePath}: ${tex.trim()}`);
            console.error(e.message);
            return match;
        }
    });

    return { html, errors };
}

function stripFullDocument(html) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
        return bodyMatch[1].trim();
    }

    return html.trim();
}

function buildHtmlFile(filePath, template, stats) {
    const relativePath = path.relative(contentDir, filePath);
    const outPath = path.join(distDir, relativePath);
    const source = fs.readFileSync(filePath, "utf-8");
    const content = stripFullDocument(source);
    const rendered = renderMath(content, filePath);
    const page = template
        .replaceAll("{{title}}", pageTitleFromPath(filePath))
        .replace("{{content}}", rendered.html);

    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, page, "utf-8");

    stats.files += 1;
    stats.errors += rendered.errors;
    console.log(`Built: ${filePath} -> ${outPath}`);
}

function processContentDir(dir, template, stats) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            processContentDir(fullPath, template, stats);
        } else if (entry.name.endsWith(".html")) {
            buildHtmlFile(fullPath, template, stats);
        } else {
            const relativePath = path.relative(contentDir, fullPath);
            const outPath = path.join(distDir, relativePath);
            ensureDir(path.dirname(outPath));
            fs.copyFileSync(fullPath, outPath);
        }
    }
}

function build() {
    if (!fs.existsSync(contentDir)) {
        console.error(`Missing content directory: ${contentDir}`);
        process.exit(1);
    }

    if (!fs.existsSync(templatePath)) {
        console.error(`Missing page template: ${templatePath}`);
        process.exit(1);
    }

    ensureDir(distDir);
    copyDir(staticDir, path.join(distDir, "static"));

    const template = fs.readFileSync(templatePath, "utf-8");
    const stats = { files: 0, errors: 0 };
    processContentDir(contentDir, template, stats);

    console.log("");
    console.log(`Done. Built ${stats.files} HTML files to: ${distDir}`);
    console.log(`Render errors: ${stats.errors}`);

    if (stats.errors > 0) {
        process.exitCode = 1;
    }
}

build();
