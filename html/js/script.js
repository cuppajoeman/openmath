// keeping track of dynamically loaded elements since they cannot be gotten through the dom e.g.) getElementById
// emojis I can use: 🚀 📋 🖋️
var colorModeButton;

const websiteDomain = "https://www.openmath.net";
const copyLinkEmoji = "📋";

const debugging = false;

let statementWithProofTemplate;


async function fetchElement(url) {
    const data = await fetch(url).then(res => res.text())
    return new DOMParser().parseFromString(data, 'text/html')
}
async function fetchElementUsingSelector(url, selector) {
    const parsed = await fetchElement(url);
    return parsed.querySelector(selector)
}


// TODO was about to programatically add the button to the page and add another "reset" button that has the computer emoji

document.addEventListener('DOMContentLoaded', preparePage, false);

async function preparePage() {
	// Due to this function you must defer this script so that the mathjax is loaded after everything is added to the dom
    await setUpAndAddHeader();
    await setUpStatementWithProofTemplates();
    setUpProofToggleButtons();
	addLinksToEveryPieceOfKnowledge();
    setUpKnowledgeLinks();
    createSystemColorModeListener();
    checkForSavedColorMode();
    setCustomCursor();
    automaticallyAddMathJaxScript();
    automaticallyAddIcon();
}

function automaticallyAddIcon() {
    let iconTag = document.createElement('link');
    iconTag.rel = "icon";
    iconTag.href = "/Theta.svg";
    document.head.appendChild(iconTag);
}

function automaticallyAddMathJaxScript() {

    let mathJaxTag = document.createElement('script');
    mathJaxTag.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
    mathJaxTag.defer = true;
    document.head.appendChild(mathJaxTag);

    // let asciimathTag = document.createElement('script');
    // asciimathTag.src = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/latest.js?config=AM_CHTML";
    // asciimathTag.defer = true;
    // document.head.appendChild(asciimathTag);
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

	createCurrentPathNavigation();
}

async function setUpStatementWithProofTemplates() {
    statementWithProofTemplate = (await fetchElement("/includes/statement_with_proof.html")).body.firstChild;

    const typesOfStatementsRequiringProof = ["theorem", "proposition", "lemma", "corollary", "exercise"];

    for (let i = 0; i < typesOfStatementsRequiringProof.length; i++) {
        let typeOfStatementRequiringProof = typesOfStatementsRequiringProof[i];
        let statementsWithProof = document.getElementsByClassName(typeOfStatementRequiringProof);
        for (let j = 0; j < statementsWithProof.length; j++) {
            let statementWithProof = statementsWithProof[j];
            await replaceStatementWithProofFromTemplate(statementWithProof,typeOfStatementRequiringProof);
        }

    }

    // const statementWithProofTemplate = await fetchElement("../includes/statement_with_proof.html")
}

async function replaceStatementWithProofFromTemplate(statementWithProof, typeOfStatementRequiringProof) {

    let titleElement = statementWithProof.querySelector(".title");
    let contentElement = statementWithProof.querySelector(".content");
    let proofElement = statementWithProof.querySelector(".proof");


    let statementWithProofTemplateCopy = statementWithProofTemplate.cloneNode(true);

    statementWithProofTemplateCopy.classList.add(typeOfStatementRequiringProof);

    let templateTitleElement = statementWithProofTemplateCopy.querySelector(".title");
    let templateContentElement = statementWithProofTemplateCopy.querySelector(".content");
    let templateProofElement = statementWithProofTemplateCopy.querySelector(".new-proof");
    let templateProofContentElement = templateProofElement.querySelector(".content");

    if (proofElement === null) {
        console.log(statementWithProof, "is missing a proof");
    }

    templateTitleElement.innerHTML = titleElement.innerHTML;
    templateContentElement.innerHTML = contentElement.innerHTML;
    templateProofContentElement.innerHTML = proofElement.innerHTML;

    statementWithProofTemplateCopy.id = statementWithProof.id;

    statementWithProof.replaceWith(statementWithProofTemplateCopy);

    return statementWithProofTemplateCopy
}


function setUpProofToggleButtons() {
    /*
    description:
        this function makes sure that the show/hide proof button works correctly for each proof

    note:
        in the past proofs were in a seperate box which was disjoint from the statement, we are migrating this so that
        proofs are included in the same box, therefore the usage of the class new-proof, is to help ease the migration
        while not breaking pre-existing proofs.
     */
    const proofs = document.getElementsByClassName("new-proof");
    for (let i = 0; i < proofs.length; i++) {
        let proof = proofs[i];
        setUpProofToggleButton(proof);
    }
}

function setUpProofToggleButton(proof) {
    let toggleButton = proof.querySelector(".line-with-centered-text>button");
    let content = proof.querySelector(".content");
    content.style.display = "none"; // initially hide the content
    let contentHidden = content.style.display === "none";
    toggleButton.onclick = function () {
        if (contentHidden)  {
            content.style.display = "block";
            toggleButton.textContent = "hide proof"
        } else {
            content.style.display = "none";
            toggleButton.textContent = "show proof"
        }
        contentHidden = !contentHidden;
    }
}



function createCurrentPathNavigation() {

	var pathDelimiter = "/";

	var path = window.location.pathname;

	const currentPathElement = document.getElementById("current-path");

	var slashIncludedInString = path.lastIndexOf("/") != -1

	while (slashIncludedInString) {
	  const indexOfLastSlashInString = path.lastIndexOf("/");

	  var endOfPath = path.substring(indexOfLastSlashInString + 1);


	  if (path == "") {
		var a_element = createATag("~", "/");

		currentPathElement.prepend(a_element);
	  } else {
		var a_element = createATag(endOfPath, path);
	  
		currentPathElement.prepend(a_element);
		currentPathElement.prepend(document.createTextNode(pathDelimiter))
	  }

	  slashIncludedInString = path.lastIndexOf("/") != -1

	  path = path.substring(0, indexOfLastSlashInString)
	}

}

function createATag(content, link) {
   var a = document.createElement('a');
    var linkText = document.createTextNode(content);
    a.appendChild(linkText);
    a.href = link;
    return a;
}


function addLinksToEveryPieceOfKnowledge() {
	const definitions = document.getElementsByClassName("definition")
	let currentHtmlFilePath = window.location.pathname;

	// TODO one day merge into one for loop when definitions have the same structure as swp
    for (let i = 0; i < definitions.length; i++) {
		let definition = definitions[i];

		let title = definition.querySelector(".title");
		let linkToSelf = document.createElement("a");
		linkToSelf.style.cssFloat ='right';
		linkToSelf.textContent = copyLinkEmoji;
		linkToSelf.href = currentHtmlFilePath + "#" + definition.id;
		linkToSelf.onclick = copyURI;
		linkToSelf.title = "copy link";
		title.append(linkToSelf);
	}

	let statementsWithProof = document.querySelectorAll(".theorem,.lemma,.corollary,.proposition,.exercise");

    for (let i = 0; i <statementsWithProof.length; i++) {

		let statementWithProof = statementsWithProof[i];

		let wrapper = statementWithProof.parentElement;

		let title = statementWithProof.querySelector(".title");
		let linkToSelf = document.createElement("a");
		linkToSelf.style.cssFloat ='right';
		linkToSelf.textContent = copyLinkEmoji;
		linkToSelf.onclick = copyURI;
		linkToSelf.href = currentHtmlFilePath + "#" + wrapper.id;
		title.append(linkToSelf);
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

    let fullDestinationUrl;
    if (knowledgeLinkElement.nodeName === "SPAN") { // old span syntax, moving to the new a tag syntax
        fullDestinationUrl = knowledgeLinkElement.dataset.href;
    } else if (knowledgeLinkElement.nodeName === "A") {
        fullDestinationUrl = knowledgeLinkElement.href;
    }

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

            const typeOfStatement = destinationElement.classList[0];

            console.assert(typeOfStatement !== null , destinationElement, "is missing a the type class");

            //knowledgeLinkElement.appendChild(destinationElement)
            knowledgeLinkElement.after(destinationElement)

            if (typeOfStatement !== "definition") {
                destinationElement = await replaceStatementWithProofFromTemplate(destinationElement, typeOfStatement)
                const destinationElementProof = destinationElement.querySelector(".new-proof");
                setUpProofToggleButton(destinationElementProof);
            }

            destinationElement.classList.add("expanded-knowledge");

			const destinationTitle = destinationElement.querySelector(".title")

			// add link for newly created element
			let linkToSelf = document.createElement("a");
			linkToSelf.style.cssFloat ='right';
			linkToSelf.textContent = copyLinkEmoji;
			linkToSelf.href = fullDestinationUrl;
			linkToSelf.onclick = copyURI;
			destinationTitle.append(linkToSelf);

            typesetNewMathJax();
            // Now set up and knowledge links that this one has

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

function typesetNewMathJax() {
        console.assert(typeof MathJax !== 'undefined', "You need to load MathJax before you set up knowledge links")
        MathJax.Hub.Typeset() 
}

function elementIsMathJax(element) {
	for (var i = 0; i < element.classList.length; i++) {
		var className = element.classList[i];
		if (className.includes("mjx")) {
			return true;
		}
	}
	return false;
}

function setCustomCursor() {
    // addRotatedText(context, "†");
    const normalDaggerCanvas = createRotatedDagger("black", "white");
    const normalCursorUrl = "url('" + normalDaggerCanvas.toDataURL() + "'), auto";

    const activatedDaggerCanvas = createRotatedDagger("white", "black");
    const activatedCursorUrl = "url('" + activatedDaggerCanvas.toDataURL() + "'), auto";

    var styles = `
    body {
        cursor: ${normalCursorUrl} 
    }
    
    a, label, .knowledge-link, #reset-darkmode, button { 
        cursor: ${activatedCursorUrl}
    }
    `

    const styleSheet = document.createElement("style")
    styleSheet.innerText = styles
    document.head.appendChild(styleSheet)

    document.body.style.cursor = "url('" + normalDaggerCanvas.toDataURL() + "'), auto"; // important so that it overrides everything
}

function createRotatedDagger(fillStyle, strokeStyle) {

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
    context.strokeStyle = strokeStyle;
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

function copyURI(evt) {
	// requires the target to have an href, eg put this on a tags
    evt.preventDefault();
    navigator.clipboard.writeText(websiteDomain + evt.target.getAttribute('href'));
}
