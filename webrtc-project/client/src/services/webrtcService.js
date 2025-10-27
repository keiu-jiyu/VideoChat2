import SimplePeer from 'simple-peer';

const WebRTCService = {
  /**
   * 创建 Peer 连接
   */
  createPeer: (initiator, stream, iceServers) => {
    return new SimplePeer({
      initiator,
      stream,
      config: {
        iceServers: iceServers || [
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      },
      trickleIce: true
    });
  },

  /**
   * 获取本地媒体流
   */
  getLocalStream: async (constraints = { video: true, audio: true }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ 获取本地媒体成功');
      return stream;
    } catch (error) {
      console.error('❌ 获取本地媒体失败:', error);
      throw error;
    }
  },

  /**
   * 停止媒体流
   */
  stopStream: (stream) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ 媒体流已停止');
    }
  },

  /**
   * 获取音视频设备列表
   */
  getDevices: async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      return { videoDevices, audioDevices };
    } catch (error) {
      console.error('❌ 获取设备列表失败:', error);
      throw error;
    }
  },

  /**
   * 切换音频/视频
   */
  toggleMediaTrack: (stream, kind, enabled) => {
    stream.getTracks()
      .filter(track => track.kind === kind)
      .forEach(track => {
        track.enabled = enabled;
      });
  }
};

export default WebRTCService;