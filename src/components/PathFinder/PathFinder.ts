// @ts-ignore
import { Pathfinding } from "three-pathfinding";
import type { Mesh, Vector3 } from "three";

export class PathFinder {
  private path_finder: Pathfinding = new Pathfinding();
  private nav_mesh_file: Record<string, Mesh> = {};

  // 设置pathfinding的navmesh数据
  setZoneData(floor_key: string, mesh: Mesh) {
    if (this.nav_mesh_file[floor_key]) return;
    this.nav_mesh_file[floor_key] = mesh;
    this.path_finder.setZoneData(
      floor_key,
      Pathfinding.createZone(mesh.geometry)
    );
  }

  // 查询单地图路径
  queryPath(zone: string, start: Vector3, end: Vector3) {
    const path = this.findPath(zone, start, end);

    if (path) {
      // 如果出发坐标到终点坐标都有可达路线（start - end）
      return path;
    } else {
      // 终点如果不可达，找终点附近最近的点（start - near_end）
      const near_end = this.path_finder.getClosestNode(
        end,
        zone,
        this.path_finder.getGroup(zone, start)
      ).centroid;
      const start_to_near_end_path = this.findPath(zone, start, near_end);

      if (start_to_near_end_path) {
        return start_to_near_end_path;
      } else {
        // （卡死情况）如果出发坐标都不可取，则找出发位置最近的点，再到终点（near_start - end）
        const near_start = this.path_finder.getClosestNode(
          start,
          zone,
          this.path_finder.getGroup(zone, start)
        ).centroid;
        const near_start_to_end_path = this.findPath(zone, near_start, end);

        if (near_start_to_end_path) {
          return near_start_to_end_path;
        } else {
          // （卡死情况）如果出发坐标和终点坐标都不可取，则从找出两个坐标最近的点，再到终点（near_start - near_end）
          return this.findPath(zone, near_start, near_end);
        }
      }
    }
  }

  private findPath(zone: string, start: Vector3, end: Vector3) {
    return this.path_finder.findPath(
      start,
      end,
      zone,
      this.path_finder.getGroup(zone, start)
    );
  }
}
