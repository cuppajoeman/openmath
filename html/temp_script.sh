#!/bin/bash

# Function to process files
process_file() {
    local file="$1"
    # Use sed to replace &gt with \gt and &lt with \lt
    sed -i.bak -e 's/&gt;/\\gt;/g' -e 's/&lt;/\\lt;/g' "$file"
    # Remove the backup file created by sed
    rm "$file.bak"
}

export -f process_file

# Find all HTML files and process them
find . -type f -name "*.html" -exec bash -c 'process_file "$0"' {} \;

echo "Processing complete."
