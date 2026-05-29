const fs = require("fs");
const path = require("path");
const temml = require("temml");

const rootDir = __dirname;
const contentDir = path.join(rootDir, "content");
const staticDir = path.join(rootDir, "static");
const coverageMapPath = path.join(rootDir, "data", "coverage_map.json");
const templatePath = path.join(rootDir, "templates", "page.html");
const distDir = path.join(rootDir, "dist");
const temmlPackageDir = path.dirname(require.resolve("temml/package.json"));
const temmlDistDir = path.join(temmlPackageDir, "dist");
const defaultProofCoverageThreshold = 0.5;
const proofCoverageThreshold = readProofCoverageThreshold();

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

function copyTemmlAssets() {
    const destination = path.join(distDir, "static", "vendor", "temml");
    const latinModernMathFont = path.join(staticDir, "fonts", "latinmodernmath.woff2");

    // Math is baked to MathML, but browsers still need Temml's CSS/fonts to render it consistently.
    copyDir(temmlDistDir, destination);

    // The Temml npm package CSS references this font, but the package does not ship it.
    fs.copyFileSync(latinModernMathFont, path.join(destination, "latinmodernmath.woff2"));
}

function pageTitleFromPath(filePath) {
    const name = path.basename(filePath, ".html");
    return name
        .split("_")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function readProofCoverageThreshold() {
    const raw = process.env.OPENMATH_PROOF_COVERAGE_THRESHOLD;
    if (!raw) {
        return defaultProofCoverageThreshold;
    }

    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 1) {
        console.warn(`Ignoring invalid OPENMATH_PROOF_COVERAGE_THRESHOLD="${raw}". Expected a number from 0 to 1.`);
        return defaultProofCoverageThreshold;
    }

    return value;
}

function renderMath(html, filePath) {
    let errors = 0;
    const protectedBlocks = [];

    html = html.replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, function (match) {
        const placeholder = `%%OPENMATH_PROTECTED_BLOCK_${protectedBlocks.length}%%`;
        protectedBlocks.push(match);
        return placeholder;
    });

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

    html = html.replace(/%%OPENMATH_PROTECTED_BLOCK_(\d+)%%/g, function (match, index) {
        return protectedBlocks[Number(index)] || match;
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

function stripHtml(html) {
    return html
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function relativeUrl(filePath) {
    return path.relative(contentDir, filePath).split(path.sep).join("/");
}

function sourceFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...sourceFiles(fullPath));
        } else if (entry.name.endsWith(".html")) {
            files.push(fullPath);
        }
    }

    return files;
}

function proofCoverageForSource(source) {
    const proofs = Array.from(source.matchAll(/<div\s+class=["']proof["'][^>]*>([\s\S]*?)<\/div>/gi));
    const total = proofs.length;

    if (total === 0) {
        return { total, filled: 0, coverage: 1 };
    }

    const filled = proofs.filter((match) => stripHtml(match[1]).length > 0).length;
    return { total, filled, coverage: filled / total };
}

function attrValue(tag, name) {
    const pattern = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i");
    const match = tag.match(pattern);
    return match ? match[1] : "";
}

function collectStatements(source, relativePath) {
    const openings = [];
    const tagPattern = /<div\b[^>]*>/gi;
    let match;

    while ((match = tagPattern.exec(source)) !== null) {
        const tag = match[0];
        const className = attrValue(tag, "class");
        const id = attrValue(tag, "id");
        const type = className.split(/\s+/).find((name) => (
            name === "theorem" ||
            name === "proposition" ||
            name === "lemma" ||
            name === "corollary" ||
            name === "exercise"
        ));

        if (type && id) {
            openings.push({ index: match.index, id, type });
        }
    }

    return openings.map((opening, index) => {
        const next = openings[index + 1];
        const segment = source.slice(opening.index, next ? next.index : source.length);
        const titleMatch = segment.match(/<div\s+class=["']title["'][^>]*>([\s\S]*?)<\/div>/i);
        const proof = proofCoverageForSource(segment);

        return {
            id: opening.id,
            type: opening.type,
            title: titleMatch ? stripHtml(titleMatch[1]) : pageTitleFromPath(relativePath),
            path: relativePath,
            href: `/${relativePath}#${opening.id}`,
            proof,
            hasProof: proof.filled > 0,
        };
    });
}

function collectProofCoverage() {
    const coverage = new Map();
    const statements = new Map();
    const incomplete = [];
    const underThreshold = [];

    for (const filePath of sourceFiles(contentDir)) {
        const relativePath = relativeUrl(filePath);
        const source = fs.readFileSync(filePath, "utf-8");
        const data = {
            ...proofCoverageForSource(source),
            path: relativePath,
            title: pageTitleFromPath(filePath),
        };
        const pageStatements = collectStatements(source, relativePath);
        data.missingProofs = pageStatements.filter((statement) => statement.proof.total > 0 && statement.proof.filled === 0);

        coverage.set(relativePath, data);
        for (const statement of pageStatements) {
            statements.set(`${relativePath}#${statement.id}`, statement);
        }

        if (path.basename(filePath) !== "index.html" && data.total > 0 && data.coverage < 1) {
            incomplete.push(data);
            if (data.coverage < proofCoverageThreshold) {
                underThreshold.push(data);
            }
        }
    }

    incomplete.sort((a, b) => a.coverage - b.coverage || b.total - a.total || a.path.localeCompare(b.path));
    underThreshold.sort((a, b) => a.coverage - b.coverage || b.total - a.total || a.path.localeCompare(b.path));
    return { coverage, incomplete, statements, underThreshold };
}

function targetForHref(href, currentDir) {
    if (
        !href ||
        href.startsWith("#") ||
        /^[a-z][a-z0-9+.-]*:/i.test(href) ||
        href.startsWith("//")
    ) {
        return null;
    }

    const cleanHref = href.split("#")[0].split("?")[0];
    const targetPath = path.posix.normalize(path.posix.join(currentDir, cleanHref));
    if (targetPath.startsWith("..")) {
        return null;
    }

    if (targetPath.endsWith(".html")) {
        return targetPath;
    }

    return path.posix.join(targetPath, "index.html");
}

function linkShouldBeHidden(href, currentDir, quality) {
    const target = targetForHref(href, currentDir);
    if (!target) {
        return false;
    }

    const data = quality.coverage.get(target);
    return Boolean(data && data.total > 0 && data.coverage < proofCoverageThreshold);
}

function filterDirectoryLinks(html, relativePath, quality) {
    if (path.basename(relativePath) !== "index.html") {
        return html;
    }

    const currentDir = path.posix.dirname(relativePath) === "." ? "" : path.posix.dirname(relativePath);
    const linkPattern = /<li\b[^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>[\s\S]*?<\/li>/gi;

    return html.replace(linkPattern, function (match, href) {
        return linkShouldBeHidden(href, currentDir, quality) ? "" : match;
    });
}

function buildHtmlFile(filePath, template, stats, quality) {
    const relativePath = path.relative(contentDir, filePath);
    const outPath = path.join(distDir, relativePath);
    const source = fs.readFileSync(filePath, "utf-8");
    const content = filterDirectoryLinks(stripFullDocument(source), relativeUrl(filePath), quality);
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

function qualityClass(coverage) {
    if (coverage < 0.25) {
        return "quality-low";
    }

    if (coverage < proofCoverageThreshold) {
        return "quality-medium";
    }

    return "quality-high";
}

function normalizeCoverageHref(href) {
    if (!href) {
        return "";
    }

    const cleanHref = href.startsWith("/") ? href.slice(1) : href;
    const [page, hash] = cleanHref.split("#");

    return hash ? `${page}#${hash}` : page;
}

function loadCoverageMap() {
    if (!fs.existsSync(coverageMapPath)) {
        return { areas: [] };
    }

    return JSON.parse(fs.readFileSync(coverageMapPath, "utf-8"));
}

function coverageMapEntryStatus(result, quality) {
    const key = normalizeCoverageHref(result.href);
    const statement = quality.statements.get(key);
    const page = quality.coverage.get(key);
    const covered = Boolean(
        statement ? statement.hasProof :
        page ? page.total > 0 && page.filled > 0 :
        false
    );

    return {
        covered,
        href: covered ? result.href : "",
        label: covered ? "proved" : (result.href ? "needs proof" : "missing"),
    };
}

function buildCoverageMapPage(template, stats, quality) {
    const map = loadCoverageMap();
    const areas = Array.isArray(map.areas) ? map.areas : [];
    const sections = areas.map((area) => {
        const results = Array.isArray(area.results) ? area.results : [];
        const resolved = results.map((result) => ({
            ...result,
            status: coverageMapEntryStatus(result, quality),
        }));
        const coveredCount = resolved.filter((result) => result.status.covered).length;
        const coverage = results.length > 0 ? coveredCount / results.length : 1;
        const percent = Math.round(coverage * 100);
        const resultRows = resolved.map((result) => {
            const title = escapeHtml(result.title);
            const titleHtml = result.status.href
                ? `<a href="${escapeHtml(result.status.href)}">${title}</a>`
                : title;
            const resultCoverage = result.status.covered ? 1 : 0;

            return `<li class="${result.status.covered ? "coverage-map-covered" : "coverage-map-open"}">
  ${titleHtml}
  <span class="quality-coverage ${qualityClass(resultCoverage)}">${escapeHtml(result.status.label)}</span>
</li>`;
        }).join("\n");

        return `<section class="coverage-map-area">
  <h2>${escapeHtml(area.title)} <span class="quality-coverage ${qualityClass(coverage)}">${percent}%</span></h2>
  ${area.description ? `<p>${escapeHtml(area.description)}</p>` : ""}
  <ul class="quality-list">
${resultRows || "<li>No major results have been listed for this area yet.</li>"}
  </ul>
</section>`;
    }).join("\n");

    const content = `<h1>Coverage Map</h1>
<p>
  This page tracks major mathematical areas and important results that openmath should eventually cover. Linked entries have a written proof. Unlinked entries are either missing entirely or have no proof yet.
</p>
${sections || "<p>No coverage map has been defined yet.</p>"}`;
    const page = template
        .replaceAll("{{title}}", "Coverage Map")
        .replace("{{content}}", content);
    const outPath = path.join(distDir, "coverage_map.html");

    fs.writeFileSync(outPath, page, "utf-8");
    stats.files += 1;
    console.log(`Built: coverage map page -> ${outPath}`);
}

function buildProofCoveragePage(template, stats, quality) {
    const rows = quality.incomplete.map((item) => {
        const percent = Math.round(item.coverage * 100);
        const isHidden = item.coverage < proofCoverageThreshold;
        const missingProofs = item.missingProofs.map((proof) => `<li>
    <a href="${escapeHtml(proof.href)}">${escapeHtml(proof.title)}</a>
    <span class="quality-coverage quality-low">${escapeHtml(proof.type)}</span>
  </li>`).join("\n");
        const summary = `<span class="proof-coverage-title">${escapeHtml(item.title)}</span>
  <span class="quality-coverage ${qualityClass(item.coverage)}">${percent}% (${item.filled}/${item.total})</span>
  ${isHidden ? `<span class="quality-coverage quality-low">page hidden</span>` : ""}`;

        return `<details class="proof-coverage-detail">
  <summary>${summary}</summary>
  <ul>
${missingProofs || "      <li>No individual missing proof blocks were found.</li>"}
  </ul>
</details>`;
    }).join("\n");

    const content = `<h1>Pages Needing Proofs</h1>
<p>
  These pages have at least one empty proof. Pages below ${Math.round(proofCoverageThreshold * 100)}% proof coverage are hidden from directory pages until enough proof blocks are filled in.
  Click a page title to show the specific proofs that need work.
</p>
<div class="proof-coverage-list">
${rows || "<li>Every page with proof blocks is fully covered.</li>"}
</div>`;
    const page = template
        .replaceAll("{{title}}", "Pages Needing Proofs")
        .replace("{{content}}", content);
    const outPath = path.join(distDir, "proof_coverage.html");

    fs.writeFileSync(outPath, page, "utf-8");
    stats.files += 1;
    console.log(`Built: proof coverage page -> ${outPath}`);
}

function processContentDir(dir, template, stats, quality) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            processContentDir(fullPath, template, stats, quality);
        } else if (entry.name.endsWith(".html")) {
            buildHtmlFile(fullPath, template, stats, quality);
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

    fs.rmSync(distDir, { recursive: true, force: true });
    ensureDir(distDir);
    copyDir(staticDir, path.join(distDir, "static"));
    copyTemmlAssets();

    const template = fs.readFileSync(templatePath, "utf-8");
    const quality = collectProofCoverage();
    const stats = { files: 0, errors: 0 };
    processContentDir(contentDir, template, stats, quality);
    buildProofCoveragePage(template, stats, quality);
    buildCoverageMapPage(template, stats, quality);

    console.log("");
    console.log(`Done. Built ${stats.files} HTML files to: ${distDir}`);
    console.log(`Render errors: ${stats.errors}`);
    console.log(`Proof coverage threshold: ${Math.round(proofCoverageThreshold * 100)}%`);
    console.log(`Pages below proof coverage threshold: ${quality.underThreshold.length}`);

    if (stats.errors > 0) {
        process.exitCode = 1;
    }
}

build();
