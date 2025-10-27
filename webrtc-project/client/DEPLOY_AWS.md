\# 一个 EC2 能否同时运行 STUN + TURN + 应用？



\## ❓ 你的问题



\*\*一台 EC2 既运行应用，又运行 TURN 服务器，可以吗？\*\*



\## ✅ 完全可以！



```

┌─────────────────────────┐

│      1 个 EC2 实例       │

├─────────────────────────┤

│  Node.js 应用           │

│  ├─ Express 服务器      │

│  ├─ Socket.io           │

│  └─ 端口 5000           │

├─────────────────────────┤

│  coturn TURN 服务器     │

│  ├─ 端口 3478 (UDP)     │

│  ├─ 端口 5349 (TCP)     │

│  └─ 中继 WebRTC 流量    │

├─────────────────────────┤

│  Nginx（可选）          │

│  └─ 端口 80/443         │

└─────────────────────────┘

```



---



\## 🔧 部署步骤



\### \*\*第 1 步：配置 EC2 安全组\*\*



在 AWS 安全组开放这些端口：



```

应用端口：

✅ TCP 5000 (Node.js 应用)

✅ TCP 443 (HTTPS)

✅ TCP 80 (HTTP)



TURN 服务器：

✅ UDP 3478 (TURN)

✅ TCP 3478 (TURN)

✅ TCP 5349 (TURN TLS)

✅ UDP 49152-65535 (媒体流)

```



---



\### \*\*第 2 步：安装依赖\*\*



```bash

\# SSH 连接到 EC2

ssh -i "your-key.pem" ubuntu@your-ec2-ip



\# 更新系统

sudo apt-get update

sudo apt-get upgrade -y



\# 安装 Node.js

curl -fsSL https://deb.nodesource.com/setup\_18.x | sudo -E bash -

sudo apt-get install -y nodejs



\# 安装 coturn

sudo apt-get install -y coturn



\# 安装其他工具

sudo apt-get install -y git curl wget nano

```



---



\### \*\*第 3 步：部署应用\*\*



```bash

\# 克隆项目

git clone https://github.com/your-repo/webrtc-project.git

cd webrtc-project/server



\# 安装依赖

npm install



\# 创建 .env 文件

cat > .env << EOF

PORT=5000

NODE\_ENV=production

TURN\_SERVER=your-ec2-ip

TURN\_USERNAME=webrtc

TURN\_PASSWORD=webrtcpass123

EOF



\# 用 pm2 启动应用

npm install -g pm2

pm2 start index.js --name "webrtc-app"

pm2 startup

pm2 save

```



---



\### \*\*第 4 步：配置 TURN 服务器\*\*



```bash

\# 编辑 coturn 配置

sudo nano /etc/coturn/turnserver.conf

```



\*\*完整配置文件：\*\*



```conf

\# ===== 基础配置 =====

listening-port=3478

listening-port=5349

listening-ip=0.0.0.0



\# 你的 EC2 公网 IP（重要！）

external-ip=YOUR\_EC2\_PUBLIC\_IP/YOUR\_EC2\_PUBLIC\_IP



\# ===== 用户认证 =====

user=webrtc:webrtcpass123

realm=webrtc.example.com



\# ===== 性能配置 =====

max-bps=0

bps-capacity=0

max-allocate-lifetime=86400



\# ===== 日志 =====

log-file=/var/log/coturn/coturn.log

verbose



\# ===== 安全 =====

fingerprint

lt-cred-mech

no-loopback-peers

no-multicast-peers



\# ===== 针对媒体中继优化 =====

relay-ip=YOUR\_EC2\_PUBLIC\_IP

enable-change-request-api

```



\*\*启动 TURN：\*\*



```bash

\# 重启 coturn

sudo systemctl restart coturn

sudo systemctl enable coturn



\# 查看状态

sudo systemctl status coturn



\# 查看日志

sudo tail -f /var/log/coturn/coturn.log

```



---



\### \*\*第 5 步：更新应用配置\*\*



\*\*server/config/ice-servers.js\*\*



```javascript

module.exports = {

&nbsp; // 获取环境变量中的 EC2 IP

&nbsp; EC2\_PUBLIC\_IP: process.env.EC2\_PUBLIC\_IP || 'your-ec2-ip',

&nbsp; 

&nbsp; iceServers: \[

&nbsp;   // ===== 现成的 STUN =====

&nbsp;   { urls: 'stun:stun.aliyun.com:3478' },

&nbsp;   { urls: 'stun:stun.tencent.com:3478' },

&nbsp;   { urls: 'stun:stun.l.google.com:19302' },

&nbsp; ],

&nbsp; 

&nbsp; turnServers: \[

&nbsp;   // ===== 自己的 TURN =====

&nbsp;   {

&nbsp;     urls: \[`turn:YOUR\_EC2\_IP:3478`, `turn:YOUR\_EC2\_IP:5349?transport=tcp`],

&nbsp;     username: process.env.TURN\_USERNAME || 'webrtc',

&nbsp;     credential: process.env.TURN\_PASSWORD || 'webrtcpass123'

&nbsp;   }

&nbsp; ]

};

```



\*\*server/index.js\*\*



```javascript

const express = require('express');

const http = require('http');

const socketIo = require('socket.io');

const cors = require('cors');

require('dotenv').config();



const iceServers = require('./config/ice-servers');



const app = express();

const server = http.createServer(app);

const io = socketIo(server, {

&nbsp; cors: { origin: '\*', methods: \['GET', 'POST'] }

});



// ===== 发送 ICE 服务器配置 =====

io.on('connection', (socket) => {

&nbsp; console.log('用户连接:', socket.id);



&nbsp; // 前端请求 ICE 配置

&nbsp; socket.on('request-ice-config', () => {

&nbsp;   const config = {

&nbsp;     iceServers: iceServers.iceServers,

&nbsp;     turnServers: iceServers.turnServers

&nbsp;   };

&nbsp;   socket.emit('ice-config', config);

&nbsp; });



&nbsp; // 其他 WebRTC 信令处理

&nbsp; socket.on('offer', (data) => {

&nbsp;   io.to(data.to).emit('offer', data);

&nbsp; });



&nbsp; socket.on('answer', (data) => {

&nbsp;   io.to(data.to).emit('answer', data);

&nbsp; });



&nbsp; socket.on('ice-candidate', (data) => {

&nbsp;   io.to(data.to).emit('ice-candidate', data);

&nbsp; });

});



server.listen(5000, () => {

&nbsp; console.log('WebRTC 服务器运行在 :5000');

&nbsp; console.log('TURN 服务器运行在 :3478');

});

```



\*\*client/src/services/webrtcService.js\*\*



```javascript

import SimplePeer from 'simple-peer';

import io from 'socket.io-client';



const socket = io('http://your-ec2-ip:5000');



let iceConfig = null;



// 获取 ICE 配置

socket.emit('request-ice-config');



socket.on('ice-config', (config) => {

&nbsp; iceConfig = config;

&nbsp; console.log('收到 ICE 配置:', config);

});



export function createPeer(initiator) {

&nbsp; const peer = new SimplePeer({

&nbsp;   initiator,

&nbsp;   trickleIce: false,

&nbsp;   config: {

&nbsp;     iceServers: \[

&nbsp;       // STUN 服务器

&nbsp;       ...iceConfig.iceServers,

&nbsp;       // TURN 服务器

&nbsp;       ...iceConfig.turnServers

&nbsp;     ]

&nbsp;   },

&nbsp;   stream: null // 添加你的本地流

&nbsp; });



&nbsp; peer.on('signal', (data) => {

&nbsp;   socket.emit('signal', data);

&nbsp; });



&nbsp; return peer;

}

```



---



\## 🧪 测试连接



\### \*\*测试 TURN 是否工作\*\*



```bash

\# 在 EC2 上测试

sudo apt-get install stunclient -y

stunclient your-ec2-ip 3478



\# 或用在线工具测试

\# https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

```



\### \*\*查看连接日志\*\*



```bash

\# 查看应用日志

pm2 logs webrtc-app



\# 查看 TURN 日志

sudo tail -100f /var/log/coturn/coturn.log

```



---



\## ⚙️ EC2 配置建议



| 配置 | 适合场景 |

|------|---------|

| \*\*t3.micro\*\* (1 CPU, 1GB RAM) | 测试、<10 人同时通话 |

| \*\*t3.small\*\* (2 CPU, 2GB RAM) | 小型应用、<50 人 |

| \*\*t3.medium\*\* (2 CPU, 4GB RAM) | 中型应用、<200 人 |

| \*\*t3.large\*\* (2 CPU, 8GB RAM) | 大型应用、>500 人 |



---



\## 📊 一个 EC2 的性能指标



```

假设配置：t3.small (2 CPU, 2GB RAM)



应用占用：

├─ Node.js: ~200MB

├─ coturn: ~100-300MB（取决于连接数）

└─ 系统: ~500MB

&nbsp;  ────────────────

&nbsp;  总计: ~800MB（还有 1.2GB 可用）



网络消耗：

├─ 单个视频通话: ~500Kbps

├─ 5 个通话: ~2.5Mbps

└─ 10 个通话: ~5Mbps

&nbsp;  (EC2 通常有充足带宽)



建议：

✅ <20 个同时通话：t3.small 足够

⚠️ 20-50 个通话：升级到 t3.medium

❌ >50 个通话：需要多台 EC2 或更高配置

```



---



\## ✅ 完整清单



\- \[ ] EC2 实例已创建（t3.small 以上）

\- \[ ] 安全组已配置（5000, 3478, 49152-65535 端口）

\- \[ ] Node.js 已安装

\- \[ ] coturn 已安装并配置

\- \[ ] 应用已部署（pm2 启动）

\- \[ ] TURN 服务已启动

\- \[ ] 前端配置已更新（指向 EC2 IP）

\- \[ ] 测试连接成功

\- \[ ] 日志监控已启用



---



\## 🚀 一键启动脚本



\*\*deploy.sh\*\*



```bash

\#!/bin/bash



set -e



echo "🚀 开始部署 WebRTC 应用..."



\# 更新系统

sudo apt-get update \&\& sudo apt-get upgrade -y



\# 安装依赖

sudo apt-get install -y nodejs npm coturn git curl



\# 获取公网 IP

EC2\_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo "EC2 Public IP: $EC2\_IP"



\# 部署应用

git clone https://github.com/your-repo/webrtc-project.git

cd webrtc-project/server



npm install



\# 创建 .env

cat > .env << EOF

PORT=5000

NODE\_ENV=production

EC2\_PUBLIC\_IP=$EC2\_IP

TURN\_USERNAME=webrtc

TURN\_PASSWORD=webrtcpass123

EOF



\# 启动应用

npm install -g pm2

pm2 start index.js --name "webrtc-app"

pm2 startup

pm2 save



\# 配置 TURN

sudo cp /etc/coturn/turnserver.conf.default /etc/coturn/turnserver.conf



sudo tee /etc/coturn/turnserver.conf > /dev/null << EOF

listening-port=3478

listening-port=5349

listening-ip=0.0.0.0

external-ip=$EC2\_IP/$EC2\_IP

user=webrtc:webrtcpass123

realm=webrtc.example.com

log-file=/var/log/coturn/coturn.log

verbose

fingerprint

lt-cred-mech

EOF



sudo systemctl restart coturn

sudo systemctl enable coturn



echo "✅ 部署完成！"

echo "应用: http://$EC2\_IP:5000"

echo "TURN: $EC2\_IP:3478"

```



\*\*使用方式：\*\*



```bash

chmod +x deploy.sh

./deploy.sh

```



---



\*\*结论：一个 EC2 完全够用！👍\*\*



需要帮你配置\*\*SSL 证书（HTTPS）\*\*吗？

