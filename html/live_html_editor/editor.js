function get_indentation_in_spaces(level) {
    const tab_size_in_spaces = 4;
    const default_depth = tab_size_in_spaces * 2; // because we're in body and then also div thin-wrapper.
    return " ".repeat(default_depth + (level * tab_size_in_spaces))
}

function get_template(swp_type) {
    if (swp_type == "definition") {
        return `<div class="definition" id="definition-TODO-USING-LOWERCASE-AND-HIPHEN">
${get_indentation_in_spaces(1)}<div class="title">TODO</div>
${get_indentation_in_spaces(1)}<div class="content">
${get_indentation_in_spaces(2)}TODO
${get_indentation_in_spaces(1)}</div>
${get_indentation_in_spaces(0)}</div>`
    } else if (swp_type == "knowledge-link") {
        return '<a class="knowledge-link" data-href="ABSOLUTE_PATH_TO_FILE_CONTAINING_KNOLWEDGE#KNOWLEDGE_ID">TODO</a>'
    } else {
        return `<div class="${swp_type}" id="${swp_type}-TODO-USING-LOWERCASE-AND-HIPHEN" >
${get_indentation_in_spaces(1)}<div class="title">TODO</div>
${get_indentation_in_spaces(1)}<div class="content">
${get_indentation_in_spaces(2)}TODO
${get_indentation_in_spaces(1)}</div>
${get_indentation_in_spaces(1)}<div class="proof">
${get_indentation_in_spaces(2)}TODO
${get_indentation_in_spaces(1)}</div>
${get_indentation_in_spaces(0)}</div>`
    }
}


function set_split_screen_height() {
    var navbar = document.getElementById("navbar");
    var splitScreen = document.getElementById("split-screen");
    var navbarHeight = navbar.clientHeight; // Get the height of the navbar
    splitScreen.style.marginTop = navbarHeight + "px"; // Set the margin-top for split-screen
    splitScreen.style.height = `calc(100vh - ${navbarHeight}px)`; // Adjust height for split-screen
}

function format_html(unformatted_html) {
      const options = {
      "indent":"auto", "indent-spaces":4, "wrap":120,
      "markup":true, "output-xml":false, "numeric-entities":true,
      "quote-marks":true, "quote-nbsp":false, 
      "quote-ampersand":false, "break-before-br":true, "uppercase-tags":false,
      "uppercase-attributes":false, "drop-font-tags":true, "tidy-mark":false
    }
    return tidy_html5(unformatted_html, options)
}

function set_up_editor_interaction(page_to_edit_path) {
    var initial_content = "<h1>hello</h1>\n<p>initial content</p>"

    var input_textarea = document.getElementById("input-textarea");
    // (B) in editor.html allows this to occur
    configure_textarea_as_basic_editor(input_textarea);

    var iframe = document.getElementById("output-iframe");
    iframe.src = page_to_edit_path

    iframe.addEventListener("load", function() {
        // input_textarea.value = iframe.contentDocument.body.innerHTML;
        const html_content = format_html(iframe.contentWindow.document.documentElement.outerHTML)
        input_textarea.value = html_content
    });

    var publish_button = document.getElementById("publish-changes-button");
    const url = "https://github.com/cuppajoeman/openmath/edit/main/html" + page_to_edit_path
    publish_button.onclick = function() {
        input_textarea.select();
        document.execCommand('copy');
        window.open(url, '_blank').focus();
    }

    var run_button = document.getElementById("run-button");
    var auto_render = false;
    if (auto_render) {
        input_textarea.addEventListener('keyup',()=>{
          var html = input_textarea.value;
          // iframe.src = "data:text/html;charset=utf-8," + encodeURI(html);
            iframe.srcdoc = "<h1>hello</h1>\n" + "<p>" + input_textarea.value + "</p>";
        })
    } else {
        run_button.onclick = function() {
            // working on this, we need to make it so that this works by maybe having to use fast-html so files are as they seem?
            // requries knowing github actions to use that. 
            iframe.contentDocument.body.innerHTML = input_textarea.value;
            iframe.contentWindow.preparePage();
            iframe.contentWindow.MathJax.typeset();

            // iframe.srcdoc = "<h1>hello</h1>\n" + "<p>" + input_textarea.value + "</p>";
        }
    }

    const back_button = document.getElementById("back-button");
    back_button.onclick = function() {
        alert("Your changes will not be saved!");
        window.location.href = page_to_edit_path;
    }

}

function insert_text_into_textarea_and_refocus(textarea, text) {
    // Get the current cursor position
    const position = textarea.selectionStart;

    // Get the text before and after the cursor position
    const before = textarea.value.substring(0, position);
    const after = textarea.value.substring(position, textarea.value.length);

    // Insert the new text at the cursor position
    textarea.value = before + text + after;

    textarea.focus()

    // Set the cursor position to after the newly inserted text
    textarea.selectionStart = textarea.selectionEnd = position + text.length;
}

function wrap(i, insert_elements, input_textarea) {
    var insert_element = insert_elements.item(i);
    console.log(insert_element, insert_element.dataset.type)
    insert_element.onclick = function() {
        insert_text_into_textarea_and_refocus(input_textarea, get_template(insert_element.dataset.type))
    }
}

function configure_insert_buttons(){
    var input_textarea = document.getElementById("input-textarea");
    var insert_elements = document.getElementsByClassName("insert-content");

    // https://stackoverflow.com/a/35135537/6660685, this is why wrap has to be created
    for (let i = 0; i < insert_elements.length; i++) {
        wrap(i, insert_elements, input_textarea);
    }

}

window.onload = function() {
    configure_insert_buttons();
    set_split_screen_height();
    const page_to_edit_path = new URLSearchParams(window.location.search).get('page');
    set_up_editor_interaction(page_to_edit_path);
};
