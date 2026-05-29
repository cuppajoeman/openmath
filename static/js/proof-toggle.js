function setUpProofToggles(root) {
    const statementSelector = ".theorem, .proposition, .lemma, .corollary, .exercise";
    const searchRoot = root || document;
    const statements = [];

    if (searchRoot.matches && searchRoot.matches(statementSelector)) {
        statements.push(searchRoot);
    }

    statements.push(...searchRoot.querySelectorAll(statementSelector));

    statements.forEach(function (statement) {
        const proof = Array.from(statement.children).find(function (child) {
            return child.classList.contains("proof");
        });

        if (!proof || proof.parentElement.classList.contains("new-proof")) {
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "new-proof";

        const buttonLine = document.createElement("div");
        buttonLine.className = "line-with-centered-text";

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "show proof";
        button.dataset.hidden = "true";

        const content = document.createElement("div");
        content.className = "content";
        content.style.display = "none";

        while (proof.firstChild) {
            content.appendChild(proof.firstChild);
        }

        button.addEventListener("click", function () {
            const isHidden = button.dataset.hidden === "true";
            content.style.display = isHidden ? "block" : "none";
            button.textContent = isHidden ? "hide proof" : "show proof";
            button.dataset.hidden = isHidden ? "false" : "true";
        });

        buttonLine.appendChild(button);
        wrapper.appendChild(buttonLine);
        wrapper.appendChild(content);
        proof.replaceWith(wrapper);
    });
}

window.setUpProofToggles = setUpProofToggles;

document.addEventListener("DOMContentLoaded", function () {
    setUpProofToggles(document);
});
