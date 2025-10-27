require('dotenv').config();
const express = require('express');
const socketIO = require('socket.io');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { getIceServers } = require('./config/ice-servers');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ========== 中间件配置 ==========
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// ========== 创建服务器 ==========
let server;

if (NODE_ENV === 'production') {
  // 生产环境：使用 HTTPS
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
  };
  server = https.createServer(options, app);
  console.log('🔒 使用 HTTPS 服务器');
} else {
  // 开发环境：使用 HTTP
  server = http.createServer(app);
  console.log('📡 使用 HTTP 服务器');
}

// ========== Socket.IO 配置 ==========
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// ========== 存储在线用户 ==========
const users = new Map();
const rooms = new Map();

// ========== REST API 端点 ==========

/**
 * 获取 ICE 服务器配置
 * 前端通过此端点获取 STUN/TURN 服务器地址
 */
app.get('/api/ice-servers', (req, res) => {
  try {
    const iceServers = getIceServers();
    res.json(iceServers);
    console.log('📡 发送 ICE 配置:', iceServers);
  } catch (error) {
    console.error('❌ 获取 ICE 配置失败:', error);
    res.status(500).json({ error: '获取 ICE 配置失败' });
  }
});

/**
 * 获取所有在线用户
 */
app.get('/api/users', (req, res) => {
  const userList = Array.from(users.values()).map(user => ({
    userId: user.socketId,
    username: user.username,
    room: user.room
  }));
  res.json(userList);
});

/**
 * 获取房间列表
 */
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.entries()).map(([roomId, room]) => ({
    roomId,
    name: room.name,
    userCount: room.users.length,
    users: room.users
  }));
  res.json(roomList);
});

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    userCount: users.size,
    roomCount: rooms.size
  });
});

// ========== Socket.IO 事件处理 ==========

io.on('connection', (socket) => {
  console.log(`\n✅ 用户连接: ${socket.id}`);

  /**
   * 用户注册事件
   */
  socket.on('register', (data) => {
    const { username, room } = data;

    // 保存用户信息
    users.set(socket.id, {
      socketId: socket.id,
      username,
      room: room || 'default'
    });

    // 加入房间
    socket.join(room || 'default');

    // 初始化房间
    if (!rooms.has(room || 'default')) {
      rooms.set(room || 'default', {
        name: room || 'default',
        users: []
      });
    }
    rooms.get(room || 'default').users.push(socket.id);

    console.log(`👤 ${username} 加入房间: ${room || 'default'}`);

    // 广播新用户加入
    io.to(room || 'default').emit('user-joined', {
      userId: socket.id,
      username,
      users: Array.from(users.values())
        .filter(u => u.room === (room || 'default'))
        .map(u => ({ userId: u.socketId, username: u.username }))
    });
  });

  /**
   * 获取房间内所有用户
   */
  socket.on('get-users', (room) => {
    const roomUsers = Array.from(users.values())
      .filter(u => u.room === room)
      .map(u => ({ userId: u.socketId, username: u.username }));
    socket.emit('all-users', roomUsers);
  });

  /**
   * 信令消息转发（SDP offer/answer, ICE candidates）
   */
  socket.on('signal', (data) => {
    const { to, signal } = data;
    console.log(`📨 转发信令: ${socket.id} -> ${to}`);
    io.to(to).emit('signal', {
      from: socket.id,
      signal
    });
  });

  /**
   * 发送呼叫请求
   */
  socket.on('call-user', (data) => {
    const { to, from, username } = data;
    console.log(`📞 呼叫: ${username} -> ${to}`);
    io.to(to).emit('incoming-call', {
      from,
      username,
      signal: data.signal
    });
  });

  /**
   * 呼叫应答
   */
  socket.on('answer-call', (data) => {
    const { to, signal } = data;
    console.log(`✅ 应答呼叫: ${socket.id} -> ${to}`);
    io.to(to).emit('call-answered', {
      from: socket.id,
      signal
    });
  });

  /**
   * 拒绝呼叫
   */
  socket.on('reject-call', (data) => {
    const { to } = data;
    console.log(`❌ 拒绝呼叫: ${socket.id} -> ${to}`);
    io.to(to).emit('call-rejected', {
      from: socket.id
    });
  });

  /**
   * 断开连接事件
   */
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`\n❌ 用户断开连接: ${user.username} (${socket.id})`);

      // 从房间中移除用户
      const room = rooms.get(user.room);
      if (room) {
        room.users = room.users.filter(id => id !== socket.id);
        if (room.users.length === 0) {
          rooms.delete(user.room);
        }
      }

      // 从用户列表中移除
      users.delete(socket.id);

      // 广播用户离线
      io.to(user.room).emit('user-left', socket.id);
    }
  });

  /**
   * 错误处理
   */
  socket.on('error', (error) => {
    console.error(`❌ Socket 错误 (${socket.id}):`, error);
  });
});

// ========== 服务器启动 ==========
server.listen(PORT, '0.0.0.0', () => {
  const protocol = NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.EC2_PUBLIC_IP || 'localhost';
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 WebRTC 服务器运行中`);
  console.log(`📍 地址: ${protocol}://${host}:${PORT}`);
  console.log(`🌍 环境: ${NODE_ENV}`);
  console.log(`📡 TURN 服务器: ${process.env.TURN_SERVER}:${process.env.TURN_PORT}`);
  console.log(`${'='.repeat(60)}\n`);
});

// ========== 优雅关闭 ==========
process.on('SIGTERM', () => {
  console.log('\n📴 收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});