import type {InjectionKey} from "vue";
import type {initConnectPoint} from "@/components/PathFinder/initConnectPoint";

// 地图连接点和图结构的Inject Key
export const connect_point_inject_key: InjectionKey<{
	map_conn_points: ReturnType<typeof initConnectPoint>["map_conn_points"],
	graph: ReturnType<typeof initConnectPoint>["graph"],
}> = Symbol();
