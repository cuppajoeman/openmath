#!/bin/bash

# Open first terminal (named ws) and start the HTTP server
code --new-window --command workbench.action.terminal.newWithProfile --args webserver

# Open second terminal (named fast-html) and run the continuous build script
code --new-window --command workbench.action.terminal.newWithProfile --args fast_html

# Open third terminal (named gendiv) and run the generate_knowledge_div.py script
code --new-window --command workbench.action.terminal.newWithProfile --args gendiv

# Open fourth terminal (named genlink) and run the generate_knowledge_link.py script
code --new-window --command workbench.action.terminal.newWithProfile --args genlink
