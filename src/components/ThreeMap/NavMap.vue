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
import { ref, shallowRef, inject } from "vue";
import { useInitThree } from "@/components/ThreeMap/useInitThree";
import { Group, RepeatWrapping, Texture, TextureLoader, Vector3 } from "three";
import { useGLTFLoader } from "@/hooks/useGLTFLoader";
import { cycle_light_src, Floor } from "@/components/ThreeMap/Constants";
import { getRandomIntInclusive, isMesh } from "@/hooks/Utils";
import { Character } from "@/components/Character/Character";
import { useFloorConnectFinder } from "@/components/PathFinder/useFloorConnectFinder";
import { PathFinder } from "@/components/PathFinder/PathFinder";
import { useConnectPoint } from "@/hooks/useMesh";
import { character_src } from "@/components/Character/Constants";
import { connect_point_inject_key } from "@/global";

const props = withDefaults(
  defineProps<{
    className: string;
    width: string;
    height: string;
  }>(),
  {
    className: "nav-map",
  }
);

const { map_conn_points, graph } = inject(connect_point_inject_key)!;

const cur_map = shallowRef<Group | null>(null);

const map_file_cache: Record<string, Group> = {};

const map_container_ref = ref<HTMLElement>();

const {
  scene,
  camera,
  renderer,
  clock,
  controls,
  setFullScreenSize,
  renderCSS2D,
} = useInitThree(map_container_ref);

const character = new Character(
  camera,
  scene,
  character_src,
  new Vector3(0, 0, 0)
);

const handlePathEnd = () => {
  if (character.is_cross_floor_navigation) {
    const next_point = cross_floor_path.shift();
    const next_point_floor = next_point
      ? connect_floor_map[next_point.key]
      : undefined;

    if (
      next_point &&
      next_point_floor &&
      next_point_floor === cur_map.value!.userData.floor_key
    ) {
      // 如果下一个导航点是属于当前地图的，则执行室内导航
      createPath(next_point_floor, character.getPosition(), next_point.pos);
    } else if (
      next_point &&
      next_point_floor &&
      next_point_floor !== cur_map.value!.userData.floor_key
    ) {
      // 如果下一个导航点不属于当前地图，则在切换楼层后执行此函数
      character.showTips();

      setTimeout(() => {
        setfloorId(next_point_floor).then(() => {
          const move_to = next_point.pos;
          character.addToScene(move_to);
          character.adjustCameraLookAt(move_to);
          handlePathEnd();
        });
      }, 1000);
    } else if (next_point && next_point.key.endsWith("inside")) {
      // 下一个点为结束坐标，结束坐标一定跟最后一个连通点在同一楼层，则为室内导航
      createPath(
        cur_map.value!.userData.floor_key,
        character.getPosition(),
        next_point.pos
      );
      character.is_cross_floor_navigation = false;
    }
  } else {
    controls.enabled = true;
  }
};

character.addEventListener("on-path-end", handlePathEnd);

const { findNavPath, getConnectPointKeyMap, getPathPointPosition } =
  useFloorConnectFinder(map_conn_points, graph);

// 全部连通点Key所属楼层映射
const connect_floor_map = getConnectPointKeyMap();

const path_finder = new PathFinder();

const texture_loader = new TextureLoader();
let cycle_light_texture: Texture | undefined;
texture_loader.load(cycle_light_src, (texture) => {
  cycle_light_texture = texture;
  cycle_light_texture.wrapS = RepeatWrapping;
  cycle_light_texture.repeat.set(2, 1);
});

const { removeConnectPoint, renderConnectPoint } = useConnectPoint(scene);

// 切换地图
const setfloorId = async (floor_key: string): Promise<void> => {
  clearMap();

  renderConnectPoint(
    map_conn_points.get(floor_key)!,
    graph.getAdjList(),
    cycle_light_texture as Texture
  );

  let map: Group;

  if (map_file_cache[floor_key]) {
    map = map_file_cache[floor_key];
  } else {
    map = (await useGLTFLoader(Floor[floor_key])).scene;
    map.userData.floor_key = floor_key;
    map_file_cache[floor_key] = map;
  }

  map.traverse((item) => {
    if (isMesh(item) && item.name.includes("NavMesh")) {
      item.material.visible = false;
      path_finder.setZoneData(floor_key, item);
    }
  });

  cur_map.value = map;

  scene.add(map);

  return Promise.resolve();
};

// 室内导航方案（会初始化地图）
const insideNavigation = (
  zone: string,
  start_pos: Vector3,
  end_pos: Vector3
) => {
  controls.enabled = false;

  character.setPathLineColor(
    `rgb(${getRandomIntInclusive(0, 255)}, ${getRandomIntInclusive(
      0,
      255
    )}, ${getRandomIntInclusive(0, 255)})`
  );

  setfloorId(zone).then(() => {
    createPath(zone, start_pos, end_pos);
  });
};

// 单地图两点间的导航路径（不会初始化地图）
const createPath = (zone: string, start_pos: Vector3, end_pos: Vector3) => {
  const path = path_finder.queryPath(zone, start_pos, end_pos);
  character.addToScene(start_pos);
  path.unshift(start_pos);
  character.setPath(path);
};

let cross_floor_path: ReturnType<typeof getPathPointPosition> = [];

// 多楼层地图导航
const multiFloorNavigation = (
  paths: string[],
  start_floor: string,
  start_pos: Vector3,
  end_pos: Vector3
) => {
  controls.enabled = false;

  setfloorId(start_floor).then(() => {
    character.setPathLineColor(
      `rgb(${getRandomIntInclusive(0, 255)}, ${getRandomIntInclusive(
        0,
        255
      )}, ${getRandomIntInclusive(0, 255)})`
    );

    character.is_cross_floor_navigation = true;

    // 将字符串路径转换为具体的坐标点路径
    cross_floor_path = getPathPointPosition(paths);

    cross_floor_path.unshift({
      key: "start_inside",
      pos: start_pos,
    });

    cross_floor_path.push({
      key: "end_inside",
      pos: end_pos,
    });

    const start_point = cross_floor_path.shift();
    const next_conn_point = cross_floor_path.shift();

    // 起始坐标跟第一个连通点一定是同一个地图
    createPath(start_floor, start_point!.pos, next_conn_point!.pos);
  });
};

// 跨地图连通点查询(找到全部路径并过滤掉不必要的路径)
const findMultiFloorNavPath = (
  start_floor: string,
  end_floor: string,
  start_pos: Vector3
) => {
  return findNavPath(start_floor, end_floor, start_pos);
};

const setCharacterPosition = (pos: Vector3) => {
  character.addToScene(pos);
};

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  renderer.render(scene, camera);
  renderCSS2D(scene, camera);

  character.update(delta);

  if (cycle_light_texture) {
    cycle_light_texture.offset.x -= 0.005;
  }
});

// 清空地图和人物
const clearMap = () => {
  if (cur_map.value) {
    cur_map.value.traverse((item) => {
      if (isMesh(item)) {
        item.material.dispose();
      }
    });

    scene.remove(cur_map.value);
    cur_map.value = null;
  }
  removeConnectPoint();
  character.removeToScene();
  character.clearPath();
};

defineExpose({
  setfloorId,
  insideNavigation,
  multiFloorNavigation,
  clearMap,
  setCharacterPosition,
  setFullScreenSize,
  findMultiFloorNavPath,
});
</script>

<style scoped>
.nav-map {
  border: 1px solid #ccc;
  overflow: hidden;
}
</style>
