const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const mathjax = require('mathjax-node');

mathjax.config({
    MathJax: {
        tex: { packages: ['base'] },
        svg: { fontCache: 'global' }
    }
});

mathjax.start();

// Check if verbose mode is enabled from command-line arguments
const verbose = process.argv.includes('--verbose');

function getLineNumber(inputHtml, searchIndex) {
    const lines = inputHtml.slice(0, searchIndex).split('\n');
    return lines.length;
}

async function convertMathToMathML(inputFile, outputFile) {
    try {
        let htmlContent = fs.readFileSync(inputFile, 'utf8');

        // Regular expressions to match LaTeX
        const inlineMathRegex = /\\\((.*?)\\\)/gs; // Matches \( ... \)
        const displayMathRegex = /\\\[(.*?)\\\]/gs; // Matches \[ ... \]

        let conversions = [];
        let replacements = [];

        // Function to handle conversion and error reporting
        function handleConversion(tex, format, originalMatch, matchStartIndex) {
            return new Promise((resolve, reject) => {
                mathjax.typeset({
                    math: tex,
                    format: format,
                    mml: true
                }, function (data) {
                    if (data.errors) {
                        const lineNumber = getLineNumber(htmlContent, matchStartIndex);

                        console.error(`Error in file: ${inputFile}`);
                        console.error(`Line Number: ${lineNumber}`);
                        console.error(`LaTeX Source: ${tex}`);
                        console.error(`Error: ${data.errors}`);
                        reject(data.errors);
                    } else {
                        const mathML = `<math xmlns="http://www.w3.org/1998/Math/MathML">${data.mml}</math>`;
                        if (verbose) {
                            const lineNumber = getLineNumber(htmlContent, matchStartIndex);
                            console.log(`Converted LaTeX (line ${lineNumber}): ${tex}`);
                            console.log(`MathML: ${mathML}`);
                        }
                        resolve({ start: matchStartIndex, length: originalMatch.length, replacement: mathML });
                    }
                });
            });
        }

        // Function to process LaTeX matches
        function processMathMatches(regex, format) {
            let match;
            while ((match = regex.exec(htmlContent)) !== null) {
                const [fullMatch, tex] = match;
                const matchStartIndex = match.index;
                conversions.push(handleConversion(tex, format, fullMatch, matchStartIndex));
            }
        }

        // Process inline and display math
        processMathMatches(inlineMathRegex, 'inline-TeX');
        processMathMatches(displayMathRegex, 'TeX');

        // Wait for all conversions to finish and collect replacements
        const results = await Promise.all(conversions.map(p => p.catch(e => {
            console.error('Conversion failed:', e);
            return null; // Continue processing other conversions
        })));
        
        results.forEach(result => {
            if (result) {
                replacements.push(result);
            }
        });

        // Sort replacements in reverse order of starting index
        replacements.sort((a, b) => b.start - a.start);

        // Apply replacements in reverse order
        replacements.forEach(({ start, length, replacement }) => {
            htmlContent = htmlContent.substring(0, start) + replacement + htmlContent.substring(start + length);
        });

        // Write the updated content to the output file without re-parsing the HTML content
        fs.writeFileSync(outputFile, htmlContent);
        console.log('Conversion complete. Output saved to', outputFile);
    } catch (error) {
        console.error('Failed to process file:', error);
    }
}

function processHtmlFiles(sourceDir, generatedDir, excludedDirs = []) {
    if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true });
    }

    fs.readdirSync(sourceDir).forEach((file) => {
        const sourceFilePath = path.join(sourceDir, file);
        const generatedFilePath = path.join(generatedDir, file);

        if (fs.lstatSync(sourceFilePath).isDirectory()) {
            if (excludedDirs.includes(file)) {
                console.log(`Skipping directory: ${file}`);
                return; // Skip this directory
            }
            // Recursively process subdirectories
            processHtmlFiles(sourceFilePath, generatedFilePath, excludedDirs);
        } else {
            // Copy the file to the generated directory
            fs.copyFileSync(sourceFilePath, generatedFilePath);

            // Process the file if it's an HTML file
            if (path.extname(file) === '.html') {
                convertMathToMathML(sourceFilePath, generatedFilePath).catch(error => {
                    console.error(`Failed to process file ${sourceFilePath}:`, error);
                });
            }
        }
    });
}

// Example usage
const sourceDirectory = '../../html';
const generatedDirectory = '../../generated';
const excludedDirectories = ['searching']; // Add directory names to exclude

processHtmlFiles(sourceDirectory, generatedDirectory, excludedDirectories);
