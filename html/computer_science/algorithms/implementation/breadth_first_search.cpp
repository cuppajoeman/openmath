#include <vector>
#include <list>
#include <assert.h>
#include <iostream>

/**
 * \brief A graph that can never change size, 
 * each node is referenced by a number which is it's index
 * edges are represented using an adjacency list
 *
 * \note node_to_connected_nodes cannot be an array because we 
 * don't know it's size at compile time
 */
class StaticGraph {
	public:

		int num_vertices;
		std::vector<std::list<int>> node_to_connected_nodes; 

		StaticGraph(int num_vertices);

		void add_edge(int node_a, int node_b);

		bool valid_edge(int node);
};

/**
 * \post the graph has enough capacity
 */
StaticGraph::StaticGraph(int num_vertices) {
	this->num_vertices = num_vertices;
	this->node_to_connected_nodes.resize(num_vertices);
}

bool StaticGraph::valid_edge(int node) {
	return 0 <= node && node < this->num_vertices;
}

/**
 * \brief adds an edge to the graph, we require that 
 * node_a and node_b be valid indices for the graph
 *
 * \note we don't add duplicate connections
 *
 * \pre node_to_connected_nodes must have enough capacity
 */
void StaticGraph::add_edge(int node_a, int node_b) {
	assert(this->valid_edge(node_a) && this->valid_edge(node_b));

	assert(this->node_to_connected_nodes.capacity() == this->num_vertices);
	node_to_connected_nodes[node_a].push_back(node_b);
}


void breadth_first_traversal(StaticGraph *graph, int node_to_explore) {

	// all nodes are not explored
	bool node_has_been_visited[graph->num_vertices] = {false};
	std::list<int> nodes_to_explore_next;

	// bootstrap the process
	node_has_been_visited[node_to_explore] = true;
	nodes_to_explore_next.push_back(node_to_explore);

	while (!nodes_to_explore_next.empty()) {
		node_to_explore = nodes_to_explore_next.front();
		std::cout << node_to_explore << " ";
		nodes_to_explore_next.pop_front();

		for (int connected_node : graph->node_to_connected_nodes[node_to_explore]) {
			if (!node_has_been_visited[connected_node]) {
				node_has_been_visited[connected_node] = true;
				nodes_to_explore_next.push_back(connected_node);
			}
		}
	}
}

int main() {

    StaticGraph g(4);
    g.add_edge(0, 1);
    g.add_edge(0, 2);
    g.add_edge(1, 2);
    g.add_edge(2, 0);
    g.add_edge(2, 3);
    g.add_edge(3, 3);
 
	std::cout << "Following is Breadth First Traversal "
         << "(starting from vertex 2) \n";

	breadth_first_traversal(&g, 2);

	return 0;
}

