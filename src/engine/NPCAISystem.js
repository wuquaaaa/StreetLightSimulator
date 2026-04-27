/**
 * NPC AI 系统 - 路灯计划
 *
 * 管理 NPC 的自动劳作决策，包括：
 * - 农民 AI：优先级驱动的农田操作（除虫 > 收获 > 浇水 > 除草 > 施肥 > 翻地 > 播种）
 * - 收获入库：统一的种子回收和仓库存储
 *
 * 未来可扩展：商人自动交易、学者自动研究等。
 */

import {
  NPC_WATER_THRESHOLD, NPC_WEED_THRESHOLD, NPC_FERTILITY_THRESHOLD,
} from './constants';

export class NPCAISystem {
  /**
   * 驱动所有 NPC 自动劳作
   * @param {Character[]} npcs - NPC 角色列表
   * @param {FarmSystem} farm - 农田系统
   * @param {WarehouseSystem} warehouse - 仓库系统
   * @param {(msg: string) => void} logFn - 日志函数
   */
  tickAutoWork(npcs, farm, warehouse, logFn) {
    for (const npc of npcs) {
      if (!npc.hasRole('farmer')) continue;
      // 检查是否在开垦
      if (farm.expandQueue.find(q => q.characterId === npc.id)) continue;

      const plots = farm.getPlotsForCharacter(npc.id);
      if (plots.length === 0) continue;

      const speed = npc.getFarmWorkSpeed();
      const ops = Math.floor(speed);
      const remainder = speed - ops;
      const totalOps = ops + (Math.random() < remainder ? 1 : 0);

      for (let op = 0; op < totalOps; op++) {
        this._executeFarmerAction(npc, plots, farm, warehouse, logFn);
      }
    }
  }

  /**
   * 农民 AI：按优先级执行一个农田操作
   */
  _executeFarmerAction(npc, plots, farm, warehouse, logFn) {
    // 优先级：灵蛊 > 除虫 > 收获 > 浇水(低于50) > 除草(高于50) > 施肥(低于50) > 翻地 > 播种
    for (const plot of plots) {
      if (plot.hasSpiritBug) {
        farm.removeSpiritBug(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.hasPest) {
        farm.removePest(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.state === 'ready') {
        const result = farm.harvest(plot.id, npc, warehouse);
        if (result.success && result.yield) {
          result.overflowWarnings?.forEach(msg => logFn(msg));
        }
        return;
      }
    }
    for (const plot of plots) {
      if (plot.waterLevel < NPC_WATER_THRESHOLD) {
        farm.water(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.weedGrowth > NPC_WEED_THRESHOLD) {
        farm.removeWeeds(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.fertility < NPC_FERTILITY_THRESHOLD) {
        farm.fertilize(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.state === 'empty' || plot.state === 'withered') {
        farm.plow(plot.id, npc);
        return;
      }
    }
    for (const plot of plots) {
      if (plot.state === 'plowed') {
        const seedAmt = warehouse.getItemAmount('seed', 'wheat_seed');
        if (seedAmt >= 1) {
          farm.plant(plot.id, 'wheat', npc, warehouse);
        }
        return;
      }
    }
  }

}

