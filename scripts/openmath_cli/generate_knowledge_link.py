import os
import re
import subprocess
import pyperclip

# Directory containing the HTML files
HTML_DIR = "../../html"

def find_ids_in_html_files(directory):
    """Finds all IDs in the HTML files within the given directory."""
    id_entries = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    ids = re.findall(r'id="([^"]+)"', content)
                    for id_name in ids:
                        id_entries.append(f'{file_path}:{id_name}')
    return id_entries

def strip_prefix(path, prefix='../../html'):
    """Strips the specified prefix from the path if present."""
    if path.startswith(prefix):
        return path[len(prefix):]
    return path

def generate_knowledge_link(selected_id, file_path):
    """Generates a knowledge link and copies it to the clipboard."""
    stripped_path = strip_prefix(file_path)
    knowledge_link = f'<a class="knowledge-link" href="{stripped_path}#{selected_id}"></a>'
    pyperclip.copy(knowledge_link)
    print(f"Knowledge link copied to clipboard: {knowledge_link}")

def search_for_ids(id_entries):
    """Uses fzf to allow the user to search and select an ID."""
    try:
        # Use fzf to filter the IDs
        fzf_process = subprocess.Popen(['fzf'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        fzf_output, _ = fzf_process.communicate(input="\n".join(id_entries))
        selected = fzf_output.strip()

        return selected
    except subprocess.CalledProcessError as e:
        print("Error during fzf execution:", e)
        return None

def main():
    # Find all IDs in the HTML files
    id_entries = find_ids_in_html_files(HTML_DIR)

    while True:
        selected = search_for_ids(id_entries)

        if selected:
            # Extract the file path and ID from the selected output
            match = re.search(r'^(.*):([^:]+)$', selected)
            if match:
                file_path = match.group(1)
                id_name = match.group(2)

                # Generate the knowledge link
                generate_knowledge_link(id_name, file_path)
            
            # Prompt the user if they want to do another search
            next_action = input("Do you want to do another search? Type 'ano' to search again, or 'quit' to exit: ").strip().lower()
            if next_action == 'quit':
                print("Exiting script.")
                break
            elif next_action != 'ano':
                print("Invalid input. Exiting script.")
                break
        else:
            print("No selection made or fzf was closed.")
            break

if __name__ == "__main__":
    main()
