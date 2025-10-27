# WebRTC 视频聊天应用

一个基于 WebRTC、Socket.io 和 React 的实时视频聊天应用，支持 AWS EC2 部署。

## 📋 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [配置说明](#配置说明)
- [AWS EC2 部署](#aws-ec2-部署)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## ✨ 功能特性

- ✅ 实时视频/音频通话
- ✅ 多房间支持
- ✅ 用户列表显示
- ✅ 自动重连机制
- ✅ 响应式设计
- ✅ AWS EC2 一键部署
- ✅ STUN/TURN 服务器支持

---

## 🛠️ 技术栈

### 前端
- React 18
- Material-UI (MUI)
- Simple-peer
- Socket.io-client
- Vite

### 后端
- Node.js
- Express
- Socket.io
- CORS
- Nodemon (开发)

### 部署
- AWS EC2
- Docker (可选)
- Coturn (TURN 服务器)

---

## 🚀 快速开始

### 前置要求

```bash
Node.js >= 14.0.0
npm >= 6.0.0
```

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/webrtc-demo.git
cd webrtc-demo
```

### 2. 后端设置

```bash
cd server
npm install

# 创建 .env 文件
cat > .env << EOF
PORT=5000
NODE_ENV=development
STUN_SERVER=stun.l.google.com
STUN_PORT=19302
TURN_SERVER=your-ec2-ip
TURN_PORT=3478
TURN_USERNAME=turnuser
TURN_PASSWORD=turnpass123
EOF

# 启动服务器
npm run dev
```

### 3. 前端设置

```bash
cd client
npm install

# 创建 .env 文件
cat > .env << EOF
VITE_SERVER_URL=http://localhost:5000
EOF

# 启动开发服务器
npm run dev
```

### 4. 访问应用

打开浏览器访问 `http://localhost:5173`

---

## 📁 项目结构

```
webrtc-demo/
├── server/
│   ├── package.json
│   ├── .env
│   ├── index.js
│   ├── config/
│   │   └── ice-config.js
│   └── routes/
│       └── socket.js
│
├── client/
│   ├── package.json
│   ├── .env
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── VideoChat.jsx
│   │   │   ├── UserList.jsx
│   │   │   └── CallControls.jsx
│   │   ├── hooks/
│   │   │   └── useWebRTC.js
│   │   └── utils/
│   │       └── socket.js
│   └── vite.config.js
│
├── docker-compose.yml (可选)
├── README.md
└── LICENSE
```

---

## ⚙️ 配置说明

### 后端配置 (server/.env)

```env
# 服务器基础配置
PORT=5000
NODE_ENV=development

# STUN 服务器配置（用于 NAT 穿透）
STUN_SERVER=stun.l.google.com
STUN_PORT=19302

# TURN 服务器配置（用于中继）
TURN_SERVER=your-ec2-ip
TURN_PORT=3478
TURN_USERNAME=turnuser
TURN_PASSWORD=turnpass123

# CORS 配置
CORS_ORIGIN=http://localhost:5173
```

### 前端配置 (client/.env)

```env
# 后端服务器地址
VITE_SERVER_URL=http://localhost:5000
```

### ICE 服务器配置

编辑 `server/config/ice-config.js`：

```javascript
module.exports = {
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302'],
    },
    {
      urls: ['turn:your-ec2-ip:3478'],
      username: 'turnuser',
      credential: 'turnpass123',
    },
  ],
};
```

---

## 🏗️ AWS EC2 部署

### 前置条件

- 一个 AWS EC2 实例 (t2.medium 或更高)
- Ubuntu 20.04 LTS
- 已配置安全组 (开放端口: 22, 80, 443, 5000, 3478)

### 部署步骤

#### 1. SSH 连接到 EC2

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

#### 2. 更新系统

```bash
sudo apt update
sudo apt upgrade -y
```

#### 3. 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

#### 4. 安装 Coturn (TURN 服务器)

```bash
sudo apt install -y coturn

# 配置 Coturn
sudo tee /etc/coturn/turnserver.conf > /dev/null << EOF
# 基础配置
listening-port=3478
listening-ip=0.0.0.0
relay-ip=$(hostname -I | awk '{print $1}')
external-ip=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# 用户认证
user=turnuser:turnpass123
realm=example.com

# 性能配置
max-bps=0
bps-capacity=0
EOF

# 启动 Coturn
sudo systemctl start coturn
sudo systemctl enable coturn
sudo systemctl status coturn
```

#### 5. 克隆项目

```bash
cd /home/ubuntu
git clone https://github.com/yourusername/webrtc-demo.git
cd webrtc-demo
```

#### 6. 部署后端

```bash
cd server
npm install

# 创建 .env 文件
cat > .env << EOF
PORT=5000
NODE_ENV=production
STUN_SERVER=stun.l.google.com
STUN_PORT=19302
TURN_SERVER=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
TURN_PORT=3478
TURN_USERNAME=turnuser
TURN_PASSWORD=turnpass123
CORS_ORIGIN=https://your-domain.com
EOF

# 使用 PM2 启动
sudo npm install -g pm2
pm2 start index.js --name webrtc-server
pm2 startup
pm2 save
```

#### 7. 部署前端

```bash
cd ../client
npm install

# 创建 .env 文件
cat > .env << EOF
VITE_SERVER_URL=https://your-domain.com:5000
EOF

# 构建
npm run build

# 使用 Nginx 服务静态文件
sudo apt install -y nginx
sudo cp -r dist/* /var/www/html/
sudo systemctl restart nginx
```

#### 8. 配置 SSL 证书 (使用 Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx

# 申请证书
sudo certbot certonly --standalone -d your-domain.com

# 配置 Nginx
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    location /socket.io {
        proxy_pass http://localhost:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo systemctl restart nginx
```

#### 9. 验证部署

```bash
# 检查后端运行状态
pm2 status

# 检查 TURN 服务器状态
sudo systemctl status coturn

# 查看日志
pm2 logs webrtc-server
```

### AWS 安全组配置

| 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|
| TCP | 22 | 0.0.0.0/0 | SSH |
| TCP | 80 | 0.0.0.0/0 | HTTP |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 5000 | 0.0.0.0/0 | 应用服务器 |
| TCP/UDP | 3478 | 0.0.0.0/0 | TURN 服务器 |
| UDP | 3478 | 0.0.0.0/0 | TURN 服务器 |

---

## ❓ 常见问题

### Q1: 无法看到远程视频？

**A:**
1. 检查浏览器权限（摄像头/麦克风）
2. 验证防火墙是否阻止 WebRTC
3. 检查 ICE 服务器配置是否正确
4. 查看浏览器控制台错误

### Q2: TURN 服务器连接失败？

**A:**
1. 确认 EC2 安全组已开放 3478 端口
2. 检查 Coturn 是否正在运行: `sudo systemctl status coturn`
3. 查看 Coturn 日志: `sudo journalctl -u coturn -f`
4. 验证用户名/密码是否正确

### Q3: 如何添加更多 STUN 服务器？

**A:** 编辑 `server/config/ice-config.js`：

```javascript
iceServers: [
  { urls: ['stun:stun.l.google.com:19302'] },
  { urls: ['stun:stun1.l.google.com:19302'] },
  { urls: ['stun:stun2.l.google.com:19302'] },
  // 添加更多 STUN 服务器
]
```

### Q4: 如何在多个房间中隔离连接？

**A:** Socket.io 已实现房间隔离。在前端：

```javascript
socket.emit('join-room', { roomId: 'room-name' });
```

### Q5: 生产环境推荐配置？

**A:**
- EC2 实例: t3.medium 或更高
- 内存: 至少 2GB
- 带宽: 至少 10Mbps
- 监控: 使用 CloudWatch

---

## 📊 国内 STUN 服务器推荐

| 服务商 | 地址 | 说明 |
|--------|------|------|
| Google | stun.l.google.com | 全球通用 |
| Twilio | stun.stunprotocol.org | 商用级 |
| Xirsys | global.xirsys.com | 付费（国内速度快） |
| 阿里云 | 自建 | 需额外部署 |
| 腾讯云 | 自建 | 需额外部署 |

---

## 🤝 贡献指南

欢迎贡献！请按以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📝 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

