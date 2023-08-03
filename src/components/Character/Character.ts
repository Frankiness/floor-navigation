import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader.js";
import {
	AnimationMixer,
	BufferGeometry,
	CanvasTexture,
	Group,
	Line,
	LineBasicMaterial, Mesh,
	Object3D,
	PerspectiveCamera,
	Scene,
	Sprite,
	SpriteMaterial,
	TextureLoader,
	Vector3
} from "three";
import {EventEmitter} from "@/components/EventEmitter";
import type {ColorRepresentation} from "three/src/utils";
import {createLine} from "@/hooks/useMesh";
import {track_line_src} from "@/components/Character/Constants";

const texture_loader = new TextureLoader();

const track_line_texture = texture_loader.load(track_line_src);
// track_line_texture.wrapS = RepeatWrapping;
// track_line_texture.wrapT = RepeatWrapping;
// track_line_texture.repeat.set(3, 1);

export class Character extends EventEmitter {
	private MOVE_SPEED = 4;
	private path_line_color: ColorRepresentation = 0xff9900;
	private PATH_LINE_OFFSET_Y = 1.2;

	private camera: PerspectiveCamera;
	private scene: Scene;
	private fbx_loader = new FBXLoader();

	private character_model: Group | undefined;
	private mixer: AnimationMixer | undefined;
	private action_walk: any;
	private quaternion_helper: Object3D | undefined;

	private paths: Vector3[] = [];

	// 判断是否处于多场景导航
	public is_cross_floor_navigation: boolean = false;

	private sprite_tips!: Sprite;

	private line: Mesh | undefined;

	constructor(camera: PerspectiveCamera, scene: Scene, url: string, position: Vector3) {
		super();

		this.camera = camera;

		this.scene = scene;

		this.fbx_loader.load(url, (object) => {
			this.character_model = object;
			this.character_model.name = "character";

			this.character_model.position.copy(position);

			this.mixer = new AnimationMixer(object);

			this.action_walk = this.mixer.clipAction(object.animations[1]);

			this.quaternion_helper = new Object3D();

			this.createSpriteTips();
		});
	}

	addToScene(pos: Vector3 = new Vector3(0, 0, 0)) {
		if (this.character_model && this.scene.getObjectByName("character")) {
			this.character_model.position.copy(pos);
			return;
		}

		if (this.character_model) {
			this.character_model.position.copy(pos);
			this.scene.add(this.character_model);
		}
	}

	removeToScene() {
		if (this.character_model && this.scene.getObjectByName("character")) {
			this.hideTips();

			this.scene.remove(this.character_model);

			this.paths = [];
		}
	}

	setPath(paths: Vector3[]) {
		if (this.paths.length) return;
		this.playWalk();
		this.paths = paths;
		this.drawPathLine(this.paths);
	}

	update(delta: number) {
		if (this.paths && this.paths.length) {
			this.animateModel(delta);
		} else if (this.paths && this.paths.length === 0) {
			this.stopWalk();
		}

		this.updateSprite();
		this.updateLine();
	}

	getPosition() {
		return this.character_model?.position as Vector3;
	}

	setPosition(position: Vector3) {
		this.character_model && this.character_model.position.copy(position);
	}

	setPathLineColor(color: ColorRepresentation) {
		this.path_line_color = color;
	}

	private drawPathLine(paths: Vector3[]) {
		this.clearPath();

		// const line_arr: number[] = [];

		// paths.forEach(path => {
		// 	line_arr.push(path.x, path.y, path.z);
		// });

		const line = createLine(paths, 0.1, 0xff9900, 1.2, track_line_texture);
		line.name = "line";
		this.line = line;
		this.scene.add(line);
	}

	clearPath() {
		const beforeLine = (this.scene.getObjectByName("line") as Line<BufferGeometry, LineBasicMaterial>);

		if (beforeLine) {
			beforeLine.material.dispose();
			beforeLine.geometry.dispose();
			this.scene.remove(beforeLine);
		}
	}

	private animateModel(delta: number) {
		this.mixer?.update(delta);

		if (this.paths && this.character_model && this.quaternion_helper) {
			let targetPosition = this.paths[0];
			const velocity = targetPosition.clone().sub(this.character_model.position);

			this.quaternion_helper.position.copy(this.character_model.position);
			this.quaternion_helper.rotation.copy(this.character_model.rotation);
			this.quaternion_helper.lookAt(targetPosition);
			this.character_model.quaternion.slerp(this.quaternion_helper.quaternion, 0.1);

			if (velocity.lengthSq() > 0.05 * 0.05) {
				velocity.normalize();
				this.character_model.position.add(velocity.multiplyScalar(delta * this.MOVE_SPEED));

				this.setCameraLookAt(this.quaternion_helper);
			} else {
				this.paths.shift();
				if (!this.paths.length) {
					this.dispatchEvent("on-path-end");
				}
			}
		}
	}

	private setCameraLookAt(quaternion_helper: Object3D) {
		const player_pos = quaternion_helper.position.clone(); // 获取角色位置
		const camera_offset = new Vector3(0, 2, 0); // 设置相机的偏移量
		const camera_direction = new Vector3(0, 1, -4); // 设置相机的方向向量
		camera_direction.applyQuaternion(quaternion_helper.quaternion); // 旋转相机方向向量以跟随角色方向
		const camera_pos = player_pos.clone().add(camera_direction); // 计算相机位置
		camera_pos.add(camera_offset); // 添加相机的偏移量
		this.camera.position.lerp(camera_pos, 0.1); // 平滑设置相机位置
		this.camera.lookAt(player_pos); // 将相机指向角色位置
	}

	// 手动改变character位置时需调用此函数设置相机跟随
	adjustCameraLookAt(target_position: Vector3) {
		if (this.quaternion_helper && this.character_model) {
			this.quaternion_helper.position.copy(this.character_model.position);
			this.quaternion_helper.rotation.copy(this.character_model.rotation);
			this.quaternion_helper.lookAt(target_position);
			this.character_model.quaternion.slerp(this.quaternion_helper.quaternion, 0.1);

			this.setCameraLookAt(this.quaternion_helper);
		}
	}

	private playWalk() {
		this.action_walk?.play();
	}

	private stopWalk() {
		this.action_walk?.stop();
	}

	private createSpriteTips() {
		const canvas = document.createElement("canvas");
		canvas.width = 1024;
		canvas.height = 512;

		const context = canvas.getContext("2d") as CanvasRenderingContext2D;
		context.fillStyle = "rgba(100, 100, 100, 1)";
		context.fillRect(0, 256, 2048, 256);
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.font = "bold 150px Arial";
		context.fillStyle = "rgba(255, 255, 255, 1)";
		context.fillText("切换楼层中", canvas.width / 2, canvas.height / 1.3);

		const texture = new CanvasTexture(canvas);

		const material = new SpriteMaterial({
			map: texture,
			color: 0xffffff,
			transparent: true,
			opacity: 0.9
		});

		const sprite = new Sprite(material);
		sprite.position.copy(this.character_model!.position);
		sprite.visible = false;

		this.sprite_tips = sprite;

		this.scene.add(sprite);
	}

	showTips() {
		this.sprite_tips.visible = true;
	}

	hideTips() {
		this.sprite_tips.visible = false;
	}

	updateSprite() {
		if (this.sprite_tips && this.character_model) {
			this.sprite_tips.position.copy(this.character_model.position);
			this.sprite_tips.translateY(2.5);
		}
	}

	updateLine() {
		if (this.line) {
			// @ts-ignore
			// this.line.material.uniforms.uOffset.value.x -= 0.01;
			this.line.material.map.offset.x -= 0.01;
		}
	}
}
