import type {Vector3, BufferGeometry, Mesh, MeshBasicMaterial} from "three";
import type {useFloorConnectFinder} from "@/components/PathFinder/useFloorConnectFinder";

export const formatCoordinate = (v: Vector3) => {
	return `x:${v.x.toFixed(1)}，y:${v.y.toFixed(1)}，z:${v.z.toFixed(1)}`;
};

export const isMesh = (obj: unknown): obj is Mesh<BufferGeometry, MeshBasicMaterial> => {
	return typeof obj === "object" && obj !== null && "isMesh" in obj;
};

export const getRandomIntInclusive = (min: number, max: number) => {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min; // 含最大值，含最小值
};

export const isMultiFloorNavPath = (path: unknown): path is ReturnType<ReturnType<typeof useFloorConnectFinder>["findNavPath"]> => {
	return !!(typeof path === "object" && path !== null && Array.isArray(path));
};
