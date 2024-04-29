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
}

window.onload = function() {
    const page_to_edit_path = new URLSearchParams(window.location.search).get('page');
    console.log(page_to_edit_path)
    set_split_screen_height();
    set_up_editor_interaction(page_to_edit_path);
};
