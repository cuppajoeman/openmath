(function () {
    const maxResults = 12;
    let indexPromise = null;
    let items = [];
    let results = [];
    let activeIndex = 0;
    let root = null;
    let input = null;
    let list = null;

    function ensureUi() {
        if (root) {
            return;
        }

        root = document.createElement("div");
        root.className = "knowledge-search";
        root.hidden = true;
        root.innerHTML = [
            '<div class="knowledge-search-panel" role="dialog" aria-modal="true" aria-label="Knowledge search">',
            '  <input class="knowledge-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="Search definitions and theorems">',
            '  <div class="knowledge-search-meta">Shift+Space to search, Enter to open, Esc to close</div>',
            '  <ol class="knowledge-search-results" role="listbox"></ol>',
            '</div>',
        ].join("");

        document.body.append(root);
        input = root.querySelector(".knowledge-search-input");
        list = root.querySelector(".knowledge-search-results");

        root.addEventListener("click", function (event) {
            if (event.target === root) {
                closeSearch();
            }
        });

        input.addEventListener("input", function () {
            updateResults(input.value);
        });

        input.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                event.preventDefault();
                closeSearch();
            } else if (event.key === "ArrowDown") {
                event.preventDefault();
                moveActive(1);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                moveActive(-1);
            } else if (event.key === "Enter") {
                event.preventDefault();
                openActiveResult();
            }
        });
    }

    function loadIndex() {
        if (!indexPromise) {
            indexPromise = fetch("/static/search-index.json")
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("Could not load search index");
                    }
                    return response.json();
                })
                .then(function (loadedItems) {
                    items = loadedItems.map(function (item) {
                        const haystack = [
                            item.id,
                            item.title,
                            item.type,
                            item.path,
                        ].join(" ").toLowerCase();

                        return Object.assign({}, item, { haystack });
                    });
                    return items;
                });
        }

        return indexPromise;
    }

    function words(query) {
        return query
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);
    }

    function subsequenceScore(needle, haystack) {
        let score = 0;
        let cursor = 0;
        let streak = 0;

        for (let i = 0; i < needle.length; i += 1) {
            const found = haystack.indexOf(needle[i], cursor);
            if (found === -1) {
                return -1;
            }

            streak = found === cursor ? streak + 1 : 1;
            score += 2 + streak;
            cursor = found + 1;
        }

        return score;
    }

    function scoreItem(item, queryWords) {
        if (queryWords.length === 0) {
            return 0;
        }

        let total = 0;
        for (const word of queryWords) {
            if (item.haystack.includes(word)) {
                total += 100 + word.length * 4;
                if (item.id.includes(word)) {
                    total += 40;
                }
                if (item.title.toLowerCase().includes(word)) {
                    total += 20;
                }
                continue;
            }

            const fuzzy = subsequenceScore(word, item.haystack);
            if (fuzzy < 0) {
                return -1;
            }
            total += fuzzy;
        }

        return total;
    }

    function formatType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1);
    }

    function renderResults() {
        list.innerHTML = "";

        if (results.length === 0) {
            const empty = document.createElement("li");
            empty.className = "knowledge-search-empty";
            empty.textContent = "No matching knowledge items";
            list.append(empty);
            return;
        }

        results.forEach(function (item, index) {
            const row = document.createElement("li");
            const button = document.createElement("button");
            const label = document.createElement("span");
            const details = document.createElement("span");

            row.className = "knowledge-search-result";
            button.type = "button";
            button.className = "knowledge-search-result-button";
            button.setAttribute("role", "option");
            button.setAttribute("aria-selected", String(index === activeIndex));

            label.className = "knowledge-search-result-title";
            if (item.titleHtml) {
                label.innerHTML = item.titleHtml;
            } else {
                label.textContent = item.title;
            }

            details.className = "knowledge-search-result-detail";
            details.textContent = `${formatType(item.type)} · ${item.id}`;

            button.append(label, details);
            button.addEventListener("click", function () {
                activeIndex = index;
                openActiveResult();
            });

            row.append(button);
            list.append(row);
        });
    }

    function updateResults(query) {
        const queryWords = words(query);

        results = items
            .map(function (item) {
                return { item, score: scoreItem(item, queryWords) };
            })
            .filter(function (entry) {
                return entry.score >= 0;
            })
            .sort(function (a, b) {
                return b.score - a.score || a.item.title.localeCompare(b.item.title);
            })
            .slice(0, maxResults)
            .map(function (entry) {
                return entry.item;
            });

        activeIndex = 0;
        renderResults();
    }

    function moveActive(delta) {
        if (results.length === 0) {
            return;
        }

        activeIndex = (activeIndex + delta + results.length) % results.length;
        renderResults();
        const active = list.querySelector('[aria-selected="true"]');
        if (active) {
            active.scrollIntoView({ block: "nearest" });
        }
    }

    function openActiveResult() {
        const item = results[activeIndex];
        if (!item) {
            return;
        }

        window.location.href = item.href;
    }

    function openSearch() {
        ensureUi();
        loadIndex().then(function () {
            root.hidden = false;
            input.value = "";
            updateResults("");
            input.focus();
        }).catch(function (error) {
            console.error(error);
        });
    }

    function closeSearch() {
        if (!root) {
            return;
        }

        root.hidden = true;
    }

    function isEditableTarget(target) {
        return target && (
            target.isContentEditable ||
            target.matches("input, textarea, select")
        );
    }

    document.addEventListener("keydown", function (event) {
        if (event.key !== " " || !event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
            return;
        }

        if (isEditableTarget(event.target)) {
            return;
        }

        event.preventDefault();
        if (root && !root.hidden) {
            closeSearch();
        } else {
            openSearch();
        }
    });
})();
