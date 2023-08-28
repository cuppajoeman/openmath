// keeping track of dynamically loaded elements since they cannot be gotten through the dom e.g.) getElementById
var colorModeButton;
const debugging = false;

async function fetchElement(url, selector) {
    const data = await fetch(url).then(res => res.text())
    const parsed = new DOMParser().parseFromString(data, 'text/html')
    return parsed.querySelector(selector)
}

// TODO was about to programatically add the button to the page and add another "reset" button that has the computer emoji

document.addEventListener('DOMContentLoaded', preparePage, false);

async function preparePage() {
    await setUpAndAddHeader();
    setUpKnowledgeLinks();
    createSystemColorModeListener();
    checkForSavedColorMode();
    setCustomCursor();
}

async function setUpAndAddHeader() {
    const data = await fetch("/includes/header.html").then(res => res.text())
    const header = document.createElement("div")
    header.innerHTML = data

    document.body.prepend(header)

    colorModeButton = header.querySelector("#toggle-darkmode");

    colorModeButton.onclick = function(event) {
        setColorMode(event.target.checked ? 'dark' : 'light');
    }

    header.querySelector('#reset-darkmode').onclick = function(event) {
        // event.preventDefault();
        setColorMode(false);
    }
}


function createSystemColorModeListener() {
    // Keep an eye out for System Light/Dark Mode Changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addListener(() => { // TODO fix addListner as it's depricated
        // Ignore change if there's an override set
        if (document.documentElement.getAttribute('data-force-color-mode')) {
            return;
        }

        // Make sure the checkbox is up-to-date
        colorModeButton.checked = mediaQuery.matches;
    });
}

function checkForSavedColorMode() { 
    // must happen after header created

    // Check if there's any override. If so, let the markup know by setting an attribute on the <html> element
    const colorModeOverride = window.localStorage.getItem('color-mode');
    const hasColorModeOverride = typeof colorModeOverride === 'string';
    if (hasColorModeOverride) {
        document.documentElement.setAttribute('data-force-color-mode', colorModeOverride);
    }

    // Check the dark-mode checkbox if
    // - The override is set to dark
    // - No override is set but the system prefers dark mode
    if ((colorModeOverride == 'dark') || (!hasColorModeOverride && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        colorModeButton.checked = true;
    }
}

function setUpColorModeButton(colorModeButton) {
}


function setColorMode(mode) {
    // must happen after we set up the color mode button

    // mode is either a string representing the new mode to be set or false indicating a reset.
    // Mode was given
	if (mode) {
		// Update data-* attr on html
		document.documentElement.setAttribute('data-force-color-mode', mode);
		// Persist in local storage
		window.localStorage.setItem('color-mode', mode);
		// Make sure the checkbox is up-to-date
		document.querySelector('#toggle-darkmode').checked = (mode === 'dark');
	}
	
	// No mode given (e.g. reset)
	else {
		// Remove data-* attr from html
		document.documentElement.removeAttribute('data-force-color-mode');
		// Remove entry from local storage
		window.localStorage.removeItem('color-mode');
		// Make sure the checkbox is up-to-date, matching the system preferences
		colorModeButton.checked = window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

}



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

    console.assert(splitUrl.length == 2, splitUrl);

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

        const firstTimeOpening = knowledgeLinkElement.dataset.openedAtLeastOnce == "false" && knowledgeLinkElement.dataset.currentlyOpened == "false"; // strings used since data-* attributes only pass through as string
        if (firstTimeOpening) { // create the element
            const destinationElement = await fetchElement(destinationURL, destinationId);
            knowledgeLinkElement.appendChild(destinationElement)
            destinationElement.classList.add("expanded-knowledge");

            typesetNewMathJax();
            // Now set up and knowledge links that this one has

            const destinationKnowledgeLinks = destinationElement.querySelectorAll(".knowledge-link") // query selector since this is an element

            for (let i = 0; i < destinationKnowledgeLinks.length; i++) {
                const destinationKnowledgeLink = destinationKnowledgeLinks[i]
                setUpKnowledgeLink(destinationKnowledgeLink);
            }

        } else { // after created just toggle visibility
            console.assert(knowledgeLinkElement.querySelector(".expanded-knowledge") != null, "the expanded knowledge should have already been added");
            const expandedKnowledgeElement = knowledgeLinkElement.querySelector(".expanded-knowledge")
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

function typesetNewMathJax() {
        console.assert(typeof MathJax !== 'undefined', "You need to load MathJax before you set up knowledge links")
        MathJax.Hub.Typeset() 
}

function setCustomCursor() {
    // addRotatedText(context, "†");
    const normalDaggerCanvas = createRotatedDagger("black");
    const normalCursorUrl = "url('" + normalDaggerCanvas.toDataURL() + "'), auto";

    const activatedDaggerCanvas = createRotatedDagger("purple");
    const activatedCursorUrl = "url('" + activatedDaggerCanvas.toDataURL() + "'), auto";

    var styles = `
    body {
        cursor: ${normalCursorUrl} 
    }
    
    a, label, .knowledge-link, #reset-darkmode  { 
        cursor: ${activatedCursorUrl}
    }
    `

    const styleSheet = document.createElement("style")
    styleSheet.innerText = styles
    document.head.appendChild(styleSheet)

    document.body.style.cursor = "url('" + normalDaggerCanvas.toDataURL() + "'), auto"; // important so that it overrides everything
}

function createRotatedDagger(fillStyle) {

    const canvas = document.createElement("canvas")
    // these values are not specific, they were tweaked by hand so the cursor fits
    const fontSizePx = 60;
    const rotationAngle = Math.PI/2 + Math.PI/4;
    const sideLength = fontSizePx * Math.sin(rotationAngle)
    // contained in a fitting square
    // note: (it always fits the square meaning the dagger is less than 60 px high)
    canvas.width = sideLength;
    canvas.height = sideLength;

    const context = canvas.getContext("2d")
    if (debugging) {
        context.strokeRect(0, 0, canvas.width, canvas.height); // outline the canvas
    }
    const text = "†"
    const tipOverflowPx = fontSizePx/6; // the dagger pokes through the baseline by a percent of it's height
    context.font = `${fontSizePx}px 'sans serif'`;
    context.fillStyle = fillStyle;
    context.strokeStyle = 'white'
    context.lineWidth = 1;
    context.save();
    if (debugging) {
        markOrigin(context); //for debugging
    }
    context.rotate(rotationAngle);
    // Here we make sure the dagger is drawn so that the tip lands at the origin.
    context.textAlign = "center"; // lines up on x axis
    context.fillText(text, 0, -tipOverflowPx); // lines up on y
    context.strokeText(text, 0, -tipOverflowPx);
    context.restore();

    return canvas;
}

function markOrigin(context) {

    context.arc(0, 0, 5, 0, 2 * Math.PI);
    context.fillStyle = "blue";
    context.fill();
}