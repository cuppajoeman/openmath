#!/bin/bash

# Check if BeautifulSoup and latex2mathml are installed
if ! python3 -c "import bs4, latex2mathml" &> /dev/null; then
  echo "Installing necessary dependencies: BeautifulSoup4, latex2mathml, pyperclip"
  pip install beautifulsoup4 latex2mathml pyperclip
else
  echo "Dependencies are already installed."
fi
