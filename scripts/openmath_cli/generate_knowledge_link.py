import os
import re
import subprocess

# Try importing pyperclip and handle the case where it is not installed
try:
    import pyperclip
    pyperclip_available = True
except ImportError:
    print("pyperclip is not installed. Copying to clipboard will be skipped.")
    pyperclip_available = False

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

def generate_knowledge_link(selected_id, file_path, content):
    """Generates a knowledge link with custom content and copies it to the clipboard."""
    stripped_path = strip_prefix(file_path)
    knowledge_link = f'<a class="knowledge-link" href="{stripped_path}#{selected_id}">{content}</a>'
    
    # Only copy to clipboard if pyperclip is available
    if pyperclip_available:
        pyperclip.copy(knowledge_link)
        print(f"Knowledge link copied to clipboard: {knowledge_link}")
    else:
        print("Copying to clipboard was skipped. Generated link:")
        print(knowledge_link)

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
    while True:
        # Regenerate id_entries at the start of every new query
        id_entries = find_ids_in_html_files(HTML_DIR)

        user_choice = input("Would you like to generate a knowledge link? (y/n or press Enter for yes): ").lower()

        if user_choice != 'y' and user_choice != '':
            print("Exiting program.")
            break

        selected = search_for_ids(id_entries)

        if selected:
            match = re.search(r'^(.*):([^:]+)$', selected)
            if match:
                file_path = match.group(1)
                id_name = match.group(2)
                
                # Ask the user for the content to put inside the anchor tag
                content = input(f"Enter the content for the knowledge link (between the anchor tags): ")

                generate_knowledge_link(id_name, file_path, content)
        else:
            print("No selection made or fzf was closed.")

if __name__ == "__main__":
    main()
