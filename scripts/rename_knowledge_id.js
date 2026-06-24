#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { contentDir, rootDir } = require("../build.js");

function usage() {
    console.log(`Usage:
  node scripts/rename_knowledge_id.js --page content/page.html OLD=NEW [OLD=NEW ...]
  node scripts/rename_knowledge_id.js --page content/page.html --apply OLD=NEW [OLD=NEW ...]
  node scripts/rename_knowledge_id.js --interactive --page content/page.html

Each direct run is a dry run unless --apply is present.

Examples:
  node scripts/rename_knowledge_id.js --page content/physics/index.html definition-joule=definition-joule-unit-of-energy
  node scripts/rename_knowledge_id.js --page content/physics/index.html --apply B=C A=B

Interactive commands:
  rename OLD NEW       Queue a rename
  check                Check the queued renames
  apply                Apply the queued renames if safe
  list                 Show queued renames
  clear                Clear queued renames
  help                 Show commands
  quit                 Exit`);
}

function normalizePagePath(input) {
    const clean = input.replace(/\\/g, "/").replace(/^\.?\//, "");
    const contentPrefix = "content/";

    if (clean.startsWith(contentPrefix)) {
        return clean.slice(contentPrefix.length);
    }

    const absolute = path.resolve(rootDir, input);
    if (absolute.startsWith(contentDir + path.sep)) {
        return path.relative(contentDir, absolute).split(path.sep).join("/");
    }

    return clean.replace(/^\/+/, "");
}

function walkHtmlFiles(dir, output = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkHtmlFiles(fullPath, output);
        } else if (entry.isFile() && entry.name.endsWith(".html")) {
            output.push(fullPath);
        }
    }
    return output;
}

function readPages() {
    return walkHtmlFiles(contentDir).map((filePath) => ({
        filePath,
        relativePath: path.relative(contentDir, filePath).split(path.sep).join("/"),
        source: fs.readFileSync(filePath, "utf8"),
    }));
}

function collectIds(source) {
    const ids = new Set();
    const regex = /\bid\s*=\s*(["'])([^"']+)\1/g;
    let match;
    while ((match = regex.exec(source)) !== null) {
        ids.add(match[2]);
    }
    return ids;
}

function validateId(id) {
    if (!id) {
        return "id is empty";
    }
    if (id.includes("#")) {
        return "id must not contain #";
    }
    if (/\s/.test(id)) {
        return "id must not contain whitespace";
    }
    if (/[<>"']/.test(id)) {
        return "id must not contain HTML quote or bracket characters";
    }
    return null;
}

function pageExists(relativePath) {
    return fs.existsSync(path.join(contentDir, relativePath));
}

function normalizeHrefPath(hrefPath, currentPage) {
    if (!hrefPath) {
        return currentPage;
    }

    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(hrefPath) || hrefPath.startsWith("//")) {
        return null;
    }

    let resolved;
    if (hrefPath.startsWith("/")) {
        resolved = hrefPath.slice(1);
    } else {
        resolved = path.posix.normalize(path.posix.join(path.posix.dirname(currentPage), hrefPath));
    }

    if (resolved.startsWith("../")) {
        return null;
    }
    if (resolved.endsWith("/")) {
        resolved += "index.html";
    }
    return resolved;
}

function resolveHref(value, currentPage) {
    const hashIndex = value.indexOf("#");
    if (hashIndex === -1) {
        return null;
    }

    const beforeHash = value.slice(0, hashIndex);
    const hash = value.slice(hashIndex + 1);
    if (!hash) {
        return null;
    }

    const queryIndex = beforeHash.indexOf("?");
    const hrefPath = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
    const targetPath = normalizeHrefPath(hrefPath, currentPage);
    if (!targetPath) {
        return null;
    }

    const suffixMatch = hash.match(/[?&].*$/);
    const id = suffixMatch ? hash.slice(0, suffixMatch.index) : hash;
    return { targetPath, id };
}

function replaceHrefId(value, newId) {
    const hashIndex = value.indexOf("#");
    const before = value.slice(0, hashIndex + 1);
    const hash = value.slice(hashIndex + 1);
    const suffixMatch = hash.match(/[?&].*$/);
    if (!suffixMatch) {
        return `${before}${newId}`;
    }
    return `${before}${newId}${hash.slice(suffixMatch.index)}`;
}

function parseRenameSpec(spec, defaultPage) {
    const equalsIndex = spec.indexOf("=");
    if (equalsIndex === -1) {
        throw new Error(`Rename spec must have OLD=NEW form: ${spec}`);
    }

    const left = spec.slice(0, equalsIndex);
    const to = spec.slice(equalsIndex + 1);
    const hashIndex = left.lastIndexOf("#");
    const page = hashIndex === -1 ? defaultPage : normalizePagePath(left.slice(0, hashIndex));
    const from = hashIndex === -1 ? left : left.slice(hashIndex + 1);

    if (!page) {
        throw new Error(`No page specified for rename: ${spec}`);
    }

    return { page, from, to };
}

function formatRename(rename) {
    return `${rename.page}#${rename.from} -> ${rename.to}`;
}

function assessRenames(pages, renames) {
    const pageByPath = new Map(pages.map((page) => [page.relativePath, page]));
    const currentIdsByPage = new Map();
    const errors = [];
    const warnings = [];

    for (const page of pages) {
        currentIdsByPage.set(page.relativePath, collectIds(page.source));
    }

    renames.forEach((rename, index) => {
        const prefix = `Step ${index + 1} (${formatRename(rename)})`;
        const fromError = validateId(rename.from);
        const toError = validateId(rename.to);
        if (fromError) {
            errors.push(`${prefix}: source ${fromError}.`);
            return;
        }
        if (toError) {
            errors.push(`${prefix}: target ${toError}.`);
            return;
        }
        if (rename.from === rename.to) {
            errors.push(`${prefix}: source and target are the same.`);
            return;
        }
        if (!pageByPath.has(rename.page)) {
            errors.push(`${prefix}: page does not exist under content/.`);
            return;
        }

        const ids = currentIdsByPage.get(rename.page);
        if (!ids.has(rename.from)) {
            errors.push(`${prefix}: source id does not exist at the time this step runs.`);
            return;
        }
        if (ids.has(rename.to)) {
            const laterMove = renames
                .slice(index + 1)
                .find((candidate) => candidate.page === rename.page && candidate.from === rename.to);
            const hint = laterMove
                ? ` The target is renamed later; put "${rename.to}=${laterMove.to}" before this step.`
                : ` Add a prior rename that moves "${rename.to}" out of the way, or choose another target id.`;
            errors.push(`${prefix}: target id already exists, so applying now would collide.${hint}`);
            return;
        }

        ids.delete(rename.from);
        ids.add(rename.to);
    });

    for (const rename of renames) {
        const targetPage = pageByPath.get(rename.page);
        if (!targetPage) {
            continue;
        }
        const inboundLinks = [];
        for (const page of pages) {
            const attrRegex = /\b(?:href|data-href)\s*=\s*(["'])([^"']*)\1/g;
            let match;
            while ((match = attrRegex.exec(page.source)) !== null) {
                const resolved = resolveHref(match[2], page.relativePath);
                if (resolved && resolved.targetPath === rename.page && resolved.id === rename.from) {
                    inboundLinks.push(page.relativePath);
                }
            }
        }
        if (inboundLinks.length === 0) {
            warnings.push(`${formatRename(rename)} has no inbound knowledge links to update.`);
        }
    }

    return {
        safe: errors.length === 0,
        errors,
        warnings,
    };
}

function applyRenames(pages, renames) {
    const pageByPath = new Map(pages.map((page) => [page.relativePath, { ...page }]));
    const changed = new Map();
    const stats = {
        idsRenamed: 0,
        linksRenamed: 0,
    };

    function setSource(relativePath, source) {
        const page = pageByPath.get(relativePath);
        page.source = source;
        changed.set(relativePath, page);
    }

    for (const rename of renames) {
        const targetPage = pageByPath.get(rename.page);
        let idChanged = false;
        const idRegex = /\bid\s*=\s*(["'])([^"']+)\1/g;
        const nextTargetSource = targetPage.source.replace(idRegex, (full, quote, id) => {
            if (id !== rename.from) {
                return full;
            }
            idChanged = true;
            return `id=${quote}${rename.to}${quote}`;
        });
        if (idChanged) {
            stats.idsRenamed += 1;
            setSource(rename.page, nextTargetSource);
        }

        for (const page of pageByPath.values()) {
            const attrRegex = /\b(href|data-href)\s*=\s*(["'])([^"']*)\2/g;
            let linkChanges = 0;
            const nextSource = page.source.replace(attrRegex, (full, attr, quote, value) => {
                const resolved = resolveHref(value, page.relativePath);
                if (!resolved || resolved.targetPath !== rename.page || resolved.id !== rename.from) {
                    return full;
                }
                linkChanges += 1;
                return `${attr}=${quote}${replaceHrefId(value, rename.to)}${quote}`;
            });
            if (linkChanges > 0) {
                stats.linksRenamed += linkChanges;
                setSource(page.relativePath, nextSource);
            }
        }
    }

    return {
        changedPages: Array.from(changed.values()),
        stats,
    };
}

function printAssessment(assessment) {
    if (assessment.safe) {
        console.log("Safe to rename: no collisions.");
    } else {
        console.log("Not safe to rename.");
        for (const error of assessment.errors) {
            console.log(`- ${error}`);
        }
    }
    for (const warning of assessment.warnings) {
        console.log(`- Warning: ${warning}`);
    }
}

function runDirect(args) {
    let defaultPage = null;
    let apply = false;
    const specs = [];

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === "--help" || arg === "-h") {
            usage();
            return;
        }
        if (arg === "--apply") {
            apply = true;
        } else if (arg === "--page") {
            index += 1;
            if (index >= args.length) {
                throw new Error("--page requires a path");
            }
            defaultPage = normalizePagePath(args[index]);
        } else if (arg === "--interactive") {
            throw new Error("--interactive must be handled before direct mode");
        } else {
            specs.push(arg);
        }
    }

    if (specs.length === 0) {
        usage();
        process.exitCode = 1;
        return;
    }

    const renames = specs.map((spec) => parseRenameSpec(spec, defaultPage));
    const pages = readPages();
    const assessment = assessRenames(pages, renames);
    printAssessment(assessment);
    if (!assessment.safe) {
        process.exitCode = 1;
        return;
    }

    const result = applyRenames(pages, renames);
    console.log(`Ids to rename: ${result.stats.idsRenamed}`);
    console.log(`Links to update: ${result.stats.linksRenamed}`);
    console.log(`Files to change: ${result.changedPages.length}`);
    for (const page of result.changedPages) {
        console.log(`- content/${page.relativePath}`);
    }

    if (!apply) {
        console.log("Dry run only. Re-run with --apply to write changes.");
        return;
    }

    for (const page of result.changedPages) {
        fs.writeFileSync(page.filePath, page.source);
    }
    console.log("Applied.");
}

function showInteractiveHelp() {
    console.log(`Commands:
  rename OLD NEW       Queue a rename
  check                Check the queued renames
  apply                Apply the queued renames if safe
  list                 Show queued renames
  clear                Clear queued renames
  help                 Show commands
  quit                 Exit`);
}

async function runInteractive(args) {
    let defaultPage = null;
    for (let index = 0; index < args.length; index += 1) {
        if (args[index] === "--page") {
            index += 1;
            if (index >= args.length) {
                throw new Error("--page requires a path");
            }
            defaultPage = normalizePagePath(args[index]);
        }
    }

    if (!defaultPage || !pageExists(defaultPage)) {
        throw new Error("--interactive requires --page content/page.html");
    }

    const queued = [];
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "rename-id> ",
    });

    console.log(`Interactive id renamer for content/${defaultPage}`);
    showInteractiveHelp();
    rl.prompt();

    for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) {
            rl.prompt();
            continue;
        }

        const [command, ...rest] = trimmed.split(/\s+/);
        try {
            if (command === "quit" || command === "exit") {
                break;
            } else if (command === "help") {
                showInteractiveHelp();
            } else if (command === "clear") {
                queued.length = 0;
                console.log("Queue cleared.");
            } else if (command === "list") {
                if (queued.length === 0) {
                    console.log("No renames queued.");
                } else {
                    queued.forEach((rename, index) => {
                        console.log(`${index + 1}. ${formatRename(rename)}`);
                    });
                }
            } else if (command === "rename") {
                if (rest.length !== 2) {
                    console.log("Usage: rename OLD NEW");
                } else {
                    queued.push({ page: defaultPage, from: rest[0], to: rest[1] });
                    const assessment = assessRenames(readPages(), queued);
                    printAssessment(assessment);
                }
            } else if (command === "check") {
                printAssessment(assessRenames(readPages(), queued));
            } else if (command === "apply") {
                const pages = readPages();
                const assessment = assessRenames(pages, queued);
                printAssessment(assessment);
                if (assessment.safe) {
                    const result = applyRenames(pages, queued);
                    for (const page of result.changedPages) {
                        fs.writeFileSync(page.filePath, page.source);
                    }
                    console.log(`Applied ${result.stats.idsRenamed} id rename(s) and ${result.stats.linksRenamed} link update(s).`);
                    queued.length = 0;
                }
            } else {
                console.log(`Unknown command: ${command}`);
                showInteractiveHelp();
            }
        } catch (error) {
            console.log(error.message);
        }
        rl.prompt();
    }

    rl.close();
}

async function main() {
    const args = process.argv.slice(2);
    if (args.includes("--interactive")) {
        await runInteractive(args);
        return;
    }
    runDirect(args);
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
