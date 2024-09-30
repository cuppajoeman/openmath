import os
import re
import subprocess
import pyperclip
import time
import threading

# Directory containing the HTML files
HTML_DIR = "../../html"
IDLE_TIMEOUT = 10  # Timeout in seconds for automatic refresh
MOD_CHECK_INTERVAL = 2  # Time interval to check for file modifications

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

def check_for_changes(directory, last_mod_times):
    """Checks for modifications in the directory."""
    current_mod_times = {}
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                current_mod_times[file_path] = os.path.getmtime(file_path)
    
    # If the last modification times differ from the current ones, refresh is needed
    if current_mod_times != last_mod_times:
        return current_mod_times, True
    return last_mod_times, False

def monitor_directory(directory, idle_event, id_entries):
    """Monitors the directory for changes and triggers an automatic refresh."""
    last_mod_times = {}
    while not idle_event.is_set():
        last_mod_times, changed = check_for_changes(directory, last_mod_times)
        if changed:
            print("Directory content changed. Refreshing ID list...")
            id_entries.clear()
            id_entries.extend(find_ids_in_html_files(directory))
            idle_event.set()  # Trigger refresh immediately after change detection
        time.sleep(MOD_CHECK_INTERVAL)

def idle_timer(idle_event):
    """Sets an event after the user has been idle for a certain time."""
    idle_event.wait(IDLE_TIMEOUT)
    if not idle_event.is_set():
        print(f"No input detected for {IDLE_TIMEOUT} seconds. Automatically refreshing search.")
        idle_event.set()

def main():
    id_entries = find_ids_in_html_files(HTML_DIR)

    # Event to track user activity or directory change
    idle_event = threading.Event()

    # Start monitoring the directory for changes in a separate thread
    monitor_thread = threading.Thread(target=monitor_directory, args=(HTML_DIR, idle_event, id_entries))
    monitor_thread.daemon = True  # Ensure thread closes when main program exits
    monitor_thread.start()

    while True:
        idle_event.clear()

        # Start a timer for auto-refresh when the user is idle
        timer_thread = threading.Thread(target=idle_timer, args=(idle_event,))
        timer_thread.start()

        selected = search_for_ids(id_entries)

        idle_event.set()  # Stop the idle timer since user input was detected

        if selected:
            match = re.search(r'^(.*):([^:]+)$', selected)
            if match:
                file_path = match.group(1)
                id_name = match.group(2)
                generate_knowledge_link(id_name, file_path)
        else:
            print("No selection made or fzf was closed.")
        
        # Automatically restart search without asking
        print("Restarting search...")

if __name__ == "__main__":
    main()
