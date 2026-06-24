#!/usr/bin/env node

const path = require("path");
const {
    buildKnowledgeGraphData,
    collectProofCoverage,
    contentDir,
    rootDir,
} = require("../build.js");

function usage() {
    console.log(`Usage:
  node scripts/analyze_knowledge_graph.js [--all] [--json] [content/page.html ...]

Examples:
  node scripts/analyze_knowledge_graph.js content/physics/index.html
  node scripts/analyze_knowledge_graph.js content/physics/index.html content/physics/radiometry.html
  node scripts/analyze_knowledge_graph.js --all`);
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

    return clean;
}

function main() {
    const args = process.argv.slice(2);
    const json = args.includes("--json");
    const all = args.includes("--all");
    const help = args.includes("--help") || args.includes("-h");
    const pages = args
        .filter((arg) => !arg.startsWith("--"))
        .map(normalizePagePath);

    if (help) {
        usage();
        return;
    }

    if (!all && pages.length === 0) {
        usage();
        process.exitCode = 1;
        return;
    }

    const quality = collectProofCoverage();
    const graph = buildKnowledgeGraphData(quality, all ? {} : { paths: pages });

    if (json) {
        console.log(JSON.stringify(graph, null, 2));
        return;
    }

    console.log(`Knowledge graph analysis${all ? " (all pages)" : ` (${pages.join(", ")})`}`);
    console.log(`Nodes: ${graph.stats.nodes}`);
    console.log(`Links: ${graph.stats.links}`);
    console.log(`Isolated nodes: ${graph.stats.isolatedNodes}`);
    console.log(`Cycle nodes: ${graph.stats.cycleNodes}`);
    console.log(`Cycles: ${graph.stats.cycles}`);

    if (graph.cycles.length === 0) {
        return;
    }

    console.log("");
    console.log("Cycles:");
    graph.cycles.forEach((cycle, index) => {
        console.log(`${index + 1}. ${cycle.length} nodes`);
        for (const node of cycle) {
            console.log(`   - ${node.title} (${node.type}) /${node.id}`);
        }
    });
}

main();
