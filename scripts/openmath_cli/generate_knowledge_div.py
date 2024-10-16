import sys

# Try to import pyperclip, exit if not installed
try:
    import pyperclip
    pyperclip_available = True
except ImportError:
    print("The 'pyperclip' package is required but not installed. Please install it using 'pip install pyperclip'.")
    pyperclip_available = False

MINOR_WORDS = {'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'}

def title_case(title: str) -> str:
    """
    Converts a string to title case based on the following rules:
    - Major words (nouns, verbs, adjectives, adverbs, pronouns, and words with four letters or more) are capitalized.
    - Minor words (short conjunctions, prepositions, and articles) are lowercase, except when they are the first or last word.

    Args:
        title (str): The title string to be converted.

    Returns:
        str: The title string converted to title case.
    """
    words = title.split()
    title_cased_words = []

    for index, word in enumerate(words):
        # Capitalize the first and last words, or major words
        if index == 0 or index == len(words) - 1 or word.lower() not in MINOR_WORDS or len(word) >= 4:
            title_cased_words.append(word.capitalize())
        else:
            title_cased_words.append(word.lower())

    return ' '.join(title_cased_words)

def generate_html(entry_type: str, title: str) -> str:
    """
    Generates HTML boilerplate for the specified entry type and title.

    Args:
        entry_type (str): The type of the entry (definition, corollary, lemma, etc.).
        title (str): The title of the entry.

    Returns:
        str: A string containing the generated HTML.
    """
    # Convert the title using custom title case logic
    title = title_case(title)

    # Generate the HTML structure with proper indentation
    html = f"""
<div class="{entry_type.lower()}" id="{entry_type.lower().replace(' ', '-')}-{title.lower().replace(' ', '-')}" >
    <div class="title">{title}</div>
    <div class="content">
        TODO: Add the content for the {entry_type.lower()} here.
    </div>
"""
    
    # Add a proof section for all types except definition
    if entry_type in ["corollary", "lemma", "proposition", "theorem", "exercise"]:
        html += """
    <div class="proof">
        TODO: Add the proof here.
    </div>
"""
    
    html += "</div>"
    return html.strip()

def get_entry_type() -> str:
    """
    Prompts the user to select an entry type from a predefined list.

    Returns:
        str: The selected entry type (definition, corollary, lemma, etc.).
    """
    types = ["definition", "corollary", "lemma", "proposition", "theorem", "exercise"]
    print("Select a type:")
    for idx, entry_type in enumerate(types, 1):
        print(f"{idx}. {entry_type.capitalize()}")
    
    while True:
        try:
            choice = int(input("Enter the number of your choice: "))
            if 1 <= choice <= len(types):
                return types[choice - 1]
            else:
                print(f"Invalid choice. Please select a number between 1 and {len(types)}.")
        except ValueError:
            print("Please enter a valid number.")

def get_title() -> str:
    """
    Prompts the user to input the title for the entry.
    The title will automatically be converted to title case.

    Returns:
        str: The user-provided title.
    """
    return input("Enter the title for the entry (it will be automatically converted to title case): ")

def main() -> None:
    """
    Main function to generate HTML interactively by prompting the user for entry type and title.
    It automatically copies the generated HTML to the clipboard if pyperclip is available and assumes the user always wants to create another entry.
    """
    print("HTML Boilerplate Generator")

    while True:
        # Get entry type and title from user
        entry_type = get_entry_type()
        title = get_title()

        # Generate the HTML
        html = generate_html(entry_type, title)
        print("\nGenerated HTML:\n")
        print(html)
        print("\n---\n")

        # Copy HTML to clipboard if pyperclip is available
        if pyperclip_available:
            pyperclip.copy(html)
            print("The HTML has been copied to the clipboard.")
        else:
            print("Copying to clipboard was skipped due to pyperclip not being available.")

if __name__ == "__main__":
    main()
