#!/bin/bash

# Function to install fzf
install_fzf() {
  echo "Installing fzf..."
  git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf
  yes | ~/.fzf/install
}

# Check if fzf is installed
if ! command -v fzf &> /dev/null; then
  install_fzf
else
  echo "fzf is already installed."
fi

# Check if BeautifulSoup and latex2mathml are installed
if ! python3 -c "import bs4, latex2mathml" &> /dev/null; then
  echo "Installing necessary dependencies: BeautifulSoup4, latex2mathml"
  pip install beautifulsoup4 latex2mathml
else
  echo "Dependencies are already installed."
fi
