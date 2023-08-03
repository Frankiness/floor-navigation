import {CSS2DRenderer} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type {PerspectiveCamera, Scene} from "three";

export const useCSS2D = () => {
	// 实例化CSS2D渲染器
	const cssRenderer = new CSS2DRenderer();
	cssRenderer.domElement.style.position = "absolute";
	cssRenderer.domElement.style.zIndex = "999";
	cssRenderer.domElement.style.left = "0";
	cssRenderer.domElement.style.top = "0";
	cssRenderer.domElement.style.pointerEvents = "none";

	const appendCSS2D = (dom_element: HTMLElement) => {
		const width = dom_element.clientWidth;
		const height = dom_element.clientHeight;
		cssRenderer.setSize(width, height);
		dom_element.appendChild(cssRenderer.domElement);
	};

	const renderCSS2D = (scene: Scene, camera: PerspectiveCamera) => {
		cssRenderer.render(scene, camera);
	};

	return {
		appendCSS2D,
		renderCSS2D,
		cssRenderer
	};
};
