import {Group, Mesh, PerspectiveCamera, Raycaster, Vector2, Vector3} from "three";

type Intersect = Group | Mesh | null

export const useRayCast = (dom_element: HTMLElement, camera: PerspectiveCamera) => {
	const mouse = new Vector2();
	const raycaster = new Raycaster();
	const intersect: {value: Intersect} = {
		value: null
	};

	const onRayCast = (intersect_navmesh: Intersect, onHit: (point: Vector3) => void) => {
		intersect.value = intersect_navmesh;

		dom_element.addEventListener("click", (e) => {
			if (intersect.value === null) return;

			mouse.x = (e.offsetX / dom_element.clientWidth) * 2 - 1;
			mouse.y = -(e.offsetY / dom_element.clientHeight) * 2 + 1;

			raycaster.setFromCamera(mouse, camera);

			const intersects = raycaster.intersectObject(intersect.value);

			if (intersects.length) {
				onHit(intersects[0].point);
			}
		});
	};

	const setIntersect = (intersect_navmesh: Group | Mesh | null) => {
		intersect.value = intersect_navmesh;
	};

	return {
		onRayCast,
		setIntersect,
		intersect
	};
};
