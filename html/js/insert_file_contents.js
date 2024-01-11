/*
 Note that this requires the library highlight.js
 */
async function fetch_file_contents(url) {
    return await fetch(url).then(res => res.text());
}

async function create_supporting_html(file_path, file_name, file_extension) {
    let fieldset_element = document.createElement("fieldset")
    let legend_element = document.createElement("legend")
    let source_code_a= document.createElement("a")

    source_code_a.innerHTML = file_name;
    source_code_a.href = file_path;
    legend_element.appendChild(source_code_a)
    fieldset_element.appendChild(legend_element)

    let pre_element = document.createElement("pre");
    let code_element = document.createElement("code");

    code_element.classList.add("language-" + file_extension);
    code_element.innerHTML = await fetch_file_contents(file_path);
    pre_element.appendChild(code_element)

    hljs.highlightElement(code_element);

    fieldset_element.appendChild(pre_element)

    return fieldset_element
}

async function insert_file_contents() {
    let query_class = "code-file";
    let results = document.getElementsByClassName(query_class);

    for (let i = 0; i < results.length; i++) {
        let element = results.item(i);

        let file_path = element.dataset.fileName;
        let file_name = file_path.substring(file_path.lastIndexOf("/") + 1)
        let file_extension = file_path.substring(file_path.lastIndexOf(".") + 1)

        let supporting_html = await create_supporting_html(file_path, file_name, file_extension)

        element.appendChild(supporting_html);
    }
}

window.addEventListener('load', function () {
    insert_file_contents();
})