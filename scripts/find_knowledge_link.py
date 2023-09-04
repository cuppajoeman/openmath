import os
import sys
import re
from os import walk

search_term = sys.argv[1]

script_directory = os.path.dirname(os.path.realpath(__file__))
os.chdir("../html")
content_directory = os.getcwd()

knowledge_link_found = False

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

                    match = re.search('id="(.*)"', line)
                    if match: 
                        id_of_knowledge = match.group(1)

                        if search_term in id_of_knowledge:

                            relative_path = os.path.relpath(full_path)

                            knowledge_link_found = True
                            knowledge_link = relative_path + "#" + id_of_knowledge

                            print("")
                            print("==Match Start==")
                            print(knowledge_link)
                            print(f'<span class="knowledge-link" data-href="/{knowledge_link}"></span>')
                            print("==Match End==")
                            print("")


                #data=f.read()
                #data=data.lower()

                #if search_term in data:
                    #print(dir_path, name)


if knowledge_link_found == False:
    print("sorry we couldn't find that one")
