import {
	BufferGeometry,
	CanvasTexture,
	CylinderGeometry,
	DoubleSide,
	Mesh,
	MeshBasicMaterial,
	RepeatWrapping,
	Scene,
	SphereGeometry,
	Sprite,
	SpriteMaterial, StaticDrawUsage,
	Texture, Vector2,
	Vector3
} from "three";
// import {Line2} from "three/examples/jsm/lines/Line2";
// import {LineGeometry} from "three/examples/jsm/lines/LineGeometry";
// import {LineMaterial} from "three/examples/jsm/lines/LineMaterial";
// @ts-ignore
// import {MeshLine, MeshLineMaterial} from "../hooks/MeshLine";
// @ts-ignore
import {PathPointList, PathGeometry} from "three.path";
import type {ColorRepresentation} from "three/src/utils";
import {CSS2DObject} from "three/examples/jsm/renderers/CSS2DRenderer";
import type {WeightedGraph} from "@/components/PathFinder/WeightedGraph";

export const createSphere = (radius: number, color: ColorRepresentation, position: Vector3) => {
	const sphere = new Mesh(
		new SphereGeometry(radius),
		new MeshBasicMaterial({color})
	);
	sphere.position.copy(position);
	sphere.name = "sphere";

	return sphere;
};

export const createSprite = (text: string, position: Vector3, offsetY: number, transparent_bg = false) => {
	const canvas = document.createElement("canvas");
	canvas.width = 2048;
	canvas.height = 1024;

	const context = canvas.getContext("2d") as CanvasRenderingContext2D;
	context.fillStyle = `rgba(255, 255, 255, ${transparent_bg ? 0 : 0.9})`;
	context.fillRect(0, 256, 2048, 512);
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.font = "bold 250px sans-serif";
	context.fillStyle = "rgba(230, 115, 0, 1)";
	context.fillText(text, canvas.width / 2, canvas.height / 2);

	const texture = new CanvasTexture(canvas);

	const material = new SpriteMaterial({
		map: texture,
	});

	const sprite = new Sprite(material);
	sprite.position.copy(position);
	sprite.name = "sprite";
	sprite.translateY(offsetY);

	return sprite;
};

export const createImgSprite = (texture: Texture, position: Vector3, offsetY: number, scale: number = 1) => {
	const material = new SpriteMaterial({
		map: texture,
		sizeAttenuation: false, // 不会被相机深度所衰减
		depthTest: false // 关闭深度测试，不会被其他mesh遮挡
	});

	const sprite = new Sprite(material);
	sprite.position.copy(position);
	sprite.name = "sprite";
	sprite.translateY(offsetY);

	sprite.scale.set(scale, scale, scale);
	return sprite;
};

export const createCylinder = (position: Vector3, cycle_light_texture: Texture) => {
	const cylinder = new Mesh(
		new CylinderGeometry(0.5, 0.5, 1, 32, 32, true),
		new MeshBasicMaterial({map: cycle_light_texture, side: DoubleSide, transparent: true, opacity: 0.5})
	);
	cylinder.position.copy(position);
	cylinder.translateY(0.5);

	return cylinder;
};

export const createCSSLabel = (text: string, position: Vector3, offsetY: number) => {
	const div = document.createElement("div");
	div.className = "css-label";
	div.innerHTML = text;
	div.style.cssText = `
		padding: 4px 10px;
		text-align: center;
		background: rgba(0, 0, 0, 0.4);
		color: #eee;
	`;

	const css_label = new CSS2DObject(div);
	css_label.position.copy(position);
	css_label.translateY(offsetY);

	return css_label;
};

export const createLine = (line_arr: Vector3[], track_width: number, track_color: number | string, offset_y: number = 1, texture: Texture) => {
	// const line_geometry = new LineGeometry();
	//
	// line_geometry.setPositions(line_arr);
	//
	// const line_material = new LineMaterial({
	// 	color: track_color ? new Color(track_color).getHex() : new Color(Math.random(), Math.random(), Math.random()).getHex(),
	// 	linewidth: track_width,
	// });
	// line_material.worldUnits = true; // 防止缩小后的线条尺寸问题
	// line_material.resolution.set(window.innerWidth, window.innerHeight);
	// const line = new Line2(line_geometry, line_material);
	// line.computeLineDistances();
	// line.position.y += offset_y;
	// return line;

	/* const geometry = new BufferGeometry().setFromPoints(line_arr);
	const line = new MeshLine();
	line.setGeometry(geometry);

	texture.wrapS = RepeatWrapping;
	texture.repeat.set(line_arr.length * 8, 1);
	const material = new MeshLineMaterial({
		// color: 0xff9900,
		lineWidth: 0.4,
		map: texture,
		useMap: 1
	});
	material.uniforms.repeat.value = new Vector2(line_arr.length * 8, 1);
	const line_mesh = new Mesh(line, material);
	line_mesh.position.y += offset_y;*/

	texture.wrapS = texture.wrapT = RepeatWrapping;
	const list = new PathPointList();
	list.set(line_arr, 0.1, 10, undefined, false);

	// Init by data
	const geometry = new PathGeometry({
		pathPointList: list,
		options: {
			width: 0.35, // default is 0.1
			arrow: false, // default is true
			progress: 1, // default is 1
			side: "both" // "left"/"right"/"both", default is "both"
		},
		usage: StaticDrawUsage // geometry usage
	}, false);

	const line_mesh = new Mesh(
		geometry,
		new MeshBasicMaterial({
			map: texture,
			// color: 0xff9900,
			depthTest: true,
			depthWrite: false
		})
	);
	// line_mesh.position.y += 1;

	return line_mesh;
};

export const useConnectPoint = (scene: Scene) => {
	// 当前地图所有的连通点指引元素
	const cur_connect_points_labels: ReturnType<typeof createCSSLabel>[] = [];
	const cur_connect_points_cylinder: ReturnType<typeof createCylinder>[] = [];

	// 移除上一轮的连通点物体
	const removeConnectPoint = () => {
		if (cur_connect_points_labels.length) {
			cur_connect_points_labels.forEach(label => {
				scene.remove(label);
			});
			cur_connect_points_cylinder.forEach(cylinder => {
				cylinder.material.dispose();
				scene.remove(cylinder);
			});

			cur_connect_points_labels.length = 0;
			cur_connect_points_cylinder.length = 0;
		}
	};

	/**
	 * 渲染当前楼层地图连通点物体
	 * @param floor_conn_points 当前楼层的全部节点
	 * @param adj_list 图的全部邻接点
	 * @param cycle_light_texture 连通点贴图
	 */
	const renderConnectPoint = (floor_conn_points: Map<string, Vector3>, adj_list: ReturnType<WeightedGraph["getAdjList"]>, cycle_light_texture: Texture) => {
		removeConnectPoint();

		const connect_map = getConnectMap(adj_list);

		if (!floor_conn_points) return;

		floor_conn_points.forEach((point, point_key) => {
			const label = createCSSLabel(`
			<span style="font-weight: bold;">${point_key}</span>
			<br>
			连通点：${connect_map[point_key]}
			`,
			point,
			1.3
			);
			scene.add(label);
			cur_connect_points_labels.push(label);

			const cylinder = createCylinder(point, cycle_light_texture);
			scene.add(cylinder);
			cur_connect_points_cylinder.push(cylinder);
		});
	};

	// 获得所有节点相邻节点映射
	const getConnectMap = (adj_list: ReturnType<WeightedGraph["getAdjList"]>) => {
		let map: Record<string, string> = {};

		for (const [key, neighbors] of adj_list.entries()) {
			map[key] = "";
			for (const [neighbor_key, weight] of neighbors.entries()) {
				map[key] += `<p>${neighbor_key}，距离：${weight}<p />`;
			}
		}

		return map;
	};

	return {
		removeConnectPoint,
		renderConnectPoint
	};
};
