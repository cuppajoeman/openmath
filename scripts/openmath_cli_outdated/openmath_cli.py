
import multiprocessing
from find_and_generate_knowledge_links import find_and_generate_knowledge_links
from start_dev_webserver import start_webserver
from fuzzy_find import search_content_files_for_term

running = True

help_message = '''available commands:

    fgkl: find and generate knowledge link 
    |
    |   description: 
    |       given a search term, find all knowledge with matching id, and generate a copyable knowledge link for it
    |
    |   args: 
    |       search term: a string representing what you want to search for
    |

    ff: fuzzy find in all mathematical content files
    |
    |   description:
    |       searches through the content files for the given search term
    |
    |   args:
    |       search term: the term we are interested in
    |

    ws: operate the webserver 
    |
    |   description:
    |       turn the webserver on or off
    |
    |   args:
    |       operation: either the string "start" or "stop"
    |

    st: status of openmath cli'''

print("Welcome to the openmath command line interface, please type help to see what's available")

webserver_running = False
webserver_process = None

while running:
    raw_input = input(">>> ")
    split_command = raw_input.split(' ')
    command_name = split_command[0]
    arguments = split_command[1:]

    match command_name:
        case "help":
            print(help_message)
        case "quit":
            running = False
        case "fgkl":
            if len(arguments) != 1:
                print("this command requires exactly one argument")
            else:
                search_term = arguments[0]
                search_results = find_and_generate_knowledge_links(search_term)
                print(search_results)
        case "ff":
            if len(arguments) != 1:
                print("this command requires exactly one argument")
            else:
                search_term = arguments[0]
                search_results = search_content_files_for_term(search_term)
                print(search_results)
        case "ws":
            if len(arguments) != 1:
                print("this command requires exactly one argument")
            else:
                argument = arguments[0]
                if argument == "start": 
                    if not webserver_running:
                        webserver_process = multiprocessing.Process(target=start_webserver, daemon=True)
                        webserver_process.start()
                        print("webserver started at localhost:8000")
                        webserver_running = True
                    else:
                        print("webserver already running")
                elif argument == "stop":
                    if webserver_running:
                        webserver_process.terminate()
                        webserver_running = False
                        print("webserver has been terminated")
                    else:
                        print("webserver is already stopped")
                else:
                    print("invalid argument")
        case "st":
            print(f"webserver running: {webserver_running}")
        case _:
            print("invalid command name")





