import shutil
import os
import platform

script_directory = os.path.dirname(os.path.realpath(__file__))
os.chdir("../editor-configuration")
editor_configuration_directory = os.getcwd()

root_directory = "~"

root_vim_directory = root_directory + ("/.vim" if platform.system == "Linux" else "/vimfiles")

relative_ultisnips_directory = "/.vim/UltiSnips"
relative_nerdtree_plugin_directory = "/.vim/nerdtree_plugin"

root_ultisnips_directory = os.path.expanduser(root_vim_directory + "/UltiSnips")
root_nerdtree_plugin_directory = os.path.expanduser(root_vim_directory + "/nerdtree_plugin")

os.makedirs(root_ultisnips_directory, exist_ok=True)
os.makedirs(root_nerdtree_plugin_directory, exist_ok=True)


shutil.copy(editor_configuration_directory + "/.vimrc", os.path.expanduser(root_directory + "/.vimrc"))

shutil.copy(
    editor_configuration_directory + relative_ultisnips_directory + "/html.snippets",
    root_ultisnips_directory + "/html.snippets"
)

shutil.copy(
    editor_configuration_directory + relative_nerdtree_plugin_directory + "/yank_mapping.vim",
    root_nerdtree_plugin_directory + "/yank_mapping.vim"
)



