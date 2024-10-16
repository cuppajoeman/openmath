#!/bin/bash
source generation_venv/bin/activate 
cd fast-html
python main.py --base-dir ../../../html/ --gen-dir ../../../generated_html --base-template-file ../templates/openmath_template.html --custom-template-conversion-file ../main.py 
