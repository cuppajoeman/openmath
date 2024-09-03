import argparse
import networkx as nx # requires networkx to be installed
# import matplotlib.pyplot as plt
# import matplotlib as mpl
import gravis as gv
import shutil
import os
from bs4 import BeautifulSoup
from os import walk
from typing import List, Dict

tab = "    "

class KnowledgeNode:
    knowledge_paths_used: List[str]

knowledge_path_to_knowledge_used: Dict[str, List[str]] = {}


def create_argparser_and_get_args():
    parser = argparse.ArgumentParser(prog="om-generate-graph", description="looks at the openmath content directory and creates a graph out of it for later parsing", epilog="visit www.openmath.net for more information")

    parser.add_argument("--base-dir", help="the base directory to recursively operate on, path is relative to the script directory")
    parser.add_argument("--gen-dir", help="the directory that the graph structure will be saved to in pickle form")

    args = parser.parse_args()
    return args

def get_end_of_path(path):
    return os.path.basename(os.path.normpath(path))

def add_knowledge_to_graph_from_file(html_file_path):
    html_file_contents = open(html_file_path).read()
    parsed_html = BeautifulSoup(html_file_contents, 'html.parser')
    types_of_knowledge = ['definition', 'theorem', 'proposition', 'lemma', 'corollary', 'exercise']
    all_knowledge_in_file = parsed_html.find_all(True, {'class': types_of_knowledge})

    for knowledge in all_knowledge_in_file:

        if knowledge.get('id') is None: # missing id
            print(f"{tab * 3}- it's missing an id")
            continue
        else:
            print(f"\n{tab * 3}ID: {knowledge.get('id')}, uses the following knowledge:")

        current_knowledge_id = knowledge.get('id')
        current_knowledge_path = f"{html_file_path}#{current_knowledge_id}"
        knowledge_path_to_knowledge_used[current_knowledge_path] = []
        knowledge_links = knowledge.find_all(True, {'class': 'knowledge-link'})

        for knowledge_link in knowledge_links:
            uses_current_format = knowledge_link.has_attr('href')
            uses_old_format = knowledge_link.has_attr('data-href')
            assert uses_old_format or uses_current_format, "knowledge link without link, this is bad."

            knowledge_path = ""
            if uses_current_format:
                print(f"{tab * 4}{knowledge_link['href']}")
                knowledge_path = knowledge_link['href']
            elif uses_old_format:
                print(f"{tab * 4}{knowledge_link['data-href']}")
                knowledge_path = knowledge_link['data-href']

            knowledge_path_to_knowledge_used[current_knowledge_path].append(knowledge_path)


def show_graph(G):
    # fig = gv.d3(G, use_node_size_normalization=True, node_size_normalization_max=30,
    #             use_edge_size_normalization=True, edge_size_data_source='weight', edge_curvature=0.3)
    fig = gv.vis(G, node_label_data_source='short-name', show_details=True, details_height=100, graph_height=800, node_size_factor=3, edge_curvature=0.3, edge_size_factor=0.1, node_hover_neighborhood=True,  avoid_overlap=1, gravitational_constant=-10000, central_gravity=0.3)
    print(fig)
    fig.display()
    fig.export_html('openmath_graph_visualization.html')

def get_color(knowledge_path):
    if "definition" in knowledge_path:
        return "blue"
    if "theorem" in knowledge_path:
        return "green"
    if "corollary" in knowledge_path:
        return "green"
    if "lemma" in knowledge_path:
        return "red"
    if "exercise" in knowledge_path:
        return "grey"
    if "proposition" in knowledge_path:
        return "teal"

def add_metadata_to_nodes(G):

    knowledge_path_to_short_name = {}
    knowledge_path_to_color = {}
    for node in G.nodes:
        knowledge_path_to_short_name[node] = node.split('#')[1]
        knowledge_path_to_color[node] = get_color(node)

    nx.set_node_attributes(G, knowledge_path_to_short_name, "short-name")
    nx.set_node_attributes(G, knowledge_path_to_color, "color")
    # rename_mapping: Dict[str, str] = {}
    #
    # for knowledge_path in knowledge_path_to_knowledge_used.keys():
    #     print(f"\nold: {knowledge_path}\n new: {knowledge_path.split('#')[1]}")
    #     rename_mapping[knowledge_path] = knowledge_path.split('#')[1]
    #     # rename_mapping[knowledge_path] = "x"
    #
    # nx.relabel_nodes(G, rename_mapping, copy=False)


def generate_knowledge_graph(generated_directory):
    first_iteration = True
    for dir_path, sub_dir_names, file_names in walk(generated_directory):
        print(f"\n==== starting work on {dir_path} ====")

        directory_quality_score = 0

        for relative_file_path in file_names:
            full_path = os.path.join(dir_path, relative_file_path)

            is_html_file = relative_file_path[-4:] == "html"
            if is_html_file:
                print(f"{tab}checking quality of {full_path}")
                add_knowledge_to_graph_from_file(full_path)

        first_iteration = False
        print(f"==== done with {dir_path} ====\n")

    knowledge_graph = nx.DiGraph(knowledge_path_to_knowledge_used)
    add_metadata_to_nodes(knowledge_graph)
    show_graph(knowledge_graph)



if __name__ == "__main__":

    args = create_argparser_and_get_args()

    if args.base_dir and args.gen_dir: # good this is valid
        script_directory = os.path.dirname(os.path.realpath(__file__))
        generate_knowledge_graph(args.base_dir)
    else:
        print("Error: You must specify base-dir, gen-dir")
