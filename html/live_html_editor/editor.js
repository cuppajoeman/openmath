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
        return '<a class="knowledge-link" href="ABSOLUTE_PATH_TO_FILE_CONTAINING_KNOLWEDGE#KNOWLEDGE_ID">TODO</a>'
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

function unconvert_escape_codes(source_string) {
    const conversion_map = {
        "&nbsp;": '\t',
        "&amp;": "&",
        "&quot;": '"',
        "&gt;": ">",
        "&lt;": "<",
    }
    for (var key in conversion_map){
        source_string = source_string.replaceAll( key, conversion_map[key] );
    }
    return source_string
}

function format_html(unformatted_html) {
    // https://api.html-tidy.org/tidy/quickref_5.0.0.html
    const options = {
        "indent_size": "4",
        "indent_char": " ",
        "max_preserve_newlines": "5",
        "preserve_newlines": true,
        "keep_array_indentation": false,
        "break_chained_methods": false,
        "indent_scripts": "normal",
        "brace_style": "collapse",
        "space_before_conditional": true,
        "unescape_strings": false,
        "jslint_happy": false,
        "end_with_newline": false,
        "wrap_line_length": "120",
        "indent_inner_html": false,
        "comma_first": false,
        "e4x": false,
        "indent_empty_lines": false
    }
    return html_beautify(unconvert_escape_codes(unformatted_html), options)
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
        alert("Great! We've just copied the contents of the left pane to your clipboard \n\n After clicking ok you'll be redirected to github to make a pull request. \n\n When you get there use 'ctrl-a' then 'ctrl-v' to paste the contents into the github editor and press 'commit changes'. \n\n Stuck: Click the 'help' tab to watch a video on how to do this.");
        input_textarea.select();
        document.execCommand('copy');
        window.open(url, '_blank').focus();
    }

    var run_button = document.getElementById("run-button");
    var auto_render = false;
    run_button.onclick = function() {
        // working on this, we need to make it so that this works by maybe having to use fast-html so files are as they seem?
        // requries knowing github actions to use that.
        input_textarea.value = format_html(input_textarea.value)
        iframe.contentDocument.body.innerHTML = input_textarea.value;
        iframe.contentWindow.preparePage();
        iframe.contentWindow.MathJax.typeset();
        // iframe.srcdoc = "<h1>hello</h1>\n" + "<p>" + input_textarea.value + "</p>";
    }

    const back_button = document.getElementById("back-button");
    back_button.onclick = function() {
        alert("Unless you've made a pull request, your changes will not be saved!");
        window.location.href = page_to_edit_path;
    }

}

function insert_text_into_textarea(textarea, text, refocus) {
    // Get the current cursor position
    const position = textarea.selectionStart;

    // Get the text before and after the cursor position
    const before = textarea.value.substring(0, position);
    const after = textarea.value.substring(position, textarea.value.length);

    // Insert the new text at the cursor position
    textarea.value = before + text + after;

    if (refocus) {
        textarea.focus()
    }
    // Set the cursor position to after the newly inserted text
    textarea.selectionStart = textarea.selectionEnd = position + text.length;
}

function wrap(i, insert_elements, input_textarea) {
    var insert_element = insert_elements.item(i);
    insert_element.onclick = function() {
        insert_text_into_textarea(input_textarea, get_template(insert_element.dataset.type), true)
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
