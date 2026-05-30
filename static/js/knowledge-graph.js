(function () {
    const canvas = document.getElementById("knowledge-graph");
    const status = document.getElementById("knowledge-graph-status");
    const label = document.getElementById("knowledge-graph-label");
    const resetButton = document.querySelector("[data-graph-action='reset']");
    const openButton = document.querySelector("[data-graph-action='open']");
    const traceRootButton = document.querySelector("[data-graph-action='trace-root']");
    const edgeLabelsButton = document.querySelector("[data-graph-action='edge-labels']");

    if (!canvas || !status) {
        return;
    }

    const ctx = canvas.getContext("2d");
    const state = {
        graph: null,
        nodes: [],
        links: [],
        selected: null,
        hovered: null,
        selectedLinks: new Set(),
        showEdgeLabels: false,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        dragging: false,
        dragNode: null,
        lastX: 0,
        lastY: 0,
        startX: 0,
        startY: 0,
        moved: false,
        animation: null,
    };

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(800, Math.floor(rect.width * dpr));
        canvas.height = Math.max(460, Math.floor(rect.height * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function graphToScreen(point) {
        return {
            x: point.x * state.scale + state.offsetX,
            y: point.y * state.scale + state.offsetY,
        };
    }

    function screenToGraph(x, y) {
        return {
            x: (x - state.offsetX) / state.scale,
            y: (y - state.offsetY) / state.scale,
        };
    }

    function graphBounds() {
        if (state.nodes.length === 0) {
            return { minX: -1, maxX: 1, minY: -1, maxY: 1, width: 2, height: 2 };
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const node of state.nodes) {
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y);
        }

        return {
            minX,
            maxX,
            minY,
            maxY,
            width: Math.max(1, maxX - minX),
            height: Math.max(1, maxY - minY),
        };
    }

    function minScaleForBounds() {
        const rect = canvas.getBoundingClientRect();
        const bounds = graphBounds();

        return Math.min(
            0.75,
            rect.width / (bounds.width * 2),
            rect.height / (bounds.height * 2)
        );
    }

    function clampScale(scale) {
        return Math.max(minScaleForBounds(), Math.min(5, scale));
    }

    function nodeColor(node) {
        if (node.inCycle) {
            return "rgb(214, 153, 68)";
        }

        if (node.isolated) {
            return "rgb(214, 68, 68)";
        }

        if (node.type === "definition") {
            return "rgb(74, 139, 170)";
        }

        if (node.type === "theorem") {
            return "rgb(72, 150, 90)";
        }

        return "rgb(160, 120, 190)";
    }

    function initialLayout(graph) {
        const nodes = graph.nodes.map((node, index) => {
            const ring = Math.sqrt(index + 1) * 34;
            const angle = index * 2.399963229728653;
            return {
                ...node,
                x: Math.cos(angle) * ring,
                y: Math.sin(angle) * ring,
                vx: 0,
                vy: 0,
                radius: node.isolated ? 7 : 5,
            };
        });
        const nodeById = new Map(nodes.map((node) => [node.id, node]));
        const links = graph.links
            .map((link) => ({
                source: nodeById.get(link.source),
                target: nodeById.get(link.target),
            }))
            .filter((link) => link.source && link.target);

        for (const node of nodes) {
            node.neighbors = [];
            node.inLinks = [];
            node.outLinks = [];
            node.degree = 0;
        }

        for (const link of links) {
            link.source.neighbors.push(link.target);
            link.target.neighbors.push(link.source);
            link.source.outLinks.push(link);
            link.target.inLinks.push(link);
        }

        for (const node of nodes) {
            node.degree = node.neighbors.length;
        }

        state.graph = graph;
        state.nodes = nodes;
        state.links = links;
        resetView();
        settleLayout();
    }

    function resetView() {
        const rect = canvas.getBoundingClientRect();
        state.scale = clampScale(0.75);
        state.offsetX = rect.width / 2;
        state.offsetY = rect.height / 2;
        positionLabel();
    }

    function isSelectedEdge(link) {
        return state.selectedLinks.has(link);
    }

    function selectedEdges() {
        return Array.from(state.selectedLinks);
    }

    function incidentEdges(node) {
        if (!node) {
            return [];
        }

        return state.links.filter((link) => link.source === node || link.target === node);
    }

    function selectEdges(links) {
        state.selectedLinks = new Set(links);
    }

    function selectedEdgeNodes() {
        const nodes = new Set();

        for (const link of selectedEdges()) {
            nodes.add(link.source);
            nodes.add(link.target);
        }

        return nodes;
    }

    function traceRootEdges(node) {
        if (!node) {
            return [];
        }

        const path = [];
        const visited = new Set([node]);
        let current = node;

        while (current.outLinks.length > 0) {
            const candidates = current.outLinks
                .filter((link) => !visited.has(link.target))
                .sort((a, b) => (
                    a.target.outLinks.length - b.target.outLinks.length ||
                    a.target.degree - b.target.degree ||
                    a.target.title.localeCompare(b.target.title)
                ));

            if (candidates.length === 0) {
                break;
            }

            const nextLink = candidates[0];
            path.push(nextLink);
            current = nextLink.target;
            visited.add(current);
        }

        return path;
    }

    function tick(strength) {
        const nodes = state.nodes;
        const links = state.links;
        const centerPull = 0.002 * strength;
        let maxVelocity = 0;

        for (let i = 0; i < nodes.length; i += 1) {
            const a = nodes[i];

            for (let j = i + 1; j < nodes.length; j += 1) {
                const b = nodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distanceSquared = Math.max(64, dx * dx + dy * dy);
                const force = 90 * strength / distanceSquared;
                const fx = dx * force;
                const fy = dy * force;

                a.vx += fx;
                a.vy += fy;
                b.vx -= fx;
                b.vy -= fy;
            }
        }

        for (const link of links) {
            const dx = link.target.x - link.source.x;
            const dy = link.target.y - link.source.y;
            const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const desired = 92 + Math.min(72, (link.source.degree + link.target.degree) * 1.8);
            const force = (distance - desired) * 0.006 * strength;
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            link.source.vx += fx;
            link.source.vy += fy;
            link.target.vx -= fx;
            link.target.vy -= fy;
        }

        spreadIncidentEdges(strength);

        for (const node of nodes) {
            if (node === state.dragNode) {
                node.vx = 0;
                node.vy = 0;
                continue;
            }

            node.vx -= node.x * centerPull;
            node.vy -= node.y * centerPull;
            node.vx *= 0.84;
            node.vy *= 0.84;
            node.x += node.vx;
            node.y += node.vy;
            maxVelocity = Math.max(maxVelocity, Math.abs(node.vx), Math.abs(node.vy));
        }

        return maxVelocity;
    }

    function spreadIncidentEdges(strength) {
        for (const center of state.nodes) {
            if (center.neighbors.length < 3) {
                continue;
            }

            const spokes = center.neighbors
                .map((neighbor) => ({
                    node: neighbor,
                    angle: Math.atan2(neighbor.y - center.y, neighbor.x - center.x),
                }))
                .sort((a, b) => a.angle - b.angle);
            const targetGap = Math.min(Math.PI / 3, Math.PI * 2 / Math.min(16, center.neighbors.length));

            for (let i = 0; i < spokes.length; i += 1) {
                const current = spokes[i];
                const next = spokes[(i + 1) % spokes.length];
                const nextAngle = i === spokes.length - 1 ? next.angle + Math.PI * 2 : next.angle;
                const gap = nextAngle - current.angle;

                if (gap >= targetGap) {
                    continue;
                }

                const push = (targetGap - gap) * 0.015 * strength;
                applyAngularPush(center, current.node, -push);
                applyAngularPush(center, next.node, push);
            }
        }
    }

    function applyAngularPush(center, node, amount) {
        const dx = node.x - center.x;
        const dy = node.y - center.y;
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const tangentX = -dy / distance;
        const tangentY = dx / distance;

        node.vx += tangentX * amount;
        node.vy += tangentY * amount;
        center.vx -= tangentX * amount * 0.18;
        center.vy -= tangentY * amount * 0.18;
    }

    function settleLayout() {
        let velocity = Infinity;

        for (let i = 0; i < 360 && velocity > 0.018; i += 1) {
            const strength = i < 240 ? 1 : 0.35;
            velocity = tick(strength);
        }
    }

    function drawArrow(link, highlighted) {
        const source = graphToScreen(link.source);
        const target = graphToScreen(link.target);
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const endX = target.x - (dx / distance) * (link.target.radius * state.scale + 4);
        const endY = target.y - (dy / distance) * (link.target.radius * state.scale + 4);

        ctx.lineWidth = highlighted ? 2.35 : 1;
        ctx.strokeStyle = highlighted ? "rgba(255, 236, 150, 0.95)" : "rgba(160, 160, 160, 0.32)";
        ctx.fillStyle = highlighted ? "rgba(255, 236, 150, 0.95)" : "rgba(160, 160, 160, 0.32)";
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        if (state.scale > 0.45) {
            const angle = Math.atan2(dy, dx);
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - Math.cos(angle - 0.45) * 7, endY - Math.sin(angle - 0.45) * 7);
            ctx.lineTo(endX - Math.cos(angle + 0.45) * 7, endY - Math.sin(angle + 0.45) * 7);
            ctx.closePath();
            ctx.fill();
        }
    }

    function draw() {
        const rect = canvas.getBoundingClientRect();
        const edgeNodes = selectedEdgeNodes();
        ctx.clearRect(0, 0, rect.width, rect.height);

        for (const link of state.links) {
            if (!isSelectedEdge(link)) {
                drawArrow(link, false);
            }
        }

        for (const link of state.links) {
            if (isSelectedEdge(link)) {
                drawArrow(link, true);
            }
        }

        for (const node of state.nodes) {
            const point = graphToScreen(node);
            const radius = Math.max(3, node.radius * state.scale);
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = nodeColor(node);
            ctx.fill();

            if (node === state.selected || node === state.hovered || edgeNodes.has(node)) {
                ctx.lineWidth = node === state.selected ? 3 : 2;
                ctx.strokeStyle = edgeNodes.has(node) && node !== state.hovered ? "rgb(255, 236, 150)" : "white";
                ctx.stroke();
            }
        }

        positionLabel();
    }

    function labelHtml(node) {
        return `<span>${node.type}: </span>${node.titleHtml || node.title}`;
    }

    function labelItemHtml(node) {
        const point = graphToScreen(node);
        const minLeft = canvas.offsetLeft;
        const maxLeft = Math.max(minLeft, canvas.offsetLeft + canvas.offsetWidth - 260);
        const minTop = canvas.offsetTop + 34;
        const maxTop = Math.max(minTop, canvas.offsetTop + canvas.offsetHeight - 20);
        const left = Math.max(minLeft, Math.min(maxLeft, canvas.offsetLeft + point.x));
        const top = Math.max(minTop, Math.min(maxTop, canvas.offsetTop + point.y));

        return `<div class="knowledge-graph-label-item" style="left: ${left}px; top: ${top}px;">${labelHtml(node)}</div>`;
    }

    function positionLabel() {
        if (!label) {
            return;
        }

        if (state.showEdgeLabels && selectedEdges().length > 0) {
            const nodes = Array.from(selectedEdgeNodes());

            if (nodes.length > 0) {
                label.hidden = false;
                label.innerHTML = nodes.map(labelItemHtml).join("");
                return;
            }
        }

        const labelNode = state.selected || state.hovered;
        if (!labelNode) {
            label.hidden = true;
            label.innerHTML = "";
            return;
        }

        label.hidden = false;
        label.innerHTML = labelItemHtml(labelNode);
    }

    function animate() {
        draw();
        state.animation = window.requestAnimationFrame(animate);
    }

    function nodeAt(x, y) {
        const graphPoint = screenToGraph(x, y);
        let best = null;
        let bestDistance = Infinity;

        for (const node of state.nodes) {
            const dx = node.x - graphPoint.x;
            const dy = node.y - graphPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const hitRadius = Math.max(10 / state.scale, node.radius + 4);

            if (distance <= hitRadius && distance < bestDistance) {
                best = node;
                bestDistance = distance;
            }
        }

        return best;
    }

    function updateStatus(node) {
        if (!node) {
            status.textContent = `${state.graph.stats.nodes} nodes, ${state.graph.stats.links} links. Red nodes are isolated; amber nodes are in directed cycles.`;
            openButton.disabled = true;
            if (traceRootButton) {
                traceRootButton.disabled = true;
            }
            if (edgeLabelsButton) {
                edgeLabelsButton.disabled = true;
                edgeLabelsButton.textContent = "Show Labels";
            }
            return;
        }

        const edgeCount = selectedEdges().length;
        const flags = [
            node.isolated ? "isolated" : "",
            node.inCycle ? "cycle" : "",
        ].filter(Boolean).join(", ");
        status.textContent = `${node.type}: ${node.title} (${node.path})${flags ? ` - ${flags}` : ""}${edgeCount ? ` - ${edgeCount} selected edges` : ""}`;
        openButton.disabled = false;
        if (traceRootButton) {
            traceRootButton.disabled = traceRootEdges(node).length === 0;
        }
        if (edgeLabelsButton) {
            const count = selectedEdges().length;
            if (count === 0) {
                state.showEdgeLabels = false;
            }
            edgeLabelsButton.disabled = count === 0;
            edgeLabelsButton.textContent = state.showEdgeLabels
                ? `Hide Labels (${count})`
                : `Show Labels (${count})`;
        }
    }

    canvas.addEventListener("mousedown", function (event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const node = nodeAt(x, y);

        state.dragging = true;
        state.dragNode = node;
        state.lastX = x;
        state.lastY = y;
        state.startX = x;
        state.startY = y;
        state.moved = false;
        if (node) {
            state.selected = node;
            selectEdges(incidentEdges(node));
            updateStatus(node);
        }
    });

    window.addEventListener("mousemove", function (event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (state.dragging) {
            const dx = x - state.lastX;
            const dy = y - state.lastY;
            const totalDx = x - state.startX;
            const totalDy = y - state.startY;

            if (Math.sqrt(totalDx * totalDx + totalDy * totalDy) > 4) {
                state.moved = true;
            }

            if (state.dragNode) {
                state.dragNode.x += dx / state.scale;
                state.dragNode.y += dy / state.scale;
            } else {
                state.offsetX += dx;
                state.offsetY += dy;
            }

            state.lastX = x;
            state.lastY = y;
            return;
        }

        state.hovered = nodeAt(x, y);
        canvas.style.cursor = state.hovered ? "pointer" : "grab";
    });

    window.addEventListener("mouseup", function () {
        state.dragging = false;
        state.dragNode = null;
    });

    canvas.addEventListener("click", function (event) {
        if (state.moved) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const node = nodeAt(event.clientX - rect.left, event.clientY - rect.top);

        state.selected = node || null;
        if (state.selected) {
            selectEdges(incidentEdges(state.selected));
        } else {
            selectEdges([]);
            state.showEdgeLabels = false;
        }
        updateStatus(state.selected);
        positionLabel();
    });

    canvas.addEventListener("dblclick", function () {
        if (state.selected) {
            window.location.href = state.selected.href;
        }
    });

    canvas.addEventListener("wheel", function (event) {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const before = screenToGraph(event.clientX - rect.left, event.clientY - rect.top);
        const factor = event.deltaY < 0 ? 1.12 : 0.88;

        state.scale = clampScale(state.scale * factor);

        const after = graphToScreen(before);
        state.offsetX += event.clientX - rect.left - after.x;
        state.offsetY += event.clientY - rect.top - after.y;
        positionLabel();
    }, { passive: false });

    if (resetButton) {
        resetButton.addEventListener("click", function () {
            resetView();
        });
    }

    if (openButton) {
        openButton.addEventListener("click", function () {
            if (state.selected) {
                window.location.href = state.selected.href;
            }
        });
    }

    if (traceRootButton) {
        traceRootButton.addEventListener("click", function () {
            if (!state.selected) {
                return;
            }

            selectEdges(traceRootEdges(state.selected));
            updateStatus(state.selected);
            positionLabel();
        });
    }

    if (edgeLabelsButton) {
        edgeLabelsButton.addEventListener("click", function () {
            if (selectedEdges().length === 0) {
                return;
            }

            state.showEdgeLabels = !state.showEdgeLabels;
            updateStatus(state.selected);
            positionLabel();
        });
    }

    window.addEventListener("resize", function () {
        resizeCanvas();
        state.scale = clampScale(state.scale);
        draw();
    });

    resizeCanvas();
    fetch("/static/knowledge-graph.json")
        .then((response) => response.json())
        .then((graph) => {
            initialLayout(graph);
            updateStatus(null);
            animate();
        })
        .catch((error) => {
            status.textContent = `Unable to load graph: ${error.message}`;
        });
}());
