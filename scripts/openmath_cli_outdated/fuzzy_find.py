import os
import sys
from os import walk


script_directory = os.path.dirname(os.path.realpath(__file__))
os.chdir("../../html")
content_directory = os.getcwd()

def search_content_files_for_term(search_term):

    search_results = ""

    file_path_to_results = {}

    for dir_path, dirs, file_names in walk(content_directory):
        for name in file_names:            
            full_path = os.path.join(dir_path, name) 
            is_html_file = name[-4:] == "html"
            if is_html_file:
                # print(full_path)
                with open(full_path, 'r', encoding="utf-8") as f:

                    lines = f.readlines()

                    file_matches = ""
                    found_match_yet = False
                    for i, line in enumerate(lines):
                        line_number = i + 1
                        if search_term in line:

                            first_match = not found_match_yet

                            match_string = ""

                            if first_match:
                                match_string += f"""
==Matches in {full_path}=="""

                            found_match_yet = True

                            match_string += f'''
        line: {line_number}, match: {line.strip()} '''

                            file_matches += match_string

                    if found_match_yet:
                        file_matches += '''
==Match End==
'''

                    search_results += file_matches

    return search_results
