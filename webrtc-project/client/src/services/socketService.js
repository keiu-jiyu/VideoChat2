import io from 'socket.io-client';

let socket = null;

const getServerUrl = () => {
  // 开发环境
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000';
  }
  // 生产环境
  return window.location.origin;
};

const SocketService = {
  connect: () => {
    if (!socket) {
      socket = io(getServerUrl(), {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('✅ Socket 已连接:', socket.id);
      });

      socket.on('disconnect', () => {
        console.log('❌ Socket 已断开');
      });

      socket.on('error', (error) => {
        console.error('❌ Socket 错误:', error);
      });
    }
    return socket;
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket: () => {
    return socket || SocketService.connect();
  },

  // 注册用户
  register: (username, room) => {
    SocketService.getSocket().emit('register', { username, room });
  },

  // 获取所有用户
  getUsers: (room) => {
    SocketService.getSocket().emit('get-users', room);
  },

  // 发送信令
  sendSignal: (to, signal) => {
    SocketService.getSocket().emit('signal', { to, signal });
  },

  // 呼叫用户
  callUser: (to, from, username, signal) => {
    SocketService.getSocket().emit('call-user', {
      to,
      from,
      username,
      signal
    });
  },

  // 应答呼叫
  answerCall: (to, signal) => {
    SocketService.getSocket().emit('answer-call', { to, signal });
  },

  // 拒绝呼叫
  rejectCall: (to) => {
    SocketService.getSocket().emit('reject-call', { to });
  },

  // 监听事件
  on: (event, callback) => {
    SocketService.getSocket().on(event, callback);
  },

  // 移除事件监听
  off: (event, callback) => {
    SocketService.getSocket().off(event, callback);
  }
};

export default SocketService;