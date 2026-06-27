const fs = require("fs");
const path = require("path");
const temml = require("temml");

const rootDir = __dirname;
const contentDir = path.join(rootDir, "content");
const staticDir = path.join(rootDir, "static");
const coverageMapPath = path.join(rootDir, "data", "coverage_map.json");
const templatePath = path.join(rootDir, "templates", "page.html");
const distDir = path.join(rootDir, "dist");
const searchIndexPath = path.join(distDir, "static", "search-index.json");
const knowledgeGraphPath = path.join(distDir, "static", "knowledge-graph.json");
const temmlPackageDir = path.dirname(require.resolve("temml/package.json"));
const temmlDistDir = path.join(temmlPackageDir, "dist");
const defaultProofCoverageThreshold = 0.5;
const proofCoverageThreshold = readProofCoverageThreshold();
const developmentMode = process.env.OPENMATH_DEV === "1";
const profileBuild = process.env.OPENMATH_PROFILE_BUILD === "1";
const buildProfile = [];

function nowMs() {
    const [seconds, nanoseconds] = process.hrtime();
    return seconds * 1000 + nanoseconds / 1000000;
}

function profileStep(name, callback) {
    if (!profileBuild) {
        return callback();
    }

    const start = nowMs();
    try {
        return callback();
    } finally {
        buildProfile.push({ name, ms: nowMs() - start });
    }
}

function printBuildProfile() {
    if (!profileBuild) {
        return;
    }

    console.log("");
    console.log("Build profile:");
    for (const entry of buildProfile.sort((a, b) => b.ms - a.ms)) {
        console.log(`${entry.name}: ${(entry.ms / 1000).toFixed(3)}s`);
    }
}

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

function titleFromId(id) {
    return id
        .replace(/^(definition|theorem|proposition|lemma|corollary|exercise)-/, "")
        .split("-")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function cleanStatementTitle(rawTitle, id, relativePath) {
    const title = rawTitle.trim();
    if (!title || /^[-<>\s!]+$/.test(title)) {
        return titleFromId(id) || pageTitleFromPath(relativePath);
    }

    return title;
}

function plainTitleHtml(title) {
    return escapeHtml(title)
        .replace(/\\\(\s*\\texttt\{([^}]*)\}\s*\\\)/g, "<code>$1</code>")
        .replace(/\\texttt\{([^}]*)\}/g, "<code>$1</code>");
}

function renderStatementTitle(rawTitle, textTitle, filePath) {
    const sourceTitle = rawTitle.trim() || escapeHtml(textTitle);
    const rendered = renderMath(sourceTitle, filePath);

    if (rendered.errors > 0 || rendered.html.includes("temml-error")) {
        return plainTitleHtml(textTitle);
    }

    return rendered.html;
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
    const temmlOptions = {
        throwOnError: true,
        trust: function (context) {
            if (context.command === "\\class") {
                return context.class === "knowledge-link";
            }

            if (context.command === "\\data") {
                return Object.keys(context.attributes).every((name) => name === "data-href");
            }

            return false;
        },
    };

    html = html.replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, function (match) {
        const placeholder = `%%OPENMATH_PROTECTED_BLOCK_${protectedBlocks.length}%%`;
        protectedBlocks.push(match);
        return placeholder;
    });

    html = html.replace(/\\\[([\s\S]*?)\\\]/g, function (match, tex) {
        try {
            return temml.renderToString(knowledgeLinksToTemml(tex.trim()), { ...temmlOptions, displayMode: true });
        } catch (e) {
            errors += 1;
            console.error(`Error rendering display math in ${filePath}: ${tex.trim()}`);
            console.error(e.message);
            return match;
        }
    });

    html = html.replace(/\\\(([\s\S]*?)\\\)/g, function (match, tex) {
        try {
            return temml.renderToString(knowledgeLinksToTemml(tex.trim()), { ...temmlOptions, displayMode: false });
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

function decodeHtmlAttribute(text) {
    return String(text)
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}

function escapeTemmlRawArgument(text) {
    return String(text)
        .replace(/\\/g, "\\textbackslash{}")
        .replace(/[{}]/g, "");
}

function knowledgeLinksToTemml(tex) {
    return tex.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, function (match, attributes, body) {
        const className = attrValue(`<a ${attributes}>`, "class");
        const href = decodeHtmlAttribute(attrValue(`<a ${attributes}>`, "href"));

        if (!href || !/\b(?:knowledge-link|rlink)\b/.test(className)) {
            return match;
        }

        return `{\\class{knowledge-link}{\\data{href=${escapeTemmlRawArgument(href)}}{${body.trim()}}}}`;
    });
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

function buildBreadcrumb(relativePath) {
    const segments = relativePath.split("/");
    const crumbs = [
        '<a href="/" aria-label="OpenMath root">~</a>',
    ];

    let current = "";
    for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        const isFile = index === segments.length - 1;
        current = current ? `${current}/${segment}` : segment;

        if (isFile) {
            crumbs.push(`<a href="/${current}">${escapeHtml(segment)}</a>`);
            continue;
        }

        const directoryIndex = path.join(contentDir, current, "index.html");
        if (fs.existsSync(directoryIndex)) {
            crumbs.push(`<a href="/${current}/">${escapeHtml(segment)}</a>`);
        } else {
            crumbs.push(`<span>${escapeHtml(segment)}</span>`);
        }
    }

    return `<nav class="breadcrumb" aria-label="Current file path">${crumbs.join('<span class="breadcrumb-separator">/</span>')}</nav>`;
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

function proofQualityForStatement(segment, relativePath) {
    const proofs = Array.from(segment.matchAll(/<div\s+class=["']proof["'][^>]*>([\s\S]*?)<\/div>/gi));
    const total = proofs.length;

    if (total === 0) {
        return { total, filled: 0, coverage: 1, issues: [] };
    }

    const bodySource = statementBodySource(segment);
    const hasStatementLink = collectKnowledgeLinkTargets(bodySource, relativePath).length > 0;
    const issues = [];
    let filled = 0;

    proofs.forEach((proof, index) => {
        const proofBody = proof[1];
        const hasProofText = stripHtml(proofBody).length > 0;
        const hasProofLink = collectKnowledgeLinkTargets(proofBody, relativePath).length > 0;
        const reasons = [];

        if (!hasProofText) {
            reasons.push("empty proof");
        }

        if (!hasStatementLink) {
            reasons.push("statement needs a knowledge link");
        }

        if (!hasProofLink) {
            reasons.push("proof needs a knowledge link");
        }

        if (reasons.length === 0) {
            filled += 1;
        } else {
            issues.push({ index: index + 1, reasons });
        }
    });

    return { total, filled, coverage: filled / total, issues };
}

function aggregateProofQuality(statements) {
    const total = statements.reduce((sum, statement) => sum + statement.proof.total, 0);
    const filled = statements.reduce((sum, statement) => sum + statement.proof.filled, 0);

    return {
        total,
        filled,
        coverage: total === 0 ? 1 : filled / total,
    };
}

function normalizeStatementHref(href, currentPath) {
    if (
        !href ||
        /^[a-z][a-z0-9+.-]*:/i.test(href) ||
        href.startsWith("//")
    ) {
        return "";
    }

    const decoded = decodeHtmlAttribute(href);
    const [targetPathRaw, hashRaw] = decoded.split("#");
    const hash = hashRaw ? hashRaw.split("?")[0] : "";

    if (!hash) {
        return "";
    }

    if (!targetPathRaw) {
        return `${currentPath}#${hash}`;
    }

    const cleanPath = targetPathRaw.startsWith("/")
        ? targetPathRaw.slice(1)
        : path.posix.normalize(path.posix.join(path.posix.dirname(currentPath), targetPathRaw));

    if (cleanPath.startsWith("..")) {
        return "";
    }

    return `${cleanPath.split("?")[0]}#${hash}`;
}

function collectKnowledgeLinkTargets(segment, relativePath) {
    const targets = new Set();
    const linkPattern = /<a\b([^>]*)>/gi;
    let match;

    while ((match = linkPattern.exec(segment)) !== null) {
        const tag = match[0];
        const className = attrValue(tag, "class");

        if (!/\b(?:knowledge-link|rlink)\b/.test(className)) {
            continue;
        }

        const href = attrValue(tag, "href") || attrValue(tag, "data-href");
        const target = normalizeStatementHref(href, relativePath);

        if (target) {
            targets.add(target);
        }
    }

    return Array.from(targets);
}

function attrValue(tag, name) {
    const pattern = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i");
    const match = tag.match(pattern);
    return match ? match[1] : "";
}

function statementBodySource(segment) {
    return segment
        .replace(/<div\s+class=["']title["'][^>]*>[\s\S]*?<\/div>/i, "")
        .replace(/<div\s+class=["']proof["'][^>]*>[\s\S]*?<\/div>/gi, "");
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
            name === "definition" ||
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
        const rawTitle = titleMatch ? titleMatch[1] : "";
        const title = rawTitle ? stripHtml(rawTitle) : "";
        const cleanTitle = cleanStatementTitle(title, opening.id, relativePath);
        const proof = proofQualityForStatement(segment, relativePath);
        const bodySource = statementBodySource(segment);

        return {
            id: opening.id,
            type: opening.type,
            title: cleanTitle,
            titleHtml: renderStatementTitle(rawTitle, cleanTitle, relativePath),
            path: relativePath,
            href: `/${relativePath}#${opening.id}`,
            proof,
            hasProof: proof.coverage === 1,
            hasBody: stripHtml(bodySource).length > 0,
            linksTo: collectKnowledgeLinkTargets(segment, relativePath),
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
        const pageStatements = collectStatements(source, relativePath);
        const data = {
            ...aggregateProofQuality(pageStatements),
            path: relativePath,
            title: pageTitleFromPath(filePath),
        };
        data.missingProofs = pageStatements.filter((statement) => statement.proof.total > 0 && statement.proof.coverage < 1);

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

function markDirectoryLinkLowCoverage(match, href, currentDir, quality) {
    const target = targetForHref(href, currentDir);
    const data = target ? quality.coverage.get(target) : null;

    if (!data || data.total <= 0 || data.coverage >= proofCoverageThreshold) {
        return match;
    }

    const percent = Math.round(data.coverage * 100);
    const withClass = /\bclass\s*=/.test(match)
        ? match.replace(/\bclass=(["'])([^"']*)\1/, function (_classMatch, quote, classes) {
            return `class=${quote}${classes} directory-link-low-coverage${quote}`;
        })
        : match.replace("<li", '<li class="directory-link-low-coverage"');

    return withClass.replace("</li>", ` <span class="quality-coverage quality-low">hidden in production: ${percent}%</span></li>`);
}

function filterDirectoryLinks(html, relativePath, quality) {
    if (path.basename(relativePath) !== "index.html") {
        return html;
    }

    const currentDir = path.posix.dirname(relativePath) === "." ? "" : path.posix.dirname(relativePath);
    const linkPattern = /<li\b[^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>[\s\S]*?<\/li>/gi;

    return html.replace(linkPattern, function (match, href) {
        if (developmentMode) {
            return markDirectoryLinkLowCoverage(match, href, currentDir, quality);
        }

        return linkShouldBeHidden(href, currentDir, quality) ? "" : match;
    });
}

function buildHtmlFile(filePath, template, stats, quality) {
    const relativePath = relativeUrl(filePath);
    const outPath = path.join(distDir, relativePath);
    const source = fs.readFileSync(filePath, "utf-8");
    const content = filterDirectoryLinks(stripFullDocument(source), relativePath, quality);
    const rendered = renderMath(content, filePath);
    const page = template
        .replaceAll("{{title}}", pageTitleFromPath(filePath))
        .replace("{{breadcrumb}}", buildBreadcrumb(relativePath))
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

function normalizeDuplicateText(text) {
    return String(text)
        .toLowerCase()
        .replace(/\\[a-z]+/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function duplicateTokens(text) {
    const stopWords = new Set([
        "a",
        "an",
        "and",
        "are",
        "by",
        "for",
        "in",
        "is",
        "of",
        "on",
        "or",
        "the",
        "to",
        "with",
    ]);

    return new Set(
        normalizeDuplicateText(text)
            .split(" ")
            .filter((word) => word.length > 2 && !stopWords.has(word))
    );
}

function jaccardSimilarity(left, right) {
    if (left.size === 0 && right.size === 0) {
        return 1;
    }

    let intersection = 0;
    for (const value of left) {
        if (right.has(value)) {
            intersection += 1;
        }
    }

    return intersection / (left.size + right.size - intersection);
}

function levenshteinDistance(left, right) {
    if (left === right) {
        return 0;
    }

    if (left.length === 0) {
        return right.length;
    }

    if (right.length === 0) {
        return left.length;
    }

    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    const current = Array(right.length + 1).fill(0);

    for (let i = 1; i <= left.length; i += 1) {
        current[0] = i;

        for (let j = 1; j <= right.length; j += 1) {
            const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
            current[j] = Math.min(
                current[j - 1] + 1,
                previous[j] + 1,
                previous[j - 1] + substitutionCost
            );
        }

        for (let j = 0; j <= right.length; j += 1) {
            previous[j] = current[j];
        }
    }

    return previous[right.length];
}

function duplicateStatementName(statement) {
    const idTitle = titleFromId(statement.id);
    return cleanStatementTitle(statement.title || idTitle, statement.id, statement.path);
}

function duplicateStatementSearchText(statement) {
    return `${duplicateStatementName(statement)} ${titleFromId(statement.id)}`;
}

function duplicateReason(left, right) {
    const leftName = normalizeDuplicateText(duplicateStatementName(left));
    const rightName = normalizeDuplicateText(duplicateStatementName(right));

    if (!leftName || !rightName) {
        return null;
    }

    if (leftName === rightName) {
        return { label: "direct title match", score: 1 };
    }

    const maxLength = Math.max(leftName.length, rightName.length);
    const editSimilarity = 1 - (levenshteinDistance(leftName, rightName) / maxLength);

    if (maxLength >= 8 && editSimilarity >= 0.82) {
        return { label: "similar title", score: editSimilarity };
    }

    const leftTokens = duplicateTokens(duplicateStatementSearchText(left));
    const rightTokens = duplicateTokens(duplicateStatementSearchText(right));
    const tokenSimilarity = jaccardSimilarity(leftTokens, rightTokens);
    const sharedTokens = Array.from(leftTokens).filter((word) => rightTokens.has(word));

    if (sharedTokens.length >= 3 && tokenSimilarity >= 0.75) {
        return { label: "shared words", score: tokenSimilarity };
    }

    return null;
}

function collectPotentialDuplicates(quality) {
    const statements = Array.from(quality.statements.values())
        .filter((statement) => statement.type !== "exercise")
        .sort((a, b) => duplicateStatementName(a).localeCompare(duplicateStatementName(b)) || a.href.localeCompare(b.href));
    const groups = new Map();
    const prepared = statements.map((statement, index) => ({
        index,
        statement,
        name: duplicateStatementName(statement),
        normalizedName: normalizeDuplicateText(duplicateStatementName(statement)),
        tokens: duplicateTokens(duplicateStatementSearchText(statement)),
    }));
    const candidatePairs = new Map();

    function addCandidate(leftIndex, rightIndex) {
        if (leftIndex === rightIndex) {
            return;
        }

        const first = Math.min(leftIndex, rightIndex);
        const second = Math.max(leftIndex, rightIndex);
        candidatePairs.set(`${first}:${second}`, [prepared[first].statement, prepared[second].statement]);
    }

    const byNormalizedName = new Map();
    for (const item of prepared) {
        if (!item.normalizedName) {
            continue;
        }

        const group = byNormalizedName.get(item.normalizedName) || [];
        group.push(item.index);
        byNormalizedName.set(item.normalizedName, group);
    }

    for (const indexes of byNormalizedName.values()) {
        for (let i = 0; i < indexes.length; i += 1) {
            for (let j = i + 1; j < indexes.length; j += 1) {
                addCandidate(indexes[i], indexes[j]);
            }
        }
    }

    const byFirstLetter = new Map();
    for (const item of prepared) {
        const key = item.normalizedName.charAt(0);
        if (!key) {
            continue;
        }

        const group = byFirstLetter.get(key) || [];
        group.push(item);
        byFirstLetter.set(key, group);
    }

    for (const bucket of byFirstLetter.values()) {
        bucket.sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));

        for (let i = 0; i < bucket.length; i += 1) {
            const left = bucket[i];

            for (let j = i + 1; j < bucket.length && j <= i + 12; j += 1) {
                const right = bucket[j];
                const maxLength = Math.max(left.normalizedName.length, right.normalizedName.length);
                const lengthDifference = Math.abs(left.normalizedName.length - right.normalizedName.length);

                if (maxLength >= 8 && lengthDifference / maxLength <= 0.18) {
                    addCandidate(left.index, right.index);
                }
            }
        }
    }

    const tokenIndex = new Map();
    for (const item of prepared) {
        for (const token of item.tokens) {
            const indexes = tokenIndex.get(token) || [];
            indexes.push(item.index);
            tokenIndex.set(token, indexes);
        }
    }

    const sharedTokenCounts = new Map();
    for (const indexes of tokenIndex.values()) {
        for (let i = 0; i < indexes.length; i += 1) {
            for (let j = i + 1; j < indexes.length; j += 1) {
                const first = Math.min(indexes[i], indexes[j]);
                const second = Math.max(indexes[i], indexes[j]);
                const key = `${first}:${second}`;
                const count = (sharedTokenCounts.get(key) || 0) + 1;

                sharedTokenCounts.set(key, count);
                if (count >= 3) {
                    addCandidate(first, second);
                }
            }
        }
    }

    for (const [left, right] of candidatePairs.values()) {
        const reason = duplicateReason(left, right);

        if (!reason) {
            continue;
        }

        const groupName = normalizeDuplicateText(duplicateStatementName(left)) === normalizeDuplicateText(duplicateStatementName(right))
            ? normalizeDuplicateText(duplicateStatementName(left))
            : `${normalizeDuplicateText(duplicateStatementName(left))}::${normalizeDuplicateText(duplicateStatementName(right))}`;
        const group = groups.get(groupName) || {
            title: duplicateStatementName(left),
            reason: reason.label,
            score: reason.score,
            items: new Map(),
        };

        group.score = Math.max(group.score, reason.score);
        if (group.reason !== "direct title match" && reason.label === "direct title match") {
            group.reason = reason.label;
            group.title = duplicateStatementName(left);
        }
        group.items.set(left.href, left);
        group.items.set(right.href, right);
        groups.set(groupName, group);
    }

    return Array.from(groups.values())
        .map((group) => ({
            ...group,
            items: Array.from(group.items.values()).sort((a, b) => a.type.localeCompare(b.type) || a.path.localeCompare(b.path) || a.id.localeCompare(b.id)),
        }))
        .filter((group) => group.items.length > 1)
        .sort((a, b) => {
            const reasonRank = { "direct title match": 0, "similar title": 1, "shared words": 2 };
            return reasonRank[a.reason] - reasonRank[b.reason] ||
                b.score - a.score ||
                a.title.localeCompare(b.title);
        });
}

function collectEmptyStatements(quality) {
    return Array.from(quality.statements.values())
        .filter((statement) => !statement.hasBody)
        .sort((a, b) => a.type.localeCompare(b.type) || a.path.localeCompare(b.path) || a.id.localeCompare(b.id));
}

function buildCleanupPage(template, stats, quality) {
    const emptyStatements = profileStep("cleanup: empty statements", () => collectEmptyStatements(quality));
    const duplicateGroups = profileStep("cleanup: duplicate candidates", () => collectPotentialDuplicates(quality));
    const emptyRows = emptyStatements.map((statement) => `<li>
  <a href="${escapeHtml(statement.href)}">${escapeHtml(statement.title)}</a>
  <span class="quality-coverage quality-low">empty ${escapeHtml(statement.type)}</span>
  <span class="duplicate-path">${escapeHtml(statement.path)}</span>
</li>`).join("\n");
    const duplicateRows = duplicateGroups.map((group) => {
        const percent = Math.round(group.score * 100);
        const items = group.items.map((item) => `<li>
    <a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a>
    <span class="quality-coverage quality-medium">${escapeHtml(item.type)}</span>
    <span class="duplicate-path">${escapeHtml(item.path)}</span>
  </li>`).join("\n");

        return `<details class="proof-coverage-detail duplicate-knowledge-detail">
  <summary>
    <span class="proof-coverage-title">${escapeHtml(group.title)}</span>
    <span class="quality-coverage ${qualityClass(group.score)}">${escapeHtml(group.reason)}</span>
    <span class="quality-coverage quality-high">${percent}%</span>
  </summary>
  <ul>
${items}
  </ul>
</details>`;
    }).join("\n");

    const content = `<h1>Cleanup</h1>
<p>
  This page collects maintenance tasks that usually do not require new mathematical ideas. Empty statements need their definitions or results filled in, and possible duplicates should be compared to decide whether they should be merged, renamed, or linked more clearly.
</p>
<section class="knowledge-problem-section">
  <h2>Empty Statements <span class="quality-coverage quality-low">${emptyStatements.length}</span></h2>
  <p>These entries have a title block but no statement body outside their proof block.</p>
  <ul class="quality-list">
${emptyRows || "    <li>No empty statements were found.</li>"}
  </ul>
</section>
<section class="knowledge-problem-section">
  <h2>Duplicates <span class="quality-coverage quality-medium">${duplicateGroups.length}</span></h2>
  <p>These entries have matching titles, close edit distances, or substantially overlapping title/id words.</p>
  <div class="proof-coverage-list duplicate-knowledge-list">
${duplicateRows || "<p>No likely duplicates were found.</p>"}
  </div>
</section>`;
    const page = template
        .replaceAll("{{title}}", "Cleanup")
        .replace("{{content}}", content);
    const outPath = path.join(distDir, "cleanup.html");

    fs.writeFileSync(outPath, page, "utf-8");
    stats.files += 1;
    console.log(`Built: cleanup page -> ${outPath}`);
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

function proofIssueLabel(statement) {
    const reasons = Array.from(new Set(statement.proof.issues.flatMap((issue) => issue.reasons)));

    return reasons.length > 0 ? reasons.join("; ") : "proof quality";
}

function buildProofCoveragePage(template, stats, quality) {
    const rows = quality.incomplete.map((item) => {
        const percent = Math.round(item.coverage * 100);
        const isHidden = item.coverage < proofCoverageThreshold;
        const missingProofs = item.missingProofs.map((proof) => `<li>
    <a href="${escapeHtml(proof.href)}">${escapeHtml(proof.title)}</a>
    <span class="quality-coverage quality-low">${escapeHtml(proof.type)}</span>
    <span class="quality-coverage quality-medium">${escapeHtml(proofIssueLabel(proof))}</span>
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
  These pages have at least one proof that is empty or missing required knowledge links. A valid proof item needs content, a knowledge link in the statement, and a knowledge link in the proof body. Pages below ${Math.round(proofCoverageThreshold * 100)}% proof quality are hidden from directory pages until enough proof blocks are valid.
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

function buildSearchIndex(quality) {
    const items = Array.from(quality.statements.values())
        .map((statement) => ({
            id: statement.id,
            title: statement.title,
            titleHtml: statement.titleHtml,
            type: statement.type,
            href: statement.href,
            path: statement.path,
        }))
        .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));

    ensureDir(path.dirname(searchIndexPath));
    fs.writeFileSync(searchIndexPath, JSON.stringify(items, null, 2), "utf-8");
    console.log(`Built: search index -> ${searchIndexPath}`);
}

function cycleNodeIds(nodes, links) {
    const existing = new Set(nodes.map((node) => node.id));
    const adjacency = new Map(nodes.map((node) => [node.id, []]));

    for (const link of links) {
        if (existing.has(link.source) && existing.has(link.target)) {
            adjacency.get(link.source).push(link.target);
        }
    }

    const visited = new Set();
    const active = new Set();
    const cycleNodes = new Set();

    function visit(nodeId, stack) {
        visited.add(nodeId);
        active.add(nodeId);
        stack.push(nodeId);

        for (const next of adjacency.get(nodeId) || []) {
            if (!visited.has(next)) {
                visit(next, stack);
            } else if (active.has(next)) {
                const cycleStart = stack.indexOf(next);
                for (const cycleNode of stack.slice(cycleStart)) {
                    cycleNodes.add(cycleNode);
                }
            }
        }

        stack.pop();
        active.delete(nodeId);
    }

    for (const node of nodes) {
        if (!visited.has(node.id)) {
            visit(node.id, []);
        }
    }

    return cycleNodes;
}

function stronglyConnectedComponents(nodes, links) {
    const nodeIds = new Set(nodes.map((node) => node.id));
    const adjacency = new Map(nodes.map((node) => [node.id, []]));

    for (const link of links) {
        if (nodeIds.has(link.source) && nodeIds.has(link.target)) {
            adjacency.get(link.source).push(link.target);
        }
    }

    const indexByNode = new Map();
    const lowlinkByNode = new Map();
    const stack = [];
    const onStack = new Set();
    const components = [];
    let index = 0;

    function visit(nodeId) {
        indexByNode.set(nodeId, index);
        lowlinkByNode.set(nodeId, index);
        index += 1;
        stack.push(nodeId);
        onStack.add(nodeId);

        for (const next of adjacency.get(nodeId) || []) {
            if (!indexByNode.has(next)) {
                visit(next);
                lowlinkByNode.set(nodeId, Math.min(lowlinkByNode.get(nodeId), lowlinkByNode.get(next)));
            } else if (onStack.has(next)) {
                lowlinkByNode.set(nodeId, Math.min(lowlinkByNode.get(nodeId), indexByNode.get(next)));
            }
        }

        if (lowlinkByNode.get(nodeId) === indexByNode.get(nodeId)) {
            const component = [];
            let current;

            do {
                current = stack.pop();
                onStack.delete(current);
                component.push(current);
            } while (current !== nodeId);

            const hasSelfLoop = component.length === 1 && (adjacency.get(component[0]) || []).includes(component[0]);
            if (component.length > 1 || hasSelfLoop) {
                components.push(component.sort());
            }
        }
    }

    for (const node of nodes) {
        if (!indexByNode.has(node.id)) {
            visit(node.id);
        }
    }

    return components.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

function buildKnowledgeGraphData(quality, options = {}) {
    const includePaths = options.paths ? new Set(options.paths) : null;
    const nodes = Array.from(quality.statements.values())
        .filter((statement) => statement.type !== "exercise")
        .filter((statement) => !includePaths || includePaths.has(statement.path))
        .map((statement) => ({
            id: `${statement.path}#${statement.id}`,
            title: statement.title,
            titleHtml: statement.titleHtml,
            type: statement.type,
            href: statement.href,
            path: statement.path,
        }))
        .sort((a, b) => a.path.localeCompare(b.path) || a.id.localeCompare(b.id));
    const nodeIds = new Set(nodes.map((node) => node.id));
    const links = [];
    const seenLinks = new Set();

    for (const statement of quality.statements.values()) {
        const source = `${statement.path}#${statement.id}`;

        if (!nodeIds.has(source)) {
            continue;
        }

        for (const target of statement.linksTo) {
            if (!nodeIds.has(target)) {
                continue;
            }

            const key = `${source}->${target}`;
            if (!seenLinks.has(key)) {
                links.push({ source, target });
                seenLinks.add(key);
            }
        }
    }

    const degree = new Map(nodes.map((node) => [node.id, 0]));
    for (const link of links) {
        degree.set(link.source, (degree.get(link.source) || 0) + 1);
        degree.set(link.target, (degree.get(link.target) || 0) + 1);
    }

    const cycleNodes = cycleNodeIds(nodes, links);
    const cycleComponents = stronglyConnectedComponents(nodes, links);
    for (const node of nodes) {
        node.isolated = (degree.get(node.id) || 0) === 0;
        node.inCycle = cycleNodes.has(node.id);
    }

    return {
        generatedAt: new Date().toISOString(),
        nodes,
        links,
        stats: {
            nodes: nodes.length,
            links: links.length,
            isolatedNodes: nodes.filter((node) => node.isolated).length,
            cycleNodes: nodes.filter((node) => node.inCycle).length,
            cycles: cycleComponents.length,
        },
        cycles: cycleComponents.map((component) => component.map((id) => {
            const node = nodes.find((candidate) => candidate.id === id);
            return node || { id };
        })),
    };
}

function buildKnowledgeGraphPage(template, stats, quality) {
    const graph = buildKnowledgeGraphData(quality);
    ensureDir(path.dirname(knowledgeGraphPath));
    fs.writeFileSync(knowledgeGraphPath, JSON.stringify(graph, null, 2), "utf-8");
    console.log(`Built: knowledge graph data -> ${knowledgeGraphPath}`);

    const content = `<h1>Knowledge Graph</h1>
<p>
  This graph shows statement-level knowledge links across Openmath. Drag to pan, scroll to zoom, click a node to inspect it, and open the selected node to jump to the source knowledge.
</p>
<div class="knowledge-graph-shell">
  <div class="knowledge-graph-toolbar">
    <button type="button" data-graph-action="reset">Reset View</button>
    <button type="button" data-graph-action="open" disabled>Open Selected</button>
    <button type="button" data-graph-action="trace-root" disabled>Trace Root</button>
    <button type="button" data-graph-action="edge-labels" disabled>Show Labels</button>
    <span class="quality-coverage quality-low" data-graph-stat="isolated">${graph.stats.isolatedNodes} isolated</span>
    <span class="quality-coverage quality-medium" data-graph-stat="cycles">${graph.stats.cycleNodes} in cycles</span>
  </div>
  <canvas id="knowledge-graph" width="1200" height="760" aria-label="Interactive knowledge graph"></canvas>
  <div class="knowledge-graph-label" id="knowledge-graph-label" hidden></div>
  <div class="knowledge-graph-status" id="knowledge-graph-status">Loading graph...</div>
  <p class="knowledge-graph-legend">
    <span class="knowledge-graph-swatch knowledge-graph-swatch-normal"></span> linked
    <span class="knowledge-graph-swatch knowledge-graph-swatch-isolated"></span> isolated
    <span class="knowledge-graph-swatch knowledge-graph-swatch-cycle"></span> cycle
  </p>
</div>
<script src="/static/js/knowledge-graph.js" defer></script>`;
    const page = template
        .replaceAll("{{title}}", "Knowledge Graph")
        .replace("{{content}}", content);
    const outPath = path.join(distDir, "knowledge_graph.html");

    fs.writeFileSync(outPath, page, "utf-8");
    stats.files += 1;
    console.log(`Built: knowledge graph page -> ${outPath}`);
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

    profileStep("dist: clean", () => fs.rmSync(distDir, { recursive: true, force: true }));
    profileStep("dist: create", () => ensureDir(distDir));
    profileStep("static: copy project assets", () => copyDir(staticDir, path.join(distDir, "static")));
    profileStep("static: copy temml assets", copyTemmlAssets);

    const template = fs.readFileSync(templatePath, "utf-8");
    const quality = profileStep("quality: collect proof coverage/statements", collectProofCoverage);
    const stats = { files: 0, errors: 0 };
    profileStep("content: render pages", () => processContentDir(contentDir, template, stats, quality));
    profileStep("page: proof coverage", () => buildProofCoveragePage(template, stats, quality));
    profileStep("page: cleanup", () => buildCleanupPage(template, stats, quality));
    profileStep("page: knowledge graph", () => buildKnowledgeGraphPage(template, stats, quality));
    profileStep("page: coverage map", () => buildCoverageMapPage(template, stats, quality));
    profileStep("data: search index", () => buildSearchIndex(quality));
    printBuildProfile();

    console.log("");
    console.log(`Done. Built ${stats.files} HTML files to: ${distDir}`);
    console.log(`Render errors: ${stats.errors}`);
    console.log(`Proof quality threshold: ${Math.round(proofCoverageThreshold * 100)}%`);
    console.log(`Pages below proof quality threshold: ${quality.underThreshold.length}`);
    console.log(`Development mode: ${developmentMode ? "on; low-coverage directory links are marked" : "off; low-coverage directory links are hidden"}`);

    if (stats.errors > 0) {
        process.exitCode = 1;
    }
}

if (require.main === module) {
    build();
} else {
    module.exports = {
        buildKnowledgeGraphData,
        collectProofCoverage,
        contentDir,
        rootDir,
    };
}
