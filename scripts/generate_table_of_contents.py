import os
import sys
from os import walk

# TODO this is getting abandoned because we want to follow the files in a certain order

non_content_directories = ["includes"]

script_directory = os.path.dirname(os.path.realpath(__file__))
os.chdir("../html")
html_directory = os.getcwd()

html_table_of_contents = ""

delimiter = '\\'

directory_structure = {}

for dir_path, dirs, file_names in walk(html_directory):
    for name in file_names:
        full_path = os.path.join(dir_path, name)
        is_html_file = name[-4:] == "html"
        if is_html_file:
            relative_path = os.path.relpath(full_path)

            root_file = delimiter not in relative_path

            if not root_file:

                sub_directory = directory_structure

                for sub_path in relative_path.split(delimiter):
                    sub_directory = sub_directory.setdefault((sub_path), {})

print(directory_structure)

seen_directories = {}

def create_html_toc(current_directory, path_so_far="", indent=0):

    if current_directory == {}:
        return

    whitespace = '\t' * indent
    next_level_whitespace = '\t' * (indent + 1)

    ul_start_tag = "<ul>"
    print(whitespace + ul_start_tag)

    for key, value in current_directory.items():

        directory_name_or_file_name = key
        directory_contents_or_file_path_end = value

        at_file = ".html" in directory_name_or_file_name

        if at_file:
            file_name = directory_name_or_file_name
            a_link = path_so_far
            a_text = file_name
            a_element = f'<a href="{a_link}">{a_text}</a>'
            li_with_a_inside = f'<li>{a_element}</li>'
            print(next_level_whitespace + li_with_a_inside)
        else:
            directory_name = directory_name_or_file_name
            li_element = f'<li>{directory_name}</li>'
            print(next_level_whitespace + li_element)




        if isinstance(value, dict):
            create_html_toc(value, path_so_far + delimiter + directory_name_or_file_name, indent + 1)
        else:
            print(next_level_whitespace + str(value))

    ul_end_tag = "<\\ul>"
    print(whitespace + ul_end_tag)


create_html_toc(directory_structure)

