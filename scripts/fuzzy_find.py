import os
import sys
from os import walk

search_term = sys.argv[1]

script_directory = os.getcwd()
os.chdir("../html")
content_directory = os.getcwd()

for dir_path, dirs, file_names in walk(content_directory ):
    for name in file_names:            
        full_path = os.path.join(dir_path, name) 
        is_html_file = name[-4:] == "html"
        if is_html_file:
            # print(full_path)
            with open(full_path, 'r', encoding="utf-8") as f:

                lines = f.readlines()

                for i, line in enumerate(lines):
                    line_number = i + 1
                    if search_term in line:
                        print(f"We found that term in at: {full_path} on line {line_number}, here's the match:")
                        print(line)

                #data=f.read()
                #data=data.lower()

                #if search_term in data:
                    #print(dir_path, name)

