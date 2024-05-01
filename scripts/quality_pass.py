import argparse 
import shutil
import os
from bs4 import BeautifulSoup
from os import walk
from typing import List

tab = "    "

def create_argparser_and_get_args():
    parser = argparse.ArgumentParser(prog="om-quality-pass", description="Filters out files which don't pass the quality checks, also generates a file which states which files were filtered and why.", epilog="visit www.openmath.net for more information")

    parser.add_argument("--base-dir", help="the base directory which fast-html will recursively operate on, path is relative to the fast-html directory")
    parser.add_argument("--gen-dir", help="the directory that fast-html will output the modified files, path is relative to the fast-html directory")

    args = parser.parse_args()
    return args

def re_create_generated_directory(content_directory, generated_directory):
    if os.path.exists(generated_directory):
        shutil.rmtree(generated_directory)
    shutil.copytree(content_directory, generated_directory)

def get_end_of_path(path):
    return os.path.basename(os.path.normpath(path))

def run_quality_check(html_file_path):
    html_file_contents = open(html_file_path).read()
    parsed_html = BeautifulSoup(html_file_contents, 'html.parser')
    types_of_knowledge = ['definition', 'theorem', 'proposition', 'lemma', 'corollary', 'exercise']
    knowledge_types_that_requires_proof = ['theorem', 'proposition', 'lemma', 'corollary', 'exercise']

    # all_knowledges_in_file = parsed_html.find_all("div", class_="knowledge")
    all_knowledge_in_file = parsed_html.find_all(True, {'class': types_of_knowledge})

    # it's important that files stay small so that they're not overwhelming and loading other content through knowledge links is not slow.
    knowledge_quantity = len(all_knowledge_in_file)

    if knowledge_quantity >= 10:
        print(f"{tab * 3}- contains an excessive amount of knowledge elements with {knowledge_quantity} elements")

    knowledge_that_requires_proof = parsed_html.find_all(True, {'class': knowledge_types_that_requires_proof})

    for knowledge in knowledge_that_requires_proof:

        print(f"\n{tab * 2}======= verifying quality of the following knowledge =======")
        # print(knowledge)
        print(f"{tab * 2}======= QUALITY RESULTS =======")


        if knowledge.get('id') is None: # missing id
            print(f"{tab * 3}- it's missing an id")
        else:
            print(f"{tab * 3}ID: {knowledge.get('id')}")

        proofs = knowledge.find_all(True, {'class': 'proof'})

        if len(proofs) == 0:
            print(f"{tab * 3}- it doesn't have a proof tag")
        elif len(proofs) == 1:
            proof = proofs[0]
            proof_inner_html = str(proof.encode_contents().strip())
            print(proof_inner_html)
            if "TODO" in proof_inner_html:
                print(f"{tab * 3}- the proof is incomplete, it contains a TODO")
            if len(proof_inner_html) <= 10:
                print(f"{tab * 3}- the proof's length is quite short, make sure it's not missing anything")
            if len(proof_inner_html) >= 2000:
                print(f"{tab * 3}- the proof is long with a size of {len(proof_inner_html)} chars")


def run_quality_pass(generated_directory):
    first_iteration = True
    for dir_path, sub_dir_names, file_names in walk(generated_directory):
        print(f"\n==== starting work on {dir_path} ====")

        directory_quality_score = 0

        for relative_file_path in file_names:
            full_path = os.path.join(dir_path, relative_file_path)

            is_html_file = relative_file_path[-4:] == "html"
            if is_html_file:
                print(f"{tab}checking quality of {full_path}")
                run_quality_check(full_path)

        first_iteration = False
        print(f"==== done with {dir_path} ====\n")


if __name__ == "__main__":

    args = create_argparser_and_get_args()

    if args.base_dir and args.gen_dir: # good this is valid
        script_directory = os.path.dirname(os.path.realpath(__file__))
        re_create_generated_directory(args.base_dir, args.gen_dir)
        run_quality_pass(args.gen_dir)
    else:
        print("Error: You must specify base-dir, gen-dir")
