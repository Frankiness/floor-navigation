import { Vector3 } from "three";
import { WeightedGraph } from "./WeightedGraph";

export const initConnectPoint = () => {
  // 地图对应的可出入连通点
  const map_conn_points: Map<string, Map<string, Vector3>> = new Map([
    [
      "floor_9",
      new Map([
        ["A", new Vector3(5.5, 0, 0)],
        ["B", new Vector3(18, 0, 0)],
        ["C", new Vector3(19, 0, -5)],
      ]),
    ],
    [
      "floor_10",
      new Map([
        ["D", new Vector3(-6, 0, 0)],
        ["E", new Vector3(4, 0, -10)],
      ]),
    ],
    [
      "out",
      new Map([
        ["F", new Vector3(19.5, 0, -5)],
        ["G", new Vector3(5.5, 0, 0)],
      ]),
    ],
  ]);

  const graph = new WeightedGraph(false);

  map_conn_points.forEach((points) => {
    points.forEach((point, point_key) => {
      graph.addVertex({ key: point_key, pos: point });
    });
  });

  graph.addEdge("A", "D", 2);
  graph.addEdge("B", "D", 1);
  graph.addEdge("C", "D", 1);
  graph.addEdge("C", "E", 2);
  graph.addEdge("D", "E", 1);
  graph.addEdge("E", "F", 2);
  graph.addEdge("E", "G", 1);

  return {
    map_conn_points,
    graph,
  };
};
