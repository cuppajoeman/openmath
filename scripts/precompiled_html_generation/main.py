from bs4 import BeautifulSoup, Tag
from typing import Dict, Callable
import re
import pdb
import os
import latex2mathml.converter


def restore_ampersands(html_content: str) -> str:
    """When there is a literal & in html then since this is a special char then 
    BeautifulSoup(html_content, ...) will turn them into &amp; which is how html 
    represents special chars such as < being writeen as &lt; to avoid clashing with < for tags
    this function restores the & which is used in latex environments for alignment.
    """
    return html_content.replace("&amp;", "&");


def read_html_file(file_path):
    """Read the HTML file and return its content."""
    with open(file_path, "r", encoding="utf-8") as file:
        return file.read()

def write_html_file(file_path, content):
    """Write the given content to an HTML file."""
    with open(file_path, "w", encoding="utf-8") as file:
        file.write(content)

def set_up_statement_with_proof_templates(html_content: str, logging: bool = False) -> str:
    """Set up statements with proof templates in the HTML content."""
    soup = BeautifulSoup(html_content, "html.parser")

    # Load the statement with proof template, going back a dir because it's running from fast-html
    # TODO in future do this relative to the script dir
    template_file_path = "../templates/statement_with_proof.html"
    if logging:
        print(f"Reading template file from: {template_file_path}")

    # Read the HTML content of the template file
    template_content = read_html_file(template_file_path)
    if logging:
        print("Template file content read successfully.")

    types_of_statements_requiring_proof = ["theorem", "proposition", "lemma", "corollary", "exercise"]

    for type_of_statement_requiring_proof in types_of_statements_requiring_proof:
        statements_with_proof = soup.find_all(class_=type_of_statement_requiring_proof)

        for statement_with_proof in statements_with_proof:
            # create a new template each time.
            statement_with_proof_template = BeautifulSoup(template_content, "html.parser").find("div")
            replace_statement_with_proof_from_template(statement_with_proof, type_of_statement_requiring_proof, statement_with_proof_template, logging)


    return str(soup)

def replace_statement_with_proof_from_template(
    statement_with_proof: Tag,
    type_of_statement_requiring_proof: str,
    statement_with_proof_template: Tag,
    logging: bool = False
) -> None:
    """Replace a statement with a proof from the template, handling nested HTML content."""
    
    # Log the start of the function execution
    if logging:
        print(statement_with_proof)
        print(f"Starting replacement for statement with ID: {statement_with_proof['id']}")
    
    existing_title_element = statement_with_proof.select_one(".title")
    existing_content_element = statement_with_proof.select_one(".content")
    existing_proof_element = statement_with_proof.select_one(".proof")

    # Log the extracted elements
    if logging:
        print("Extracted elements:")
        print(f"  Title: {existing_title_element}")
        print(f"  Content: {existing_content_element}")
        print(f"  Proof: {existing_proof_element}")

    # Update the template with content from the original statement
    statement_with_proof_template['class'] = f" {type_of_statement_requiring_proof}"

    # Grab from the existing template
    template_title_element = statement_with_proof_template.select_one(".title")
    template_content_element = statement_with_proof_template.select_one(".content")
    template_proof_element = statement_with_proof_template.select_one(".new-proof")
    template_proof_content_element = template_proof_element.select_one(".content")

    # Log the template elements
    if logging:
        print("Template elements before updating:")
        print(f"  Template Title Element: {template_title_element}")
        print(f"  Template Content Element: {template_content_element}")
        print(f"  Template Proof Element: {template_proof_element}")

    # Check if proof_element is None and log accordingly
    if existing_proof_element is None:
        print(f"Warning: {statement_with_proof} is missing a proof.")

    # Update the template elements with values from the original statement
    if template_title_element and existing_title_element:
        template_title_element.replace_with(existing_title_element)
        if logging:
            print(f"Updated template title to: {template_title_element.string}")
    else:
        print("Warning: Template title element is None or existing title is None.")

    if template_content_element and existing_content_element:
        # Use .decode_contents() to handle nested HTML
        template_content_element.replace_with(existing_content_element)
        if logging:
            print(f"Updated template content with nested HTML.")
    else:
        print("Warning: Template content element is None or existing content is None.")

    if template_proof_content_element and existing_proof_element:
        existing_proof_element['class'] = "content"
        template_proof_content_element.replace_with(existing_proof_element);
        # have to do the following because replacing with an element clobbers the class as well
        if logging:
            print(f"Updated template proof content with nested HTML.")
    else:
        print("Warning: Template proof content element is None or existing proof is None.")

    # Set the id from the original statement
    statement_with_proof_template['id'] = statement_with_proof['id']
    if logging:
        print(f"Set template ID to: {statement_with_proof['id']}")

    # Replace the original statement with the updated template
    statement_with_proof.replace_with(statement_with_proof_template)

    if logging:
        print(f"Replaced {type_of_statement_requiring_proof}: {statement_with_proof['id']} with the template.")

    return

def set_up_proof_toggle_buttons(html_content, logging=False):
    """Set up proof toggle buttons in the HTML content."""
    if logging:
        print("Setting up proof toggle buttons...")

    soup = BeautifulSoup(html_content, "html.parser")
    proofs = soup.find_all(class_="new-proof")

    for proof in proofs:
        if logging:
            print(f"Processing proof: {proof}")

        # Find the toggle button and content
        toggle_button = proof.select_one(".line-with-centered-text > button")
        content = proof.select_one(".content")

        if content:
            # Initially hide the content
            content['style'] = 'display: none;'
            content_hidden = True  # Track if content is hidden

            # Modify button text and behavior
            if toggle_button:
                toggle_button.string = "show proof"  # Set initial button text
                if logging:
                    print(f"Set button text to 'show proof' for proof: {proof}")

                # Add a data attribute to keep track of visibility state
                toggle_button['data-hidden'] = str(content_hidden).lower()

                toggle_button['onclick'] = (
                    "console.log('Toggle button clicked. Current hidden state:', this.getAttribute('data-hidden')); "
                    "var content = this.parentNode.nextElementSibling; "  # Use nextElementSibling to get the content
                    "if (this.getAttribute('data-hidden') === 'true') { "
                    "    console.log('Showing proof for:', content); "
                    "    if (content) { content.style.display = 'block'; } "
                    "    this.innerHTML = 'hide proof'; "
                    "    this.setAttribute('data-hidden', 'false'); "
                    "} else { "
                    "    console.log('Hiding proof for:', content); "
                    "    if (content) { content.style.display = 'none'; } "
                    "    this.innerHTML = 'show proof'; "
                    "    this.setAttribute('data-hidden', 'true'); "
                    "}"
                )
                if logging:
                    print(f"Added toggle functionality for proof: {proof}")

    if logging:
        print("Finished setting up proof toggle buttons.")
    
    return str(soup)

def convert_latex_to_mathml(html_content):
    """Convert LaTeX expressions in the HTML content to MathML."""
    # Define a regex pattern to match LaTeX inside \( ... \), \[ ... \], or $ ... $ (handling multi-line expressions)
    latex_pattern = re.compile(r'\\\((.+?)\\\)|\\\[(.+?)\\\]|\$(.+?)\$', re.DOTALL)

    def replace_latex_with_mathml(match):
        """Convert LaTeX to MathML, setting the display attribute based on LaTeX syntax."""
        if match.group(1):  # \( ... \) - inline math
            latex = match.group(1)
            display = "inline"
        elif match.group(2):  # \[ ... \] - block math
            latex = match.group(2)
            display = "block"
        else:  # $ ... $ - inline math
            latex = match.group(3)
            display = "inline"
        
        # Convert LaTeX to MathML using the display attribute
        print("about to convert", latex)
        # add the \displaystyle command if in block mode, need to make issue about this in latex2mathml
        latex = ("\displaystyle " if display == "block" else "") + latex
        mathml = latex2mathml.converter.convert(latex, display=display)
        return mathml

    # Replace LaTeX with MathML in the HTML content
    return latex_pattern.sub(replace_latex_with_mathml, html_content)

def setup_page(html_content: str) -> str:
    logging = False
    modified_html_content = convert_latex_to_mathml(html_content)
    modified_html_content = set_up_statement_with_proof_templates(modified_html_content, logging)
    modified_html_content = set_up_proof_toggle_buttons(modified_html_content, logging)
    return modified_html_content

def strip_leading_dotslash(path):
    while path.startswith("../"):
        path = path[3:]
    return path

def generate_breadcrumb(path_to_content_file: str) -> str:
    """
    Generates breadcrumb navigation from the file path.
    Example: path_to_content_file 'generated_html/a/b/c/file.html'
    would generate the breadcrumb as:
    '~/a/b/c/' where a, b, c are clickable and link to /a/index.html, /a/b/index.html, etc.
    """
    breadcrumb_html = '<nav class="breadcrumb">\n'
    parts = strip_leading_dotslash(path_to_content_file.replace("generated_html/", "")).split("/")[:-1]  # exclude the file name
    current_path = "/"
    
    breadcrumb_html += f'<a href="/index.html">~</a>'

    for i, part in enumerate(parts):
        current_path += part + "/"
        breadcrumb_html += f'/<a href="{current_path}index.html">{part}</a>'

    breadcrumb_html += "\n</nav>\n"
    return breadcrumb_html


def openmath_template_conversion(path_to_content_file: str, file_name: str, template_file: str):
    """
    If it's processing a/b/c/file.html, then path_to_content_file refers to that whole path, and 
    file_name refers to file.html, template_file refers to the template file being used for file.html
    """
    with open(template_file, "r") as f:
        template_lines = f.readlines()

    file_name = os.path.splitext(os.path.basename(file_name))[0]
    page_title = file_name.replace('_', ' ')

    # Update the page title in the template
    title_line_index = next(i for i, s in enumerate(template_lines) if "<title>PAGE TITLE</title>" in s)
    template_lines[title_line_index] = template_lines[title_line_index].replace("PAGE TITLE", page_title)

    # Update the header title (if needed) - Here, assuming header title can be added similarly.
    # If you have a specific header title line in your template, include it; otherwise, this part can be omitted.
    # For now, we'll assume it's not included since the header line isn't provided.
    
    print(f"DEBUG PATH TO CONTENT FILE {path_to_content_file}")
    
    # Generate breadcrumb navigation
    breadcrumb_html = generate_breadcrumb(path_to_content_file)

    with open(path_to_content_file, "r") as f:
            content_string = f.read()

    content_string = restore_ampersands(content_string)

    # Insert breadcrumb navigation above the main content
    main_content_area_index = next(i for i, s in enumerate(template_lines) if "CONTENT" in s)
    template_lines[main_content_area_index] = breadcrumb_html + template_lines[main_content_area_index].replace("CONTENT", content_string)

    # # Update link to file on git
    # link_to_file_on_git_index = next(i for i, s in enumerate(template_lines) if "FILENAME" in s)
    # # Remove the temporary directory from path
    # corrected_path = path_to_content_file.replace("generated_html/", "")
    # template_lines[link_to_file_on_git_index] = template_lines[link_to_file_on_git_index].replace("FILENAME", corrected_path)

    with open(path_to_content_file, "w") as f:
        contents = "".join(template_lines)
        contents = setup_page(contents)
        f.write(contents)


template_file_to_conversion : Dict[str, Callable[[str, str, str], None]] = {
    "openmath_template.html": openmath_template_conversion
}

# # If this script is run directly, execute the main function
# if __name__ == "__main__":
#     input_html_file = "test.html"  # Input HTML file
#     output_html_file = "test_with_mathml.html"  # Output HTML file
#     logging_enabled = True  # Set this to True to enable logging
#
#     main(input_html_file, output_html_file, logging=logging_enabled)
