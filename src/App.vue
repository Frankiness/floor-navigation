<template>
<el-row class="map-select">
	<el-col
		:lg="18"
		:md="24"
		class="preview-column"
	>
		<el-form
			:model="form"
			class="map-form"
		>
			<el-row :gutter="20">
				<el-col
					:lg="12"
					:md="24"
				>
					<el-form-item
						label="选择起始地图"
						class="floor-form-item"
					>
						<el-select
							v-model="form.start_floor"
							size="large"
							@change="changeFloor"
						>
							<el-option
								v-for="item in floor_options"
								:key="item.value"
								:label="item.label"
								:value="item.value"
							/>
						</el-select>
						<span>(点击地图选择起始坐标)</span>
					</el-form-item>
					<el-col :span="24">
						<el-form-item
							class="coord"
							label="坐标点："
						>
							{{ start_pos }}
						</el-form-item>
					</el-col>
					<three-map
						ref="start_map_ref"
						class-name="start-map"
						width="100%"
						height="440px"
						:floor-id="form.start_floor"
					/>
				</el-col>
				<el-col
					:lg="12"
					:md="24"
				>
					<el-form-item
						label="选择终点地图"
						class="floor-form-item"
					>
						<el-select
							v-model="form.end_floor"
							size="large"
							@change="changeFloor"
						>
							<el-option
								v-for="item in floor_options"
								:key="item.value"
								:label="item.label"
								:value="item.value"
							/>
						</el-select>
						<span>(点击地图选择终点坐标)</span>
					</el-form-item>
					<el-col :span="24">
						<el-form-item
							class="coord"
							label="坐标点："
						>
							{{ end_pos }}
						</el-form-item>
					</el-col>
					<three-map
						ref="end_map_ref"
						class-name="end-map"
						width="100%"
						height="440px"
						:floor-id="form.end_floor"
					/>
				</el-col>
			</el-row>
		</el-form>
	</el-col>
	<el-col
		:lg="6"
		:md="24"
		class="search-column"
	>
		<div class="search-result">
			<el-button
				type="primary"
				@click="handlePathFinding"
			>
				导航查询
			</el-button>
			<el-button @click="reset">
				重置
			</el-button>
			<el-scrollbar class="path-result">
				<h2 v-show="nav_paths.length">
					查询结果：
				</h2>
				<ul v-if="nav_paths.length">
					<li
						v-for="item in nav_paths"
						:key="item.title"
					>
						<el-button @click="item.fn">
							查看导航
						</el-button>
						<el-button @click="item.fullScreenFn">
							查看全屏导航
						</el-button>
						<p style="margin: 5px;">
							{{ item.title }}
						</p>
					</li>
				</ul>
				<div
					v-else
					class="none-path"
				>
					暂无路径
				</div>
			</el-scrollbar>
		</div>
	</el-col>
	<el-col
		:lg="18"
		:md="24"
		style="padding: 0 20px;"
		class="nav-result-column"
	>
		<nav-map
			ref="nav_map_ref"
			width="100%"
			height="550px"
			class-name="nav-map"
		/>
	</el-col>
</el-row>
</template>

<script setup lang="ts">
import ThreeMap from "./components/ThreeMap/ThreeMap.vue";
import NavMap from "./components/ThreeMap/NavMap.vue";
import {onMounted, provide, ref, shallowRef, watch} from "vue";
import {formatCoordinate, isMultiFloorNavPath} from "@/hooks/Utils";
import 'element-plus/theme-chalk/index.css';
import {ElMessage} from 'element-plus';
import {initConnectPoint} from "@/components/PathFinder/initConnectPoint";
import {connect_point_inject_key} from "@/global";

const {map_conn_points, graph} = initConnectPoint();

provide(connect_point_inject_key, {
	map_conn_points,
	graph
});

const floor_options = [
	{
		value: 'floor_9',
		label: '9楼',
	},
	{
		value: 'floor_10',
		label: '10楼',
	},
	{
		value: 'out',
		label: '户外',
	}
];

const form = ref({
	start_floor: "floor_9",
	end_floor: "floor_9"
});

// 导航方案列表数据
const nav_paths = shallowRef<{title: string, fn: (...args: any) => any, fullScreenFn: (...args: any) => any}[]>([]);

// 选择坐标地图实例
const start_map_ref = ref();
const start_pos = shallowRef("");
const end_map_ref = ref();
const end_pos = shallowRef("");

// 导航地图实例
const nav_map_ref = ref();

onMounted(() => {
	watch(() => start_map_ref.value.select_point, (value) => {
		if (value) {
			start_pos.value = formatCoordinate(value.userData.position);
		} else {
			start_pos.value = "暂无";
		}
	}, {immediate: true});

	watch(() => end_map_ref.value.select_point, (value) => {
		if (value) {
			end_pos.value = formatCoordinate(value.userData.position);
		} else {
			end_pos.value = "暂无";
		}
	}, {immediate: true});
});

const handlePathFinding = () => {
	if (!start_map_ref.value.select_point) {
		ElMessage({
			type: "error",
			message: "请指定起始地图坐标"
		});
		return;
	}
	if (!end_map_ref.value.select_point) {
		ElMessage({
			type: "error",
			message: "请指定终点地图坐标"
		});
		return;
	}

	const start_pos = start_map_ref.value.select_point.userData.position;
	const end_pos = end_map_ref.value.select_point.userData.position;

	if (form.value.start_floor === form.value.end_floor) { // 当前楼层导航
		nav_paths.value = [
			{
				title: "室内导航路线",
				fn: () => {
					nav_map_ref.value.insideNavigation(form.value.start_floor, start_pos, end_pos);
				},
				fullScreenFn: () => {
					nav_map_ref.value.setFullScreenSize();
					nav_map_ref.value.insideNavigation(form.value.start_floor, start_pos, end_pos);
				}
			}
		];
	} else {
		const paths: unknown = nav_map_ref.value.findMultiFloorNavPath(form.value.start_floor, form.value.end_floor, start_pos);

		if (isMultiFloorNavPath(paths) && paths !== null) {
			nav_paths.value = paths.map((path_obj, index) => {
				return {
					title: `路线${index + 1}：${path_obj.path.join("->")}，连通路径总距离：${path_obj.weight}`,
					fn: () => {
						nav_map_ref.value.multiFloorNavigation(path_obj.path, form.value.start_floor, start_pos, end_pos);
					},
					fullScreenFn: () => {
						nav_map_ref.value.setFullScreenSize();
						nav_map_ref.value.multiFloorNavigation(path_obj.path, form.value.start_floor, start_pos, end_pos);
					}
				};
			});
		} else {
			nav_paths.value = [];
		}
	}
};

const changeFloor = () => {
	nav_paths.value = [];
};

// 重置所有状态
const reset = () => {
	form.value.start_floor = "floor_9";
	form.value.end_floor = "floor_9";

	start_map_ref.value.clearPointHelper();
	end_map_ref.value.clearPointHelper();

	nav_paths.value = [];

	nav_map_ref.value.clearMap();
};
</script>

<style scoped lang="scss">
.map-select {
	.el-col {
		height: 100%;
	}

	.map-form {
		padding: 20px;
		.coord {
			color: #666;
		}
	}

	.search-result {
		padding: 20px;
		height: 560px;

		.path-result {
			margin-top: 10px;
			box-sizing: border-box;
			height: 87%;
			border: 1px solid #ccc;
			background: #f4f5f9;

			h2 {
				background: #fff;
				padding: 10px;
				position: sticky;
				left: 0;
				top: 0;
			}

			li {
				padding: 10px 5px;
				background: #fff;
				color: #666;
				border-bottom: 1px solid #ccc;
				transition: background-color .2s;

				&:hover {
					background: #409EFF;
					color: #fff;
				}

				button {
					margin-right: 5px;
					margin-left: 5px;
				}

				span {
					vertical-align: middle;
				}
			}

			.none-path {
				width: 100%;
				height: 250px;
				line-height: 250px;
				text-align: center;
				color: #999;
			}
		}
	}
}

.floor-form-item {
	span {
		margin-left: 10px;
		color: #999 !important;
	}
}

@media screen and (max-width: 1200px) {
	.preview-column {
		order: 3;

		.map-form > .el-row > .el-col {
			padding: 20px;
			margin-top: 20px;
			background: #f4f5f9;
			border: 1px solid #ccc;
		}
	}

	.search-column {
		order: 1;

		.search-result {
			height: 300px;
		}
	}

	.nav-result-column {
		order: 2;
	}
}
</style>
