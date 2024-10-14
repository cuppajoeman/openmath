import os
from bs4 import BeautifulSoup

def extract_thin_wrapper(file_path):
    """Extracts the content of the thin-wrapper div from an HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()

        # Parse the HTML
        soup = BeautifulSoup(content, 'html.parser')

        # Extract the content of the thin-wrapper div
        thin_wrapper = soup.find('div', class_='thin-wrapper')
        print(file_path)

        if thin_wrapper:
            # Overwrite the original file with the extracted content
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(str(thin_wrapper.decode_contents()).replace("&amp;", "&"))
            print(f"Updated: {file_path}")
        else:
            print(f"No <div class='thin-wrapper'> found in {file_path}.")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def process_directory(directory):
    """Recursively processes all HTML files in the given directory."""
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                extract_thin_wrapper(file_path)

if __name__ == "__main__":
    # Specify the directory containing HTML files
    directory_path = 'html_copy'  # Replace with your directory path
    process_directory(directory_path)
