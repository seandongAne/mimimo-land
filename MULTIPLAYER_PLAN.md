# Socket.IO Multiplayer MVP 落地计划

## 1. 目标与约束

为 2–5 个小朋友提供临时多人 session。玩家通过房间码进入同一个 session，能够：

- 在世界地图、Cloudland、水下区域、商店、学校等地点一起移动和互动；
- 看见彼此的名字、种类、颜色、形状、位置、朝向、移动和飞行状态；
- 看见彼此挥手、说预设短语和施放魔法；
- 进入同一个住宅，在当前 session 内一起摆放和移除家具。

MVP 不包含账号、数据库、永久云存档、公开大厅、自由文本聊天、跨 session 发现或服务器物理模拟。现有单人玩法和 `localStorage` 存档必须继续可用。

## 2. 已确定方案

### 2.1 架构

```text
GitHub Pages / Vite client
          |
    Socket.IO client
          |
Railway Socket.IO service
          |
  in-memory sessions only
```

- 前端继续由 GitHub Pages 托管。
- Railway 部署单实例 Node.js + Socket.IO 服务。
- 服务端用内存保存 session 状态，不使用数据库和 Redis。
- session 无人后延迟 5 分钟删除；Railway 重启导致 session 丢失是可接受行为。
- Socket.IO 断线重连后，客户端使用稳定的 `playerId` 和房间码重新加入。
- 首个 MVP 使用服务器中转，不引入 WebRTC、STUN 或 TURN。

### 2.2 状态归属

| 状态 | 归属 | 说明 |
| --- | --- | --- |
| 玩家档案 | session 服务端 | 名字、种类、颜色、形状 |
| 玩家姿态 | session 服务端 | 地点、坐标、朝向、移动、飞行 |
| 挥手、短语、魔法 | 临时事件 | 即时转发，不为迟到玩家重放 |
| 共享住宅家具 | session 服务端 | 新玩家加入住宅时获取完整快照 |
| 商店购物车、背包、能力 | 客户端 | 保持现有本地行为 |
| NPC、宠物、天气和粒子动画 | 客户端 | MVP 不同步 |
| 摄像机和 UI | 客户端 | 永不联网 |

## 3. Session 与地点模型

### 3.1 Session

服务端维护：

```js
sessions: Map<sessionCode, {
  createdAt: number,
  emptySince: number | null,
  players: Map<playerId, PlayerState>,
  furnitureByLocation: Map<locationId, FurnitureItem[]>
}>
```

- 房间码为不易混淆的 6 位大写字母和数字。
- 同一个 session 最多 5 个玩家。
- `playerId` 在浏览器 `sessionStorage` 中生成和保存，不使用 Socket.IO 的临时 `socket.id` 作为身份。
- 同一个 `playerId` 重连时替换旧 socket，保留原玩家状态。
- 玩家永久离开后从 session 移除，并向其他客户端广播。

### 3.2 地点标识

所有场景使用统一 `locationId`：

```text
world
cloudland
underwater
shop:<shopKey>
venue:<venueKey>
house:<houseKey>:floor:<floorNumber>
```

玩家只渲染与自己处于相同 `locationId` 的远端玩家。进入、退出商店、学校、住宅、Cloudland 或水下区域时立即更新地点。

共享住宅以当前 session 为边界。现有本地住宅存档仍保留；进入多人 session 后的家具变化只写入 session 快照，不覆盖单人存档。

## 4. 网络协议

所有客户端消息都带 `protocolVersion: 1`。服务端验证消息类型、字段范围、房间人数和发送频率。

### 4.1 客户端到服务端

| 事件 | 载荷 | 用途 |
| --- | --- | --- |
| `session:create` | `playerId`, `profile` | 创建 session |
| `session:join` | `sessionCode`, `playerId`, `profile` | 加入或重连 |
| `session:leave` | 无 | 主动退出 |
| `player:profile` | `profile` | 更新名字或外观 |
| `player:pose` | `seq`, `locationId`, `x`, `y`, `z`, `rotation`, `moving`, `flying` | 同步姿态 |
| `player:action` | `actionId`, `locationId`, `payload` | 挥手、短语或魔法 |
| `furniture:add` | `locationId`, `item` | 添加家具 |
| `furniture:remove` | `locationId`, `itemId` | 移除指定家具 |
| `furniture:clear` | `locationId` | 清空当前楼层 |

### 4.2 服务端到客户端

| 事件 | 用途 |
| --- | --- |
| `session:created` | 返回房间码和完整快照 |
| `session:joined` | 返回完整玩家及家具快照 |
| `session:error` | 房间不存在、已满或消息无效 |
| `player:joined` | 创建远端角色 |
| `player:updated` | 更新档案或姿态目标值 |
| `player:left` | 删除远端角色 |
| `player:action` | 播放远端挥手、短语或魔法 |
| `furniture:added` | 在共享住宅增加家具 |
| `furniture:removed` | 删除指定家具 |
| `furniture:cleared` | 清空当前楼层家具 |

### 4.3 发送频率与表现

- 本地玩家继续每帧立即移动，不等待网络响应。
- 移动中每 100ms 发送一次姿态；静止时只在状态变化或每 1 秒发送心跳姿态。
- 远端玩家保存最近两个姿态快照，在约 100ms 缓冲区内插值。
- 位置更新只改变远端角色的目标值；不得直接瞬移渲染对象。
- 魔法仅发送类型和施法位置，各客户端调用现有魔法渲染代码生成粒子。
- 服务端限制坐标范围、名字长度、合法物种/形状/颜色、合法动作以及单客户端消息频率。

## 5. 代码改造结构

```text
src/
  multiplayer.js       Socket.IO 连接、session 生命周期和消息收发
  remote-players.js    远端 Mimimo 创建、插值、动画和销毁
  multiplayer-ui.js    创建/加入房间、房间码、在线人数和连接状态

server/
  package.json
  index.js              Express、健康检查、Socket.IO 和内存 session
  protocol.js           服务端校验和协议常量
```

计划中的现有模块改造：

- `index.html`：增加 Multiplayer 按钮、创建/加入面板、房间码和连接状态。
- `src/style.css`：增加多人面板及状态提示样式。
- `src/main.js`：初始化多人客户端；在模式切换时更新 `locationId`；在主循环中发布姿态并更新远端玩家。
- `src/mimimo.js`：继续复用 `buildMimimo()` 和 `animateMimimo()`，不复制角色建模代码。
- `src/cloudland.js`、`src/underwater.js`、`src/shop.js`、`src/venues.js`：暴露稳定的地点标识和远端角色容器，或通过统一适配器注册当前场景。
- `src/interior.js`：为家具提供稳定 `itemId`；增加载入 session 快照、应用远端添加/删除/清空操作的入口。
- `package.json`：前端加入 `socket.io-client`；根构建保持兼容现有 GitHub Pages 流程。

## 6. 实施顺序

### 阶段 1：连接骨架与 session UI

1. 新建 Railway 服务目录、健康检查和 Socket.IO 服务入口。
2. 实现 session 创建、加入、重连、离开、人数上限和空房清理。
3. 前端增加创建/加入 UI，并保存 `playerId`、当前房间码和连接状态。
4. 确保多人服务不可用时仍可进入完整单人模式。

验收：两个浏览器能够用同一房间码加入；刷新页面后自动重进；离线时单人游戏不受影响。

### 阶段 2：角色档案与大地图移动

1. 实现远端角色管理器，复用 Mimimo 构建和动画函数。
2. 同步名字、种类、颜色和形状。
3. 以 10Hz 发布大地图姿态，并对远端姿态做插值。
4. 同步移动、飞行以及加入/离开状态。

验收：三个浏览器在大地图互相看见，移动连续，无明显跳动；角色外观和名字一致。

### 阶段 3：挥手、预设短语与魔法

1. 把挥手和预设短语统一为 `player:action`。
2. 广播魔法类型和施法坐标，在接收端播放本地粒子效果。
3. 对动作事件做地点过滤、字段校验和简单限流。

验收：同一地点的玩家能看到动作；不同地点的玩家不会收到可见效果；迟到玩家不会重放旧动作。

### 阶段 4：跨场景同行

1. 将现有游戏模式映射为统一 `locationId`。
2. 为 Cloudland、水下、商店和公共设施接入远端玩家容器。
3. 进入或退出场景时广播地点变化，并清理旧场景中的远端角色。
4. 商店购物车、奖励和个人能力继续保持本地，仅同步现场角色与互动表现。

验收：玩家可以分别进入或离开地点；只有进入同一地点的玩家互相可见；返回大地图后状态正确恢复。

### 阶段 5：共同装修住宅

1. 为每件家具生成全局唯一 `itemId`。
2. 服务端保存每个住宅楼层的家具快照。
3. 添加、撤销和清空操作先发往服务器，再由服务器广播规范化结果。
4. 新玩家进入住宅时加载当前 session 的完整家具快照。
5. 处理两人同时操作以及重复消息，删除操作以 `itemId` 为准。

验收：三名玩家同时进入同一住宅，任何一人摆放、撤销或清空家具后，其他人立即得到相同结果；退出 session 后不污染单人住宅存档。

### 阶段 6：Railway 部署与稳定性检查

1. Railway 服务监听 `0.0.0.0` 和 `process.env.PORT`。
2. 配置 `/health` 健康检查和允许的 GitHub Pages 来源。
3. 前端通过 `VITE_MULTIPLAYER_URL` 配置服务地址。
4. Socket.IO 每次重新连接后重新发送 `session:join`，不依赖旧 `socket.id`。
5. 验证桌面、触屏、刷新、临时断网、房间已满、错误房间码和 Railway 重启行为。

验收：生产页面可以建立 session；连接中断后自动恢复；服务端重启时给出明确提示并允许创建新 session。

## 7. 测试清单

- 单人模式启动、移动、商店、上课、建房和装修没有回归。
- 2、3、5 个浏览器加入同一 session。
- 名字和外观修改后所有玩家一致。
- 移动、转向、飞行、传送魔法不会造成远端永久错位。
- 玩家快速切换场景时不会在旧场景留下角色。
- 刷新或短暂断网后不会生成重复角色。
- 玩家离开后远端角色和气泡资源被正确释放。
- 晚加入住宅的玩家获得完整家具快照。
- 同时摆放、删除和清空家具后各客户端结果一致。
- 无效事件、超长名字、非法颜色和高频消息被拒绝。
- Railway 不可用时 UI 显示离线状态，单人模式仍然可玩。

## 8. 完成定义

MVP 完成时应满足：

1. 两到五名玩家可通过房间码建立临时 session。
2. 玩家能在所有主要地点同行并看见彼此的正确角色状态。
3. 挥手、预设短语和魔法效果能够实时传播。
4. 玩家能够在同一住宅楼层共同装修并保持 session 内一致。
5. 断线重连和错误状态有清晰反馈。
6. 现有单人模式、GitHub Pages 构建和本地存档行为保持可用。

