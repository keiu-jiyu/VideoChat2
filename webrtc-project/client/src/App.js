import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Grid,
  Paper,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  CircularProgress,
  Snackbar,
  Alert
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import SocketService from './services/socketService';
import WebRTCService from './services/webrtcService';
import VideoContainer from './components/VideoContainer';
import UserList from './components/UserList';
import Controls from './components/Controls';

const useStyles = makeStyles((theme) => ({
  root: {
    background: '#1a1a1a',
    minHeight: '100vh',
    paddingTop: '20px',
    paddingBottom: '20px'
  },
  container: {
    maxWidth: '1400px'
  },
  videoGrid: {
    minHeight: '600px',
    marginBottom: '20px'
  },
  mainVideo: {
    minHeight: '600px'
  },
  remoteVideos: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  loginDialog: {
    '& .MuiDialog-paper': {
      background: '#2a2a2a',
      color: '#fff'
    }
  },
  textField: {
    '& .MuiOutlinedInput-root': {
      color: '#fff',
      '& fieldset': {
        borderColor: '#555'
      },
      '&:hover fieldset': {
        borderColor: '#888'
      }
    }
  },
  incomingCallDialog: {
    '& .MuiDialog-paper': {
      background: '#2a2a2a'
    }
  }
}));

const App = () => {
  const classes = useStyles();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('default');
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [peers, setPeers] = useState(new Map());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [iceServers, setIceServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});

  // ========== 初始化 ==========
  useEffect(() => {
    const socket = SocketService.connect();
    setCurrentUserId(socket.id);

    // 获取 ICE 服务器配置
    fetchIceServers();

    // 监听 Socket 事件
    socket.on('user-joined', handleUserJoined);
    socket.on('all-users', handleAllUsers);
    socket.on('signal', handleSignal);
    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-answered', handleCallAnswered);
    socket.on('call-rejected', handleCallRejected);
    socket.on('user-left', handleUserLeft);

    return () => {
      SocketService.off('user-joined', handleUserJoined);
      SocketService.off('all-users', handleAllUsers);
      SocketService.off('signal', handleSignal);
      SocketService.off('incoming-call', handleIncomingCall);
      SocketService.off('call-answered', handleCallAnswered);
      SocketService.off('call-rejected', handleCallRejected);
      SocketService.off('user-left', handleUserLeft);
    };
  }, []);

  // ========== 获取 ICE 服务器 ==========
  const fetchIceServers = async () => {
    try {
      const response = await fetch('/api/ice-servers');
      const data = await response.json();
      setIceServers(data.iceServers);
      console.log('📡 获取 ICE 服务器:', data);
    } catch (error) {
      console.error('❌ 获取 ICE 服务器失败:', error);
      showSnackbar('获取 ICE 服务器失败', 'error');
    }
  };

  // ========== 登录处理 ==========
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      showSnackbar('请输入用户名', 'warning');
      return;
    }

    setLoading(true);
    try {
      // 获取本地媒体流
      const stream = await WebRTCService.getLocalStream();
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 注册用户
      SocketService.register(username, room);
      setIsLoggedIn(true);
      showSnackbar(`欢迎 ${username}！`, 'success');
    } catch (error) {
      console.error('❌ 登录失败:', error);
      showSnackbar('登录失败：' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ========== Socket 事件处理 ==========
  const handleUserJoined = (data) => {
    setUsers(data.users);
    showSnackbar(`${data.username} 加入了房间`, 'info');
  };

  const handleAllUsers = (userList) => {
    setUsers(userList);
  };

  const handleUserLeft = (userId) => {
    setUsers(prev => prev.filter(u => u.userId !== userId));
    closePeerConnection(userId);
    showSnackbar('一个用户离线了', 'info');
  };

  const handleIncomingCall = (data) => {
    setIncomingCall(data);
    showSnackbar(`收到来自 ${data.username} 的呼叫`, 'info');
  };

  const handleCallAnswered = (data) => {
    const peer = peers.get(data.from);
    if (peer) {
      peer.signal(data.signal);
    }
  };

  const handleCallRejected = (data) => {
    showSnackbar('呼叫被拒绝', 'error');
    closePeerConnection(data.from);
  };

  const handleSignal = (data) => {
    const peer = peers.get(data.from);
    if (peer && data.signal) {
      peer.signal(data.signal);
    }
  };

  // ========== 呼叫用户 ==========
  const callUser = (user) => {
    console.log('📞 正在呼叫:', user.username);
    createPeerConnection(user.userId, true);
  };

  // ========== 创建 Peer 连接 ==========
  const createPeerConnection = (peerId, initiator = false) => {
    if (peers.has(peerId)) {
      console.log('⚠️ 连接已存在');
      return;
    }

    const peer = WebRTCService.createPeer(
      initiator,
      localStream,
      iceServers
    );

    peer.on('signal', (signal) => {
      if (initiator) {
        SocketService.callUser(peerId, currentUserId, username, signal);
      } else {
        SocketService.answerCall(peerId, signal);
      }
    });

    peer.on('stream', (stream) => {
      console.log('✅ 收到远程流');
      setRemoteStreams(prev => new Map(prev).set(peerId, stream));
      setIsCallActive(true);
    });

    peer.on('close', () => {
      closePeerConnection(peerId);
    });

    peer.on('error', (error) => {
      console.error('❌ Peer 连接错误:', error);
      showSnackbar('连接出错', 'error');
    });

    setPeers(prev => new Map(prev).set(peerId, peer));
  };

  // ========== 应答呼叫 ==========
  const acceptCall = () => {
    createPeerConnection(incomingCall.from, false);
    setIncomingCall(null);
    setIsCallActive(true);
    showSnackbar('已接听', 'success');
  };

  // ========== 拒绝呼叫 ==========
  const rejectCall = () => {
    SocketService.rejectCall(incomingCall.from);
    setIncomingCall(null);
    showSnackbar('已拒绝', 'info');
  };

  // ========== 关闭连接 ==========
  const closePeerConnection = (peerId) => {
    const peer = peers.get(peerId);
    if (peer) {
      peer.destroy();
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(peerId);
        return newPeers;
      });
    }

    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(peerId);
      if (newStreams.size === 0) {
        setIsCallActive(false);
      }
      return newStreams;
    });
  };

  // ========== 挂断所有通话 ==========
  const endAllCalls = () => {
    peers.forEach((peer, peerId) => {
      closePeerConnection(peerId);
    });
    setIsCallActive(false);
    showSnackbar('已挂断所有通话', 'info');
  };

  // ========== 切换音频 ==========
  const toggleAudio = () => {
    if (localStream) {
      WebRTCService.toggleMediaTrack(localStream, 'audio', !audioEnabled);
      setAudioEnabled(!audioEnabled);
      showSnackbar(audioEnabled ? '麦克风已关闭' : '麦克风已打开', 'info');
    }
  };

  // ========== 切换视频 ==========
  const toggleVideo = () => {
    if (localStream) {
      WebRTCService.toggleMediaTrack(localStream, 'video', !videoEnabled);
      setVideoEnabled(!videoEnabled);
      showSnackbar(videoEnabled ? '摄像头已关闭' : '摄像头已打开', 'info');
    }
  };

  // ========== 显示通知 ==========
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // ========== 未登录界面 ==========
  if (!isLoggedIn) {
    return (
      <Container maxWidth="sm" className={classes.root}>
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <Paper style={{ padding: '40px', borderRadius: '12px', background: '#2a2a2a' }}>
            <Typography variant="h3" gutterBottom align="center" style={{ marginBottom: '30px' }}>
              📹 WebRTC 视频聊天
            </Typography>

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="normal"
                className={classes.textField}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="房间（可选）"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                margin="normal"
                className={classes.textField}
                disabled={loading}
              />

              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                type="submit"
                style={{ marginTop: '20px', height: '50px', fontSize: '16px' }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : '进入聊天'}
              </Button>
            </form>
          </Paper>
        </Box>
      </Container>
    );
  }

  // ========== 登录后界面 ==========
  return (
    <Container maxWidth="lg" className={`${classes.root} ${classes.container}`}>
      <Grid container spacing={2}>
        {/* 本地视频 */}
        <Grid item xs={12} md={8}>
          <VideoContainer
            videoRef={localVideoRef}
            username={username}
            muted={true}
            isLocal={true}
          />
        </Grid>

        {/* 用户列表 */}
        <Grid item xs={12} md={4}>
          <UserList
            users={users}
            currentUserId={currentUserId}
            onCall={callUser}
          />
        </Grid>

        {/* 远程视频 */}
        {remoteStreams.size > 0 && (
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              远程用户
            </Typography>
            <Box className={classes.remoteVideos}>
              {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
                <video
                  key={peerId}
                  autoPlay
                  playsInline
                  ref={(ref) => {
                    if (ref) {
                      ref.srcObject = stream;
                    }
                  }}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    background: '#000'
                  }}
                />
              ))}
            </Box>
          </Grid>
        )}

        {/* 控制条 */}
        <Grid item xs={12}>
          <Controls
            isCallActive={isCallActive}
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onEndCall={endAllCalls}
          />
        </Grid>
      </Grid>

      {/* 来电对话框 */}
      <Dialog
        open={!!incomingCall}
        className={classes.incomingCallDialog}
      >
        <DialogTitle>📞 来电</DialogTitle>
        <DialogContent>
          <Typography>
            {incomingCall?.username} 正在呼叫你
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={rejectCall} color="secondary">
            拒绝
          </Button>
          <Button onClick={acceptCall} color="primary" variant="contained">
            接听
          </Button>
        </DialogActions>
      </Dialog>

      {/* 通知 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default App;