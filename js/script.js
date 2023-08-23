async function fetchElement(url, selector) {
    const data = await fetch(url).then(res => res.text())
    const parsed = new DOMParser().parseFromString(data, 'text/html')
    return parsed.querySelector(selector)
}

document.addEventListener('DOMContentLoaded', setUpKnowledgeLinks, false);

function setUpKnowledgeLinks() {
    const collection = document.getElementsByClassName("knowledge-link");
    for (let i = 0; i < collection.length; i++) {
        const knowledgeLinkElement = collection[i]
        setUpKnowledgeLink(knowledgeLinkElement);
    }
}

function setUpKnowledgeLink(knowledgeLinkElement) {

    knowledgeLinkElement.dataset.openedAtLeastOnce = false;
    knowledgeLinkElement.dataset.currentlyOpened = false;

    const fullDestinationUrl = knowledgeLinkElement.dataset.href
    const splitUrl = fullDestinationUrl.split("#") // also removes the #

    console.assert(splitUrl.length == 2)

    var destinationURL = splitUrl[0]
    const destinationId = "#"+ splitUrl[1] // add it back on

    if (destinationURL == "") {
        var path = window.location.pathname;
        var page = path.split("/").pop();
        destinationURL = page;
    }

    console.assert(destinationURL != "")

    knowledgeLinkElement.onclick = async function(event) {

        if (event.target !== event.currentTarget) return; // Since we add recursive children make sure we're not clicking on parents

        console.log(event)
        const firstTimeOpening = knowledgeLinkElement.dataset.openedAtLeastOnce == "false" && knowledgeLinkElement.dataset.currentlyOpened == "false"; // strings used since data-* attributes only pass through as string
        if (firstTimeOpening) { // create the element
            const destinationElement = await fetchElement(destinationURL, destinationId);
            knowledgeLinkElement.appendChild(destinationElement)

            console.assert(typeof MathJax !== 'undefined', "You need to load MathJax before you set up knowledge links")
            MathJax.Hub.Typeset() 

            // Now set up and knowledge links that this one has

            const destinationKnowledgeLinks = destinationElement.querySelectorAll(".knowledge-link") // query selector since this is an element

            for (let i = 0; i < destinationKnowledgeLinks.length; i++) {
                const destinationKnowledgeLink = destinationKnowledgeLinks[i]
                setUpKnowledgeLink(destinationKnowledgeLink);
            }

        } else { // after created just toggle visibility
            console.assert(knowledgeLinkElement.firstElementChild != null, "a knowledge link only ever has one child, though they may be nested")
            const expandedKnowledgeElement = knowledgeLinkElement.firstElementChild;
            if (knowledgeLinkElement.dataset.currentlyOpened == "true") {
                expandedKnowledgeElement.style.display = "none";
            } else {
                expandedKnowledgeElement.style.display = "block";
            }
        }
        knowledgeLinkElement.dataset.currentlyOpened = knowledgeLinkElement.dataset.currentlyOpened == "true" ? "false" : "true";
        knowledgeLinkElement.dataset.openedAtLeastOnce = true;
    }
}