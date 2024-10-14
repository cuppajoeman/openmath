import os
import re

# TODO change this but for now has to be run from the folder where the script exists
# Directory containing the HTML files
HTML_DIR = "../../generated_html"

# List of valid ID prefixes
VALID_PREFIXES = ('theorem-', 'proposition-', 'exercise-', 'lemma-', 'corollary-', 'definition-')

def find_ids_in_html_files(directory):
    """Finds all IDs in the HTML files within the given directory and filters based on specific prefixes."""
    search_list = []
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, directory).replace("\\", "/")  # Use forward slashes
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    ids = re.findall(r'id="([^"]+)"', content)
                    for id_name in ids:
                        # Only add if the ID starts with a valid prefix
                        if id_name.startswith(VALID_PREFIXES):
                            search_list.append(f'{relative_path}#{id_name}')
    
    return search_list

# Find the IDs and create the JavaScript file
search_list = find_ids_in_html_files(HTML_DIR)

# Write the search_list to the JavaScript file
output_file_path = '../../generated_html/js/search/search_list.js'
with open(output_file_path, 'w', encoding='utf-8') as js_file:
    js_file.write('const search_list = [\n')
    for item in search_list:
        js_file.write(f'    "{item}",\n')
    js_file.write('];\n')
