(function () {
    const knowledgeSelector = ".definition[id], .theorem[id], .proposition[id], .lemma[id], .corollary[id], .exercise[id]";

    function titleFor(block) {
        return Array.from(block.children).find(function (child) {
            return child.classList.contains("title");
        });
    }

    function linkFor(block) {
        if (block.dataset.knowledgeUrl) {
            return block.dataset.knowledgeUrl;
        }

        const url = new URL(window.location.href);
        url.hash = block.id;
        return url.toString();
    }

    function fallbackCopy(text) {
        const input = document.createElement("textarea");
        input.value = text;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
    }

    async function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }

        fallbackCopy(text);
    }

    function flashCopied(button) {
        const original = button.textContent;
        button.textContent = "copied";
        button.dataset.copied = "true";

        window.setTimeout(function () {
            button.textContent = original;
            delete button.dataset.copied;
        }, 1200);
    }

    function setUpCopyButton(block) {
        if (block.dataset.copyLinkReady === "true") {
            return;
        }

        const title = titleFor(block);
        if (!title) {
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "knowledge-copy-link";
        button.textContent = "#";
        button.title = "Copy link";
        button.setAttribute("aria-label", "Copy link to this knowledge item");

        button.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();

            copyText(linkFor(block)).then(function () {
                flashCopied(button);
            }).catch(function (error) {
                console.error(error);
            });
        });

        title.appendChild(button);
        block.dataset.copyLinkReady = "true";
    }

    function setUpKnowledgeCopyLinks(root) {
        const searchRoot = root || document;
        const blocks = [];

        if (searchRoot.matches && searchRoot.matches(knowledgeSelector)) {
            blocks.push(searchRoot);
        }

        blocks.push(...searchRoot.querySelectorAll(knowledgeSelector));
        blocks.forEach(setUpCopyButton);
    }

    window.setUpKnowledgeCopyLinks = setUpKnowledgeCopyLinks;

    document.addEventListener("DOMContentLoaded", function () {
        setUpKnowledgeCopyLinks(document);
    });
})();