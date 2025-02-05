#!/bin/bash

# Source directory to sync
SOURCE_DIR="generated_html"
# Remote destination inside the user's home directory
DESTINATION="cjm@104.131.10.102:~/rsynced_stuff"
# Interval in seconds
INTERVAL=5

# Ensure rsync is installed
if ! command -v rsync &>/dev/null; then
  echo "Error: rsync is not installed. Please install rsync and try again."
  exit 1
fi

# Sync in an infinite loop
while true; do
  echo "Starting rsync at $(date)"
  rsync -av --delete "$SOURCE_DIR" "$DESTINATION"

  # Bright green success message
  echo -e "\033[1;32mSync completed successfully.\033[0m"

  # Wait for the specified interval
  sleep "$INTERVAL"
done
