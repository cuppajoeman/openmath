const AsciiMathParser = require('asciimath2tex');
const parser = new AsciiMathParser();

var asciimath_TODO_and_script_string = /\<\!\-\- TODO remove asciimath dependency once everything has been converted to Mathjax 3 \-\-\>[\r\n]+([^\r\n]+)/

const fs = require('fs');

var dir = require('node-dir');

function am_to_mj(match) {
    const cleaned_match = match.replace(/`/g, "").trim();
    const converted = parser.parse(cleaned_match);
    const convert_in_mathjax = "\\( " + converted + " \\)"
    // console.log(cleaned_match, "->", converted)
    return convert_in_mathjax;
}

dir.readFiles("../../html_test", 
    {match: /.html$/},

    function(err, content, filename, next) {
        console.log('processing content of file', filename);
        // const replaced = content.replace(/`(.*?)`/g, am_to_mj);
        // console.log(content.match(asciimath_TODO_and_script_string))
        const replaced = content.replace(asciimath_TODO_and_script_string, "");
        console.log(replaced);
        fs.writeFile(filename,replaced,{encoding:'utf8'},
            function(){
                console.log('OK '+filename);
            });
        next();
    });


// dir.readFiles("../../html",
//     function(err, content, next) {
//         if (err) throw err;
//         console.log('content:', content);
//         next();
//     },
//     function(err, files){
//         if (err) throw err;
//         console.log('finished reading files:', files);
//     });