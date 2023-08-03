import {
	sRGBEncoding,
	Color,
	PerspectiveCamera,
	Scene,
	WebGLRenderer,
	AxesHelper,
	Clock,
	AmbientLight,
	MOUSE
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {nextTick, onMounted, type Ref} from "vue";
import {useCSS2D} from "@/components/ThreeMap/useCSS2D";

export const useInitThree = (container: Ref) => {
	const {appendCSS2D, renderCSS2D, cssRenderer} = useCSS2D();

	const scene = new Scene();
	scene.background = new Color(0xffffff);

	scene.add(new AmbientLight(0xffffff));

	// scene.add(new AxesHelper(10));

	const camera = new PerspectiveCamera(
		55,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	// 设置相机位置
	camera.position.set(5, 5, 5);

	const renderer = new WebGLRenderer({antialias: true});
	renderer.shadowMap.enabled = true;
	renderer.outputEncoding = sRGBEncoding;

	const controls = new OrbitControls(camera, renderer.domElement);
	controls.minDistance = 5;
	controls.maxPolarAngle = Math.PI / 2.1;
	/* controls.mouseButtons = {
		LEFT: MOUSE.PAN,
		MIDDLE: MOUSE.DOLLY,
		RIGHT: MOUSE.ROTATE
	};*/

	const clock = new Clock();

	onMounted(() => {
		nextTick(() => {
			if (container.value) {
				const width = container.value.clientWidth;
				const height = container.value.clientHeight;

				appendCSS2D(container.value);

				camera.aspect = width / height;
				camera.updateProjectionMatrix();

				renderer.setSize(width, height);
				container.value.appendChild(renderer.domElement);

				window.addEventListener("resize", () => {
					resizeRenderer();
				});
			}
		});
	});

	const setFullScreenSize = () => {
		container.value.requestFullscreen().then(() => {
			resizeRenderer(window.innerWidth, window.innerHeight);
		});
	};

	const resizeRenderer = (width = container.value.clientWidth, height = container.value.clientHeight) => {
		camera.aspect = width / height;
		camera.updateProjectionMatrix();

		renderer.setSize(width, height);
		cssRenderer.setSize(width, height);
	};

	return {
		scene,
		camera,
		renderer,
		controls,
		clock,
		setFullScreenSize,
		renderCSS2D
	};
};
