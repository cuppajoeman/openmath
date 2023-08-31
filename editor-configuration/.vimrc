call plug#begin()

Plug 'SirVer/ultisnips' " snippets for editing quickly
Plug 'preservim/nerdtree' " sidebar for files

call plug#end()

function! AsciiMathHighlight()
    " Block math. Look for "$$[anything]$$"
    syn region ascii_math start='`' end='`'

    "" highlight the regions
    hi link ascii_math Statement
endfunction

autocmd BufRead,BufNewFile,BufEnter *.html call AsciiMathHighlight()

" set tabs correctly
set tabstop=4
set shiftwidth=4 smarttab

" Simple ultisnips triggers 
let g:UltiSnipsExpandTrigger="<tab>"                                            
let g:UltiSnipsJumpForwardTrigger="<tab>"                                       
let g:UltiSnipsJumpBackwardTrigger="<s-tab>"                                    

