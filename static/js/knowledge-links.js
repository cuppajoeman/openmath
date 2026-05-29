async function fetchHtmlDocument(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Could not fetch ${url}: ${response.status}`);
    }

    const html = await response.text();
    return new DOMParser().parseFromString(html, "text/html");
}

function linkTarget(link) {
    return link.getAttribute("href") || "";
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
        link.after(destination);

        setUpKnowledgeLinks(destination);
        if (window.setUpProofToggles) {
            window.setUpProofToggles(destination);
        }

        link.dataset.openedAtLeastOnce = "true";
        link.dataset.currentlyOpened = "true";
        return;
    }

    const expanded = link.nextElementSibling;
    if (!expanded || !expanded.classList.contains("expanded-knowledge")) {
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

    if (searchRoot.matches && searchRoot.matches("a.knowledge-link, a.rlink, math a")) {
        links.push(searchRoot);
    }

    links.push(...searchRoot.querySelectorAll("a.knowledge-link, a.rlink, math a"));
    links.forEach(setUpKnowledgeLink);
}

window.setUpKnowledgeLinks = setUpKnowledgeLinks;

document.addEventListener("DOMContentLoaded", function () {
    setUpKnowledgeLinks(document);
});
