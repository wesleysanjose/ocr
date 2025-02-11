#!/bin/bash

# Initialize an empty variable to hold all the content
ALL_CONTENT=""

# Print to console that file processing is starting
echo "Processing files found in the current directory and subdirectories, excluding 'lib' folder."

# Loop through each .js, .html, and .json file in the directory recursively using process substitution
while read -r file; do
    # Extract filename for header
    filename=$(basename -- "$file")

    # Log the current file being processed
    echo "Found file: $file"

    # Read the content of the file and format it
    file_content=$(cat "$file")
    ALL_CONTENT+="${filename} content: \n $file_content;\n\n"
done < <(find . -type f \( -name '*.js' -o -name '*.html' -o -name '*.py' \) ! -path './lib/*')

# Copy all content to the macOS clipboard
echo "$ALL_CONTENT" | pbcopy

echo "Content copied to clipboard."

