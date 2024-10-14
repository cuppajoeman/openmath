document.addEventListener('DOMContentLoaded', preparePage, false);

async function preparePage() {
    setUpKnowledgeLinks();
}


async function fetchElement(url) {
    const data = await fetch(url).then(res => res.text())
    return new DOMParser().parseFromString(data, 'text/html')
}
async function fetchElementUsingSelector(url, selector) {
    const parsed = await fetchElement(url);
    return parsed.querySelector(selector)
}


function setUpKnowledgeLinks() {
    // Select all <a> tags inside <math> tags
    // these are created from \href{...}{math} inside of latex code
    const mathLinks = document.querySelectorAll('math a');

    // Select all elements with the class "knowledge-link"
    const collection = document.getElementsByClassName("knowledge-link");

    // Convert both NodeList (from querySelectorAll) and HTMLCollection (from getElementsByClassName) to arrays
    const mathLinksArray = Array.from(mathLinks);
    const collectionArray = Array.from(collection);

    // Combine the two arrays
    const all_links = mathLinksArray.concat(collectionArray);
    for (let i = 0; i < all_links.length; i++) {
        const knowledgeLinkElement = all_links[i]
        setUpKnowledgeLink(knowledgeLinkElement);
    }
}

function setUpKnowledgeLink(knowledgeLinkElement) {

    knowledgeLinkElement.dataset.openedAtLeastOnce = false;
    knowledgeLinkElement.dataset.currentlyOpened = false;

    fullDestinationUrl = knowledgeLinkElement.href;

    const splitUrl = fullDestinationUrl.split("#") // also removes the #

    console.assert(splitUrl.length == 2, splitUrl);

    var destinationURL = splitUrl[0]
    const destinationId = "#"+ splitUrl[1] // add it back on

    if (destinationURL == "") {
        let path = window.location.pathname;
        let page = path.split("/").pop();
        destinationURL = page;
    }

    console.assert(destinationURL != "")

    knowledgeLinkElement.onclick = async function(event) {

        event.preventDefault(); // make sure we don't travel to the link

        const firstTimeOpening = knowledgeLinkElement.dataset.openedAtLeastOnce == "false" && knowledgeLinkElement.dataset.currentlyOpened == "false"; // strings used since data-* attributes only pass through as string
        if (firstTimeOpening) { // create the element
            let destinationElement = await fetchElementUsingSelector(destinationURL, destinationId);

            //knowledgeLinkElement.appendChild(destinationElement)
            knowledgeLinkElement.after(destinationElement)

            destinationElement.classList.add("expanded-knowledge");

	    const destinationTitle = destinationElement.querySelector(".title")

            const destinationKnowledgeLinks = destinationElement.querySelectorAll(".knowledge-link") // query selector since this is an element

            for (let i = 0; i < destinationKnowledgeLinks.length; i++) {
                const destinationKnowledgeLink = destinationKnowledgeLinks[i]
                setUpKnowledgeLink(destinationKnowledgeLink);
            }


        } else { // after created just toggle visibility
            console.assert(knowledgeLinkElement.nextSibling.classList.contains("expanded-knowledge") , "the expanded knowledge should have already been added as a sibiling");
            const expandedKnowledgeElement = knowledgeLinkElement.nextSibling
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
