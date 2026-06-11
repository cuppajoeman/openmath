async function fetchHtmlDocument(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Could not fetch ${url}: ${response.status}`);
    }

    const html = await response.text();
    return new DOMParser().parseFromString(html, "text/html");
}

function linkTarget(link) {
    return link.getAttribute("href") || link.dataset.href || "";
}

function normalizeTarget(rawTarget) {
    const url = new URL(rawTarget, window.location.href);
    const selector = url.hash;

    if (!selector) {
        return null;
    }

    url.hash = "";
    return { url: url.toString(), selector };
}

function isMathKnowledgeLink(link) {
    return Boolean(link.closest && link.closest("math"));
}

function splitTrailingTagParen(link) {
    if (!link.closest || !link.closest(".tml-tag") || link.dataset.trailingTagParenSplit === "true") {
        return;
    }

    const text = link.textContent || "";
    if (!text.endsWith(")")) {
        return;
    }

    link.textContent = text.slice(0, -1);

    const paren = document.createElementNS("http://www.w3.org/1998/Math/MathML", "mtext");
    paren.textContent = ")";
    link.after(paren);
    link.dataset.trailingTagParenSplit = "true";
}

function expandedKnowledgeFor(link) {
    const instanceId = link.dataset.expandedKnowledgeInstanceId;

    if (instanceId) {
        return document.querySelector(`[data-knowledge-instance-id="${CSS.escape(instanceId)}"]`);
    }

    const expanded = link.nextElementSibling;
    return expanded && expanded.classList.contains("expanded-knowledge") ? expanded : null;
}

function insertExpandedKnowledge(link, destination) {
    const instanceId = `knowledge-${Math.random().toString(36).slice(2)}`;
    const math = isMathKnowledgeLink(link) ? link.closest("math") : null;

    destination.dataset.knowledgeInstanceId = instanceId;
    link.dataset.expandedKnowledgeInstanceId = instanceId;

    if (math) {
        math.after(destination);
        return;
    }

    link.after(destination);
}

async function openKnowledgeLink(link, target) {
    const parsed = normalizeTarget(target);
    if (!parsed) {
        return;
    }

    const firstOpen = link.dataset.openedAtLeastOnce !== "true";
    if (firstOpen) {
        const documentFragment = await fetchHtmlDocument(parsed.url);
        const destination = documentFragment.querySelector(parsed.selector);

        if (!destination) {
            throw new Error(`No element found for ${parsed.selector} in ${parsed.url}`);
        }

        destination.classList.add("expanded-knowledge");
        destination.dataset.knowledgeUrl = `${parsed.url}${parsed.selector}`;
        insertExpandedKnowledge(link, destination);

        setUpKnowledgeLinks(destination);
        if (window.setUpProofToggles) {
            window.setUpProofToggles(destination);
        }
        if (window.setUpKnowledgeCopyLinks) {
            window.setUpKnowledgeCopyLinks(destination);
        }

        link.dataset.openedAtLeastOnce = "true";
        link.dataset.currentlyOpened = "true";
        return;
    }

    const expanded = expandedKnowledgeFor(link);
    if (!expanded) {
        link.dataset.openedAtLeastOnce = "false";
        await openKnowledgeLink(link, target);
        return;
    }

    const isOpen = link.dataset.currentlyOpened === "true";
    expanded.style.display = isOpen ? "none" : "block";
    link.dataset.currentlyOpened = isOpen ? "false" : "true";
}

function setUpKnowledgeLink(link) {
    if (link.dataset.knowledgeLinkReady === "true") {
        return;
    }

    const target = linkTarget(link);
    if (!target.includes("#")) {
        return;
    }

    if (isMathKnowledgeLink(link)) {
        splitTrailingTagParen(link);
        link.classList.add("knowledge-link");
    }

    link.dataset.knowledgeLinkReady = "true";
    link.dataset.openedAtLeastOnce = "false";
    link.dataset.currentlyOpened = "false";

    link.addEventListener("click", function (event) {
        event.preventDefault();
        openKnowledgeLink(link, target).catch(function (error) {
            console.error(error);
        });
    });
}

function setUpKnowledgeLinks(root) {
    const searchRoot = root || document;
    const links = [];
    const selector = "a.knowledge-link, a.rlink, math a, math .knowledge-link, math [data-href]";

    if (searchRoot.matches && searchRoot.matches(selector)) {
        links.push(searchRoot);
    }

    links.push(...searchRoot.querySelectorAll(selector));
    links.forEach(setUpKnowledgeLink);
}

window.setUpKnowledgeLinks = setUpKnowledgeLinks;

document.addEventListener("DOMContentLoaded", function () {
    setUpKnowledgeLinks(document);
});
