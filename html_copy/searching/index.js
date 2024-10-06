function search(content) {

	var searchResults = document.getElementById("search_results")
	searchResults.innerHTML = ''; // Reset the search
	var ul = document.createElement('ul');
	searchResults.appendChild(ul);

	const results = fuzzysort.go(content, knowledge_ids)
	console.log(results)

	for (let result of results) {
		li = document.createElement('li');

		a = document.createElement('a');
		a.title = result.target
		a.href = knowledge_id_to_relative_path[result.target]

		a.appendChild(document.createTextNode(result.target))
		li.appendChild(a);
		ul.appendChild(li);
	}
}
