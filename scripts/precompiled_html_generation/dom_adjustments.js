const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Function to recursively process and copy files
function compileAndCopy(sourceDir, outputDir) {
  fs.readdir(sourceDir, { withFileTypes: true }, (err, items) => {
    if (err) throw err;

    items.forEach(item => {
      const sourcePath = path.join(sourceDir, item.name);
      const outputPath = path.join(outputDir, item.name);

      if (item.isDirectory()) {
        // Create the corresponding directory in the output directory
        fs.mkdir(outputPath, { recursive: true }, err => {
          if (err) throw err;
          // Recursively process the directory
          compileAndCopy(sourcePath, outputPath);
        });
      } else if (item.isFile()) {
        if (path.extname(item.name) === '.html') {
          // Read and process the HTML file
          fs.readFile(sourcePath, 'utf8', (err, data) => {
            if (err) throw err;

            // Load the HTML content into jsdom
            const dom = new JSDOM(data);
            const document = dom.window.document;

            // Example JavaScript function to manipulate the DOM
            const buttons = document.querySelectorAll('button');
            buttons.forEach(button => {
              button.style.backgroundColor = 'red'; // Example modification
            });

            const elements = document.querySelectorAll('.some-class');
            elements.forEach(el => {
              el.textContent = 'Modified Content'; // Example modification
            });

            // Extract the modified HTML content from the document
            const modifiedHTML = document.documentElement.outerHTML;

            // Write the modified HTML back to the output directory
            fs.writeFile(outputPath, modifiedHTML, err => {
              if (err) throw err;
              console.log(`Compiled ${sourcePath} and saved to ${outputPath}`);
            });
          });
        } else {
          // Copy non-HTML files to the output directory
          fs.copyFile(sourcePath, outputPath, err => {
            if (err) throw err;
            console.log(`Copied ${sourcePath} to ${outputPath}`);
          });
        }
      }
    });
  });
}

// Specify your source and output directories
const sourceDir = '../../generated';
const outputDir = '../../dom_adjusted';

// Create the output directory if it doesn't exist
fs.mkdir(outputDir, { recursive: true }, err => {
  if (err) throw err;
  // Start the compilation process
  compileAndCopy(sourceDir, outputDir);
});

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


async function preparePage(dom) {
	// Due to this function you must defer this script so that the mathjax is loaded after everything is added to the dom
    // await setUpAndAddHeader(dom);
    //await setUpStatementWithProofTemplates(dom);
    // automaticallyAddMathJaxScript(dom);
    setUpProofToggleButtons(dom);
    addLinksToEveryPieceOfKnowledge(dom);
    // typesetNewMathJax();
    setUpKnowledgeLinks(dom);
    // createSystemColorModeListener(dom);
    // checkForSavedColorMode(dom);
    // setCustomCursor(); temporarily disalbe custom cursor
    automaticallyAddIcon(dom);
    //configureEditPageButton(dom);
}


function configureEditPageButton(dom) {
    var edit_page_button = dom.window.document.getElementById("edit-page-button")
    let currentHtmlFilePath = dom.window.location.pathname;
    edit_page_button.onclick = function() {
	// dom.window.document.location.href = "/live_html_editor/editor.html"
	location.href = "/live_html_editor/editor.html?page=" + currentHtmlFilePath
    }
}

function automaticallyAddIcon(dom) {
    let iconTag = dom.window.document.createElement('link');
    iconTag.rel = "icon";
    iconTag.href = "/Theta.svg";
    dom.window.document.head.appendChild(iconTag);
}

function automaticallyAddMathJaxScript(dom) {

    let mathJaxTag = dom.window.document.createElement('script');
    mathJaxTag.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
    mathJaxTag.defer = true;
    dom.window.document.head.appendChild(mathJaxTag);

    // let asciimathTag = dom.window.document.createElement('script');
    // asciimathTag.src = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/latest.js?config=AM_CHTML";
    // asciimathTag.defer = true;
    // dom.window.document.head.appendChild(asciimathTag);
}

async function setUpAndAddHeader(dom) {
    const data = await fetch("../../html/includes/header.html").then(res => res.text())
    const header = dom.window.document.createElement("div")
    header.innerHTML = data

    dom.window.document.body.prepend(header)

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

async function setUpStatementWithProofTemplates(dom) {
    statementWithProofTemplate = (await fetchElement("../../html/includes/statement_with_proof.html")).body.firstChild;

    const typesOfStatementsRequiringProof = ["theorem", "proposition", "lemma", "corollary", "exercise"];

    for (let i = 0; i < typesOfStatementsRequiringProof.length; i++) {
        let typeOfStatementRequiringProof = typesOfStatementsRequiringProof[i];
        let statementsWithProof = dom.window.document.getElementsByClassName(typeOfStatementRequiringProof);
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


function setUpProofToggleButtons(dom) {
    /*
    description:
        this function makes sure that the show/hide proof button works correctly for each proof

    note:
        in the past proofs were in a seperate box which was disjoint from the statement, we are migrating this so that
        proofs are included in the same box, therefore the usage of the class new-proof, is to help ease the migration
        while not breaking pre-existing proofs.
     */
    const proofs = dom.window.document.getElementsByClassName("new-proof");
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

	var path = dom.window.location.pathname;

	const currentPathElement = dom.window.document.getElementById("current-path");

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
		currentPathElement.prepend(dom.window.document.createTextNode(pathDelimiter))
	  }

	  slashIncludedInString = path.lastIndexOf("/") != -1

	  path = path.substring(0, indexOfLastSlashInString)
	}

}

function createATag(content, link) {
   var a = dom.window.document.createElement('a');
    var linkText = dom.window.document.createTextNode(content);
    a.appendChild(linkText);
    a.href = link;
    return a;
}


function addLinksToEveryPieceOfKnowledge(dom) {
	const definitions = dom.window.document.getElementsByClassName("definition")
	let currentHtmlFilePath = dom.window.location.pathname;

	// TODO one day merge into one for loop when definitions have the same structure as swp
    for (let i = 0; i < definitions.length; i++) {
		let definition = definitions[i];

		let title = definition.querySelector(".title");
		let linkToSelf = dom.window.document.createElement("a");
		linkToSelf.style.cssFloat ='right';
		linkToSelf.textContent = copyLinkEmoji;
		linkToSelf.href = currentHtmlFilePath + "#" + definition.id;
		linkToSelf.onclick = copyURI;
		linkToSelf.title = "copy link";
		title.append(linkToSelf);
	}

	let statementsWithProof = dom.window.document.querySelectorAll(".theorem,.lemma,.corollary,.proposition,.exercise");

    for (let i = 0; i <statementsWithProof.length; i++) {

		let statementWithProof = statementsWithProof[i];

		let title = statementWithProof.querySelector(".title");
		let linkToSelf = dom.window.document.createElement("a");
		linkToSelf.style.cssFloat ='right';
		linkToSelf.textContent = copyLinkEmoji;
		linkToSelf.onclick = copyURI;
		linkToSelf.href = currentHtmlFilePath + "#" + statementWithProof.id;
		title.append(linkToSelf);
	}

}


function createSystemColorModeListener(dom) {
    // Keep an eye out for System Light/Dark Mode Changes
    const mediaQuery = dom.window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addListener(() => { // TODO fix addListner as it's depricated
        // Ignore change if there's an override set
        if (dom.window.document.dom.window.documentElement.getAttribute('data-force-color-mode')) {
            return;
        }

        // Make sure the checkbox is up-to-date
        colorModeButton.checked = mediaQuery.matches;
    });
}

function checkForSavedColorMode(dom) { 
    // must happen after header created

    // Check if there's any override. If so, let the markup know by setting an attribute on the <html> element
    const colorModeOverride = dom.window.localStorage.getItem('color-mode');
    const hasColorModeOverride = typeof colorModeOverride === 'string';
    if (hasColorModeOverride) {
        dom.window.document.dom.window.documentElement.setAttribute('data-force-color-mode', colorModeOverride);
    }

    // Check the dark-mode checkbox if
    // - The override is set to dark
    // - No override is set but the system prefers dark mode
    if ((colorModeOverride == 'dark') || (!hasColorModeOverride && dom.window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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
		dom.window.document.dom.window.documentElement.setAttribute('data-force-color-mode', mode);
		// Persist in local storage
		dom.window.localStorage.setItem('color-mode', mode);
		// Make sure the checkbox is up-to-date
		dom.window.document.querySelector('#toggle-darkmode').checked = (mode === 'dark');
	}
	
	// No mode given (e.g. reset)
	else {
		// Remove data-* attr from html
		dom.window.document.dom.window.documentElement.removeAttribute('data-force-color-mode');
		// Remove entry from local storage
		dom.window.localStorage.removeItem('color-mode');
		// Make sure the checkbox is up-to-date, matching the system preferences
		colorModeButton.checked = dom.window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

}



function setUpKnowledgeLinks(dom) {
    // Select all <a> tags inside <math> tags
    // these are created from \href{...}{math} inside of latex code
    const mathLinks = dom.window.document.querySelectorAll('math a');

    // Select all elements with the class "knowledge-link"
    const collection = dom.window.document.getElementsByClassName("knowledge-link");

    // Convert both NodeList (from querySelectorAll) and HTMLCollection (from getElementsByClassName) to arrays
    const mathLinksArray = Array.from(mathLinks);
    const collectionArray = Array.from(collection);

    // Combine the two arrays
    const all_links = mathLinksArray.concat(collectionArray);
    for (let i = 0; i < all_links.length; i++) {
        const knowledgeLinkElement = all_links[i]
        setUpKnowledgeLink(dom, knowledgeLinkElement);
    }
}

function setUpKnowledgeLink(dom, knowledgeLinkElement) {

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
        let path = dom.window.location.pathname;
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
	    let linkToSelf = dom.window.document.createElement("a");
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
                setUpKnowledgeLink(dom, destinationKnowledgeLink);
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
        MathJax.typeset() 
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

    const styleSheet = dom.window.document.createElement("style")
    styleSheet.innerText = styles
    dom.window.document.head.appendChild(styleSheet)

    dom.window.document.body.style.cursor = "url('" + normalDaggerCanvas.toDataURL() + "'), auto"; // important so that it overrides everything
}

function createRotatedDagger(fillStyle, strokeStyle) {

    const canvas = dom.window.document.createElement("canvas")
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
