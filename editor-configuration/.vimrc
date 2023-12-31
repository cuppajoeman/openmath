call plug#begin()

Plug 'SirVer/ultisnips' " snippets for editing quickly
Plug 'preservim/nerdtree' " sidebar for files

call plug#end()

let mapleader = ' '

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

" nerdtree mappings
nnoremap <leader>n :NERDTreeFocus<CR>
nnoremap <C-n> :NERDTree<CR>
nnoremap <C-t> :NERDTreeToggle<CR>
nnoremap <C-f> :NERDTreeFind<CR>

" keep the active line centered in the middle of the screen
nnoremap k kzz
nnoremap j jzz

" Return to last edit position when opening files (You want this!)
autocmd BufReadPost *
     \ if line("'\"") > 0 && line("'\"") <= line("$") |
     \   exe "normal! g`\"" |
     \ endif
