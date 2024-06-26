# TODO you have to install beautiful soup for this to work, use venv with requirements.txt in the future.
from typing import Tuple, List, Dict

from bs4 import BeautifulSoup
import os
import pprint
import sys
from os import walk

script_directory = os.path.dirname(os.path.realpath(__file__))
os.chdir("../")
html_directory = os.getcwd()

path_delimiter = "/" # depends on what system you are on

dirs_to_ignore = ["implementation"]
files_to_ignore = ["index.html"]

search_data_file = "search_data.js"

types_of_knowledge = ['definition', 'theorem', 'proposition', 'lemma', 'corollary', 'exercise']

search_data_file_path = f"{script_directory}/{search_data_file}"

def path_to_be_ignored(dir_path: str) -> bool:
    for directory in dirs_to_ignore:
        if directory in dir_path:
            return True
    return False

def file_to_be_ignored(file_name: str) -> bool:
    for ignored_file_name in files_to_ignore:
        if ignored_file_name == file_name:
            return True
    return False

def create_search_data():

    directory_structure = {}
    all_content_files = []
    for dir_path, dirs, file_names in walk(html_directory):
        if path_to_be_ignored(dir_path):
            continue
        for name in file_names:
            if file_to_be_ignored(name):
                continue
            full_path = os.path.join(dir_path, name)
            is_html_file = name[-4:] == "html"
            if is_html_file:

                relative_path = os.path.relpath(full_path)
                all_content_files.append(relative_path)

                sub_directory = directory_structure
                for sub_path in relative_path.split(path_delimiter):
                    sub_directory = sub_directory.setdefault(sub_path, {})

    return all_content_files

class Definition:
    id: str
    path: str
    def __init__(self, id: str, path: str):
        self.id = id
        self.path = path

    def __repr__(self):
        return f"definition with id: {self.id}: at location: {self.path}"


def extract_search_results(content_file_paths: List[str]) -> Tuple[List[str], Dict[str, str]]:
    all_knowledges = []
    knowledge_id_to_relative_path = {}
    all_knowledge_ids = []

    for content_file_path in content_file_paths:
        html_file_contents = open(content_file_path).read()
        parsed_html = BeautifulSoup(html_file_contents, 'html.parser')

        # all_knowledges_in_file = parsed_html.find_all("div", class_="knowledge")
        all_knowledge_in_file = parsed_html.find_all(True, {'class': types_of_knowledge})

        for knowledge in all_knowledge_in_file:
            id = knowledge.get('id')
            all_knowledge_ids.append(id)

            knowledge_id_to_relative_path[id] = content_file_path

            knowledge = Definition(id, content_file_path)
            all_knowledges.append(knowledge)

    return all_knowledge_ids, knowledge_id_to_relative_path

def write_search_data_to_file(all_knowledge_ids, knowledge_id_to_relative_path: Dict[str, str]):
    f = open(search_data_file_path, "w")

    f.write("var knowledge_ids = [\n")

    for knowledge_id in all_knowledge_ids:
        if knowledge_id is not None:
            f.write(f'\t"{knowledge_id}",\n')

    f.write("]\n")

    f.write("var knowledge_id_to_relative_path = {\n")

    for (knowledge_id, relative_path) in knowledge_id_to_relative_path.items():
        if knowledge_id is not None:
            local_link_to_knowledge_id = path_delimiter + relative_path + "#" + knowledge_id
            f.write(f'\t"{knowledge_id}": "{local_link_to_knowledge_id}",\n')

    f.write("}\n")

    f.close()


if __name__ == "__main__":
    content_file_paths = create_search_data()
    all_knowledge_ids, knowledge_id_to_relative_path = extract_search_results(content_file_paths)
    write_search_data_to_file(all_knowledge_ids, knowledge_id_to_relative_path)

    # pprint.pprint(definitions)


# pprint.pprint(create_search_data())
# print(directory_structure)
