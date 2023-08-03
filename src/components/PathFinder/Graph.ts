import type {Vector3} from "three";

type Vertex = {
	key: string,
	pos: Vector3
}

// 节点列表
type Vertices = Map<string, Vector3>

// 邻接表
type AdjList = Map<string, string[]>

// 访问状态
const Status = {
	unknown: 0,
	visited: 1,
	finished: 2,
};

// 无权无向图
export class Graph {
	private readonly is_directed: boolean;
	private readonly vertices: Vertices;
	private readonly adj_list: AdjList;

	constructor(is_directed = false) {
		this.is_directed = is_directed;
		this.vertices = new Map();
		this.adj_list = new Map();
	}

	addVertex(v: Vertex) {
		if (!this.vertices.has(v.key)) {
			this.vertices.set(v.key, v.pos);
			this.adj_list.set(v.key, []);
		}
	}

	addEdge(v: string, w: string) {
		this.adj_list.get(v)?.push(w);

		if (!this.is_directed) {
			this.adj_list.get(w)?.push(v);
		}
	}

	getVertices() {
		return this.vertices;
	}

	getAdjList() {
		return this.adj_list;
	}

	// 获得所有节点相邻节点映射
	getConnectMap() {
		let map: Record<string, string> = {};

		for (const key of this.vertices.keys()) {
			map[key] = "";
			const neighbors = this.adj_list.get(key) as string[];
			for (const element of neighbors) {
				map[key] += `${element}、`;
			}
			map[key] = map[key].slice(0, map[key].length - 1);
		}

		return map;
	}

	// 广度优先遍历查询
	breadthFirstSearch(start_vertex: string, callback: (vertex: string) => any): void {
		const vertices = this.getVertices();
		const adj_list = this.getAdjList();

		// 将所有顶点状态重置
		const status = this.initializeStatus(vertices);

		const queue: string[] = [];
		queue.push(start_vertex);

		while (queue.length) {
			const u = queue.shift() as string;

			const neighbors = adj_list.get(u) as string[];

			status[u] = Status.visited;

			for (const element of neighbors) {
				const w = element;
				if (status[w] === Status.unknown) {
					status[w] = Status.visited;
					queue.push(w);
				}
			}

			status[u] = Status.finished;

			if (callback) {
				callback(u);
			}
		}
	}

	private initializeStatus(vertices: Vertices) {
		const vertices_status: {[key: string]: number} = {};

		for (const key of vertices.keys()) {
			vertices_status[key] = Status.unknown;
		}

		return vertices_status;
	}

	BFS(start: string, end: string) {
		// 创建一个队列用于存储待处理的节点
		const queue = [start];
		// 创建一个数组用于存储已访问过的节点
		const visited = new Set<string>();
		// 创建一个Map对象用于存储节点到其前一个节点的映射
		const predecessors = new Map<string, string>();

		// 当队列不为空时，循环处理队列中的节点
		while (queue.length > 0) {
			// 从队列中取出一个节点进行处理
			const current = queue.shift() as string;
			visited.add(current);

			// 如果当前节点是终点，说明已经找到了最短路径，可以退出循环
			if (current === end) {
				break;
			}

			// 遍历当前节点的所有邻居节点
			for (const neighbor of this.getAdjList().get(current) as string[]) {
				// 如果邻居节点还没有被访问过，则将其加入队列中
				if (!visited.has(neighbor)) {
					queue.push(neighbor);
					visited.add(neighbor);
					predecessors.set(neighbor, current);
				}
			}
		}

		// 如果没有找到终点，说明没有可达路径，返回空数组
		if (!predecessors.has(end)) {
			return [];
		}

		// 从终点开始回溯到起点，构建最短路径数组
		const path = [end];
		let current = end;
		while (current !== start) {
			const predecessor = predecessors.get(current) as string;
			path.unshift(predecessor);
			current = predecessor;
		}

		return path;
	}

	BFSAll(start: string, end: string) {
		// 创建一个队列用于存储待处理的节点
		const queue = [start];
		// 创建一个Map对象用于存储节点到起点的距离
		const distances = new Map<string, number>();
		// 创建一个Map对象用于存储节点到其前驱节点列表的映射
		const predecessors = new Map<string, string[]>();
		// 初始化起点的距离为0，并将其加入队列和已访问列表中
		distances.set(start, 0);
		predecessors.set(start, []);
		const visited = new Set([start]);

		// 当队列不为空时，循环处理队列中的节点
		while (queue.length > 0) {
			// 从队列中取出一个节点进行处理
			const current = queue.shift() as string;

			// 遍历当前节点的所有邻居节点
			for (const neighbor of this.getAdjList().get(current) as string[]) {
				// 如果邻居节点还没有被访问过，则将其加入队列中，并更新其距离和前驱节点列表
				if (!visited.has(neighbor)) {
					queue.push(neighbor);
					visited.add(neighbor);
					// 更新邻居节点的距离和前驱节点列表
					const distance = distances.get(current) as number + 1;
					distances.set(neighbor, distance);
					predecessors.set(neighbor, [current]);
				} else {
					// 如果邻居节点已经被访问过，比较新的距离和原有距离的大小
					const distance = distances.get(current) as number + 1;
					if (distance === distances.get(neighbor)) { // 如果相等，将当前节点添加到其前驱节点列表中
						(predecessors.get(neighbor) as string[]).push(current);
					} else if (distance < (distances.get(neighbor) as number)) { // 如果新的距离更小，则更新距离和前驱节点列表
						distances.set(neighbor, distance);
						predecessors.set(neighbor, [current]);
					}
				}
			}
		}

		// 如果终点不可达，返回空数组
		if (!predecessors.has(end)) {
			return [];
		}

		// 从终点开始回溯到起点，构建所有的最短路径
		const paths: string[][] = [];
		backtrack(end, start, []);
		return paths;

		// 回溯路径的函数
		function backtrack(current: string, target: string, path: string[]) {
			path.unshift(current);
			if (current === target) {
				paths.push(path.slice());
			} else {
				for (const predecessor of (predecessors.get(current) as string[])) {
					backtrack(predecessor, target, path);
				}
			}
			path.shift();
		}
	}
}
