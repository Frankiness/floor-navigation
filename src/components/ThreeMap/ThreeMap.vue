<template>
  <div
    ref="map_container_ref"
    :class="['three-map', props.className]"
    :style="{
      width: props.width,
      height: props.height,
    }"
  />
</template>

<script setup lang="ts">
import { useInitThree } from "@/components/ThreeMap/useInitThree";
import { ref, watch, onMounted, shallowRef, inject } from "vue";
import { useGLTFLoader } from "@/hooks/useGLTFLoader";
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  SphereGeometry,
  Sprite,
  TextureLoader,
  Texture,
  RepeatWrapping,
} from "three";
import { useRayCast } from "@/components/ThreeMap/useRayCast";
import {
  coordinate_src,
  cycle_light_src,
  Floor,
} from "@/components/ThreeMap/Constants";
import {
  createImgSprite,
  createSphere,
  useConnectPoint,
} from "@/hooks/useMesh";
import { isMesh } from "@/hooks/Utils";
import { connect_point_inject_key } from "@/global";

const props = defineProps<{
  className: string;
  width: string;
  height: string;
  floorId: string;
}>();

const { map_conn_points, graph } = inject(connect_point_inject_key)!;

// 坐标点texture
const texture_loader = new TextureLoader();
let coordinate_texture: Texture | undefined;
texture_loader.load(coordinate_src, (texture) => {
  coordinate_texture = texture;
});

// 连通点texture
let cycle_light_texture: Texture | undefined;
texture_loader.load(cycle_light_src, (texture) => {
  cycle_light_texture = texture;
  cycle_light_texture.wrapS = RepeatWrapping;
  cycle_light_texture.repeat.set(2, 1);
});

const cur_map = shallowRef<Group | null>(null);

const map_file_cache: Record<string, Group> = {};

// 选择的坐标点Mesh（起始点/终点）
const select_point = shallowRef<Group | null>(null);

let ray_cast: ReturnType<typeof useRayCast> | null = null;

const map_container_ref = ref<HTMLElement>();

const { scene, camera, renderer, clock, renderCSS2D } =
  useInitThree(map_container_ref);

// 连通点
const { renderConnectPoint } = useConnectPoint(scene);

// 切换地图
const setfloorId = async (scene_url: string) => {
  if (cur_map.value) {
    cur_map.value.traverse((item) => {
      if (isMesh(item)) {
        item.material.dispose();
      }
    });

    clearPointHelper();

    scene.remove(cur_map.value);
  }

  let map: Group;

  if (map_file_cache[scene_url]) {
    map = map_file_cache[scene_url];
  } else {
    map = (await useGLTFLoader(Floor[scene_url])).scene;
    map_file_cache[scene_url] = map;
  }

  map.traverse((item) => {
    if (item.name.includes("NavMesh")) {
      item.visible = false;
    }
  });

  cur_map.value = map;

  scene.add(map);

  renderConnectPoint(
    map_conn_points.get(scene_url)!,
    graph.getAdjList(),
    cycle_light_texture as Texture
  );

  if (ray_cast) {
    if (!ray_cast.intersect.value) {
      ray_cast.onRayCast(map, handleMapClick);
    } else {
      ray_cast.setIntersect(map);
    }
  }
};

onMounted(() => {
  ray_cast = useRayCast(map_container_ref.value as HTMLElement, camera);

  watch(() => props.floorId, setfloorId, { immediate: true });
});

const clearPointHelper = () => {
  if (select_point.value) {
    const sphere = select_point.value.getObjectByName("sphere") as Mesh<
      SphereGeometry,
      MeshBasicMaterial
    >;
    const sprite = select_point.value.getObjectByName("sprite") as Sprite;
    sphere.material.dispose();
    sprite.material.dispose();
    scene.remove(select_point.value);

    select_point.value = null;
  }
};

const renderPointHelper = (point: Vector3) => {
  clearPointHelper();

  const group = new Group();
  group.userData.position = point;
  const sphere = createSphere(0.1, 0xff9900, point);
  const sprite = createImgSprite(
    coordinate_texture as Texture,
    point,
    0.5,
    0.06
  );
  group.add(sphere);
  group.add(sprite);

  scene.add(group);
  select_point.value = group;
};

const handleMapClick = (point: Vector3) => {
  renderPointHelper(point);
};

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  renderer.render(scene, camera);
  if (cycle_light_texture) {
    cycle_light_texture.offset.x -= 0.005;
  }
  renderCSS2D(scene, camera);
});

defineExpose({
  select_point,
  clearPointHelper,
});
</script>

<style scoped lang="scss">
.three-map {
  border: 1px solid #ccc;
  overflow: hidden;
}
</style>
