# 计划中的数据定义

此目录存放尚未集成到游戏中的预留数据文件。

## 文件说明

- `buildings.js` — 建筑定义（22种），待建筑系统实现后启用
- `events.js` — 事件定义（13个），待事件系统重构后启用（当前 condition 引用了不存在的 state 字段，需重写）

## 集成前注意事项

- `events.js` 中的 condition 引用了 `state.gold`、`state.happiness` 等字段，当前 GameState 中不存在，集成前需重写为兼容的格式
- `buildings.js` 的 `requires` 字段引用了科技 ID（如 `agriculture`），需与 `technologies.js` 对齐
