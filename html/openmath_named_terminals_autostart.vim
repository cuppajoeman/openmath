call feedkeys(":terminal bash \\#building \<CR>", 'n')
call feedkeys("i cd ../scripts/precompiled_html_generation; source venv/bin/activate; ./continuous_build.sh \<CR>", 'n')
call feedkeys("\<C-\>\<C-n>", 'n')

call feedkeys(":terminal bash \\#webserver \<CR>", 'n')
call feedkeys("i cd ../generated_html/; py -m http.server \<CR>", 'n')
call feedkeys("\<C-\>\<C-n>", 'n')

call feedkeys(":terminal bash \\#genlink \<CR>", 'n')
call feedkeys("i cd ../scripts/openmath_cli; source venv/bin/activate; py generate_knowledge_link.py \<CR>", 'n')
call feedkeys("\<C-\>\<C-n>", 'n')

call feedkeys(":terminal bash \\#gendiv \<CR>", 'n')
call feedkeys("i cd ../scripts/openmath_cli; source venv/bin/activate; py generate_knowledge_div.py \<CR>", 'n')
call feedkeys("\<C-\>\<C-n>", 'n')
