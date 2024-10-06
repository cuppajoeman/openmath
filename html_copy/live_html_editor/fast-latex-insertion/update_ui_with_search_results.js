var mathjax_latex_to_code = {
    // formattting
    "black board bold": {"renderable": false, latex: "\\mathbb{ }"}, 
    "frak": {"renderable": false, latex: "\\mathfrak{ }"}, 
    "caligraphic": {"renderable": false, latex: "\\mathcal{ }"}, 
    "subscript": {"renderable": false, latex: "_{ }"}, 
    "superscript": {"renderable": false, latex: "^{ }"}, 
    "subperscript": {"renderable": false, latex: "_{ }^{ }"}, 
    "overline": {"renderable": false, latex: "\\overline{ }"}, 
    "underline": {"renderable": false, latex: "\\underline{ }"}, 
    "bar": {"renderable": false, latex: "\\overline{ }"}, 
    "operator name": {"renderable": false, latex: "\\operatorname{ }"}, 
    "text": {"renderable": false, latex: "\\text{ }"}, 

    // common sets
    "natural numbers starting from one": {renderable: true, latex:"\\mathbb{N}_1"}, 
    "natural numbers starting from zero": {renderable: true, latex:"\\mathbb{N}_0"}, 
    "integers": {renderable: true, latex:"\\mathbb{Z}"}, 
    "reals": {renderable: true, latex:"\\mathbb{R}"}, 
    "rationals": {renderable: true, latex:"\\mathbb{Q}"}, 
    "complex numbers": {renderable: true, latex:"\\mathbb{C}"}, 

    // operators
    "summation": {renderable: true, latex: "\\sum"},
    "product": {renderable: true, latex: "\\prod"},
    "fraction": {renderable: false, latex: "\\frac{ }{ }"},
    "limit": {renderable: true, latex: "\\lim"},
    "congruent": {renderable: true, latex: "\\cong"},
    "similar": {renderable: true, latex: "\\sim"},

    // logic
    "exists": {renderable: true, latex: "\\exists"},
    "forall": {renderable: true, latex: "\\forall"},
    "iff": {renderable: true, latex: "\\iff"},
    "negation": {renderable: true, latex: "\\neg"},
    "logical or": {renderable: true, latex: "\\lor"},
    "logical and": {renderable: true, latex: "\\land"},
    
    // brackets
    "curly brackets": {renderable: true, latex: "\\left\\{ \\right\\}"},
    "round brackets": {renderable: true, latex: "\\left\\( \\right\\)"},
    "square brackets": {renderable: true, latex: "\\left\\[ \\right\\]"},
    // "floor": {renderable: true, latex: "\\left\\lfloor \\right\\rfloor"},
    // "ceil": {renderable: true, latex: "\\left\\lceil \\right\\rceil"},

    // sets
    "element of": {renderable: true, latex: "\\in"},
    "not element of": {renderable: true, latex: "\\notin"},
    "intersection": {renderable: true, latex: "\\cap"},
    "union": {renderable: true, latex: "\\cup"},
    "set minus": {renderable: true, latex: "\\setminus"},

    // small symbols
    "thin arrow (right)": {renderable: true, latex: "\\to"},
    "function maps to": {renderable: true, latex: "\\mapsto"},
    "subset": {renderable: true, latex: "\\subseteq"},
    "superset": {renderable: true, latex: "\\supseteq"},
    "less than or equal to": {renderable: true, latex: "\\leq"},
    "greater than or equal to": {renderable: true, latex: "\\geq"},
    "star": {renderable: true, latex: "\\star"},
    "circle": {renderable: true, latex: "\\circ"},
    "empty set": {renderable: true, latex: "\\emptyset"},
    "vertical bar": {renderable: true, latex: "\\mid"},


    // greek symbols
    "alpha": {renderable: true, latex: "\\alpha"},
    "beta": {renderable: true, latex: "\\beta"},
    "gamma": {renderable: true, latex: "\\gamma"},
    "delta": {renderable: true, latex: "\\delta"},
    "epsilon": {renderable: true, latex: "\\epsilon"},

    // environments
    "align* environment": {renderable: false, latex: "\\begin{align*}\n\\end{align*}"},
    "gather environment": {renderable: false, latex: "\\begin{gather*}\n\\end{gather*}"},
}

// precondition: 
// all the id's searched for in the following function exist in your html
// fuzzysort.js script has already been included
// mathjax must be included (and loaded) as well
function update_ui_with_search_results(content) {

    var searchResults = document.getElementById("search_results")
    searchResults.innerHTML = ''; // Reset the search
    var ul = document.createElement('ul');
    searchResults.appendChild(ul);
    const results = fuzzysort.go(content, Object.keys(mathjax_latex_to_code))

    for (let result of results) {
        li = document.createElement('li');

        var content_data = mathjax_latex_to_code[result.target];
        var renderable = content_data["renderable"]
        var latex = content_data["latex"]

        if (renderable) {
            li.innerHTML = `\\( ${latex} \\)`;
            // focus will be put on the rendered mathjax which doesn't contain the 
            // latex source, thus we put it on the li element to be retreived later
            // when we want to insert the source into the editor
            // also, tabindex is not required because mathjax already adds that.
        } else {
            li.innerHTML = latex;
            li.tabIndex = "0";
        }
        li.setAttribute("latex-src", latex);

        ul.appendChild(li);
    }
    MathJax.typeset();
}

function toggle_visibility_of_fast_insert_modal() {
    const fast_insert_modal = document.getElementById("fast-insert-modal");
    console.assert(fast_insert_modal, "you were missing the fast-insert-modal");

    if (fast_insert_modal.style.display == 'flex') {
        fast_insert_modal.style.display = 'none'; 
    } else {
        fast_insert_modal.style.display = 'flex'; 
        const search_bar = fast_insert_modal.querySelector("#fast-insert-modal-search-bar");
        search_bar.focus();
    }
}

function get_search_bar_element() {
    const search_bar = fast_insert_modal.querySelector("#fast-insert-modal-search-bar");
    console.assert(search_bar, "you must have a textarea with the id: #fast-insert-modal-search-bar");
    return search_bar
}

function fast_insert_modal_is_visible() {
    return fast_insert_modal.style.display == 'flex'
}


function handle_custom_key_bindings(e){
    var evtobj = window.event? event : e
    if (evtobj.keyCode == 73 && evtobj.shiftKey) { // shift + I
        evtobj.preventDefault();
        toggle_visibility_of_fast_insert_modal();
    }
    // if (evtobj.keyCode == 13 && document.activeElement.id == "fast-insert-modal") { // enter
    if (evtobj.keyCode == 13 && fast_insert_modal_is_visible()) { // enter
        evtobj.preventDefault();
        const focused_element = document.activeElement;
        var focused_li; // focus might be on mathjax container, so not the same as the above variable
        var focused_on_something_irrelevant = false;
        if (focused_element.tagName == "MJX-CONTAINER"){
            focused_li = focused_element.parentElement;
        } else if (focused_element.tagName == "LI") {
            focused_li = focused_element 
        } else {
            focused_on_something_irrelevant = true;
        }
        if (!focused_on_something_irrelevant) {
            console.assert(focused_li, "you weren't focused on an li, this should be impossible");
            console.assert(focused_li.hasAttribute("latex-src"), "this li is missing the latex-src attribute");
            const content_to_be_inserted = focused_li.getAttribute("latex-src");
            const input_textarea = document.getElementById("input-textarea");
            console.assert(input_textarea, "you must have an element with id 'input-textarea'");
            // precondition, you've included editor.js in the html page before the line where this js file is included.
            insert_text_into_textarea(input_textarea, content_to_be_inserted, false);
            // reselect search bar for further additions
            const search_bar = get_search_bar_element();
            search_bar.select();
        }
    }

}

document.onkeydown = handle_custom_key_bindings;


