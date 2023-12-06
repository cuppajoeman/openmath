{ pkgs }: {
  deps = [
    pkgs.vim
    pkgs.nodePackages.vscode-langservers-extracted
    pkgs.nodePackages.typescript-language-server  
  ];
}