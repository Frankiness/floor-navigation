import type {Vector3} from "three";

type AdjacentList = Map<string, Map<string, number>>;

type VertexPosition = {x: number, y: number, z: number} | Vector3;

type Vertices = Map<string, VertexPosition>;

export class WeightedGraph {
	private readonly is_directed: boolean;
	private adj_list: AdjacentList;
	private readonly vertices: Vertices;

	constructor(is_directed = true) {
		this.is_directed = is_directed;

		this.adj_list = new Map();

		this.vertices = new Map();
	}

	addVertex(vertex: {key: string, pos: VertexPosition}): void {
		if (!this.adj_list.has(vertex.key)) {
			this.adj_list.set(vertex.key, new Map<string, number>());
			this.vertices.set(vertex.key, vertex.pos);
		}
	}

	addEdge(vertex1: string, vertex2: string, weight: number): void {
		this.adj_list.get(vertex1)!.set(vertex2, weight);
		if (!this.is_directed) {
			this.adj_list.get(vertex2)!.set(vertex1, weight);
		}
	}

	toString() {
		let s = "";

		this.adj_list.forEach((val,  key) => {
			s += `${key}: \n`;
			val.forEach((weight, key) => {
				s += `\t-> ${key}: ${weight} \n`;
			});
			s += "\n";
		});

		return s;
	}

	getVertices() {
		return this.vertices;
	}

	getAdjList() {
		return this.adj_list;
	}

	dijkstra(start_node: string): Map<string, number> {
		const distances = new Map<string, number>();
		const visited = new Set<string>();
		const queue = new Map<string, number>();

		// 初始化起始节点到其他节点的距离，起始节点为0，其余为Infinity
		for (const vertex of this.adj_list.keys()) {
			distances.set(vertex, Infinity);
		}
		distances.set(start_node, 0);

		// 将起始节点加入队列
		queue.set(start_node, 0);

		while (queue.size > 0) {
			const [current_node, current_distance] = this.getShortestDistanceNode(queue);
			visited.add(current_node);

			// 更新当前节点相邻节点的最短距离
			for (const [neighbor_node, weight] of this.adj_list.get(current_node)!) {
				const distance = current_distance + weight;
				if (distance < distances.get(neighbor_node)!) {
					distances.set(neighbor_node, distance);
				}

				// 如果相邻节点未被访问过，则加入队列
				if (!visited.has(neighbor_node)) {
					queue.set(neighbor_node, distances.get(neighbor_node)!);
				}
			}
		}

		return distances;
	}

	private getShortestDistanceNode(queue: Map<string, number>): [string, number] {
		const entries = Array.from(queue.entries());
		const shortest_distance_entry = entries.reduce((min_entry, entry) => {
			return entry[1] < min_entry[1] ? entry : min_entry;
		}, entries[0]);
		queue.delete(shortest_distance_entry[0]);
		return shortest_distance_entry as [string, number];
	}

	dfsAllShortestPaths(start_node: string, end_node: string): string[][] {
		const paths: string[][] = [];
		const visited = new Set<string>();

		const dfs = (current_node: string, current_path: string[], current_distance: number) => {
			if (current_node === end_node) {
				if (current_distance === this.dijkstra(start_node).get(end_node)) {
					paths.push(current_path);
				}
				return;
			}

			visited.add(current_node);
			for (const [neighbor_node, weight] of this.adj_list.get(current_node)!) {
				if (!visited.has(neighbor_node)) {
					const distance = current_distance + weight;
					const new_path = [...current_path, neighbor_node];
					dfs(neighbor_node, new_path, distance);
				}
			}
			visited.delete(current_node);
		};

		dfs(start_node, [start_node], 0);

		return paths;
	}

	dijkstraAllShortestPaths(start_node: string, end_node: string): {shortest_paths: string[][], shortest_paths_weight: Record<string, number>} {
		const visited = new Set<string>();

		const predecessors = new Map<string, string[]>();
		const distances = new Map<string, number>();
		// 将所有节点的距离初始化为无穷大，并初始化全部节点的前置节点
		for (const vertex of this.adj_list.keys()) {
			predecessors.set(vertex, []);
			distances.set(vertex, Infinity);
		}
		// 设置起始节点距离为0。
		distances.set(start_node, 0);

		while (visited.size < this.adj_list.size) {
			let min_distance = Infinity;
			let min_node: string | undefined = undefined;
			// 每一轮都从未被访问过的节点里找出最小距离的节点
			for (const [node, distance] of distances) {
				if (!visited.has(node) && distance < min_distance) {
					min_distance = distance;
					min_node = node;
				}
			}

			if (min_node === undefined) {
				break;
			} else {
				// 找到最小距离的节点后标记访问该节点的相邻节点
				visited.add(min_node);
				for (const [neighbor_node, weight] of this.adj_list.get(min_node)!) {
					if (!visited.has(neighbor_node)) {
						const distance = min_distance + weight;
						if (distance < distances.get(neighbor_node)!) {
							distances.set(neighbor_node, distance);
							predecessors.set(neighbor_node, [min_node]);
						} else if (distance === distances.get(neighbor_node)!) {
							predecessors.get(neighbor_node)!.push(min_node);
						}
					}
				}
			}
		}

		const shortest_paths: string[][] = [];
		const dfs = (current_node: string, current_path: string[]) => {
			if (current_node === start_node) {
				shortest_paths.push(current_path.reverse());
				return;
			}
			for (const predecessor of predecessors.get(current_node)!) {
				dfs(predecessor, [...current_path, predecessor]);
			}
		};

		for (const predecessor of predecessors.get(end_node)!) {
			dfs(predecessor, [end_node, predecessor]);
		}

		const shortest_paths_weight: Record<string, number> = {};
		shortest_paths.forEach(path => {
			// @ts-ignore
			shortest_paths_weight[path.join("_")] = distances.get(end_node);
		});

		return {
			shortest_paths_weight,
			shortest_paths
		};
	}
}
