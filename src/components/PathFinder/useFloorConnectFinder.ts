import type { Vector3 } from "three";
import type { WeightedGraph } from "./WeightedGraph";

export const useFloorConnectFinder = (
  map_conn_points: Map<string, Map<string, Vector3>>,
  graph: WeightedGraph
) => {
  // 找到起始地图到终点地图的所有路线，并过滤出最短路径
  const findNavPath = (
    start_floor: string,
    end_floor: string,
    start_pos: Vector3
  ) => {
    if (!map_conn_points.has(start_floor) || !map_conn_points.has(end_floor))
      return null;

    // const vertices = graph.getVertices();
    const paths: string[][] = [];
    let weight: Record<string, number> = {};

    for (const start_point of map_conn_points.get(start_floor)!.keys()) {
      for (const end_point of map_conn_points.get(end_floor)!.keys()) {
        const { shortest_paths, shortest_paths_weight } =
          graph.dijkstraAllShortestPaths(start_point, end_point);
        if (shortest_paths.length) {
          paths.push(...shortest_paths);
          weight = {
            ...weight,
            ...shortest_paths_weight,
          };
        }
      }
    }

    // 找到总权重最小的路径
    let min_path_weight = Infinity;
    for (const path in weight) {
      if (weight[path] < min_path_weight) {
        min_path_weight = weight[path];
      }
    }

    const filter_shortest_paths = paths.filter((path) => {
      return weight[path.join("_")] === min_path_weight;
    });

    // 找出距离起始坐标位置最近的连通点路径（优化体验）
    // let point_distance_to_start_pos = Infinity;
    // let distance_to_start_pos_path_key = "";
    // filter_shortest_paths.forEach(path => {
    // 	const distance = start_pos.distanceTo(vertices.get(path[0]) as Vector3);
    // 	if (distance < point_distance_to_start_pos) {
    // 		point_distance_to_start_pos = distance;
    // 		distance_to_start_pos_path_key = path.join("_");
    // 	}
    // });

    return filter_shortest_paths.map((path) => ({
      path,
      weight: min_path_weight,
      // nearest_to_current: path.join("_") === distance_to_start_pos_path_key
    }));
  };

  const getPathPointPosition = (path: string[]) => {
    const vertices = graph.getVertices();

    return path.map((key) => {
      return {
        key,
        pos: vertices.get(key) as Vector3,
      };
    });
  };

  // 根据连通点Key找到所属楼层
  const findFloorByKey = (key: string) => {
    for (const [floor_key, floor] of map_conn_points.entries()) {
      if (floor.has(key)) {
        return floor_key;
      }
    }
  };

  // 全部连通点Key所属楼层映射
  const getConnectPointKeyMap = () => {
    const map: Record<string, string> = {};

    for (const point_key of graph.getVertices().keys()) {
      // @ts-ignore
      map[point_key] = findFloorByKey(point_key);
    }

    return map;
  };

  return {
    findNavPath,
    getPathPointPosition,
    getConnectPointKeyMap,
  };
};
