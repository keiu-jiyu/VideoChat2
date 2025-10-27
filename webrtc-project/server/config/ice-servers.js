require('dotenv').config();

const getIceServers = () => {
  const EC2_PUBLIC_IP = process.env.EC2_PUBLIC_IP;
  const TURN_SERVER = process.env.TURN_SERVER;
  const TURN_PORT = process.env.TURN_PORT || 3478;
  const TURN_USERNAME = process.env.TURN_USERNAME;
  const TURN_PASSWORD = process.env.TURN_PASSWORD;

  return {
    iceServers: [
      // ========== STUN 服务器（免费，用于获取公网 IP） ==========
      {
        urls: [
          process.env.STUN_SERVER_1 || 'stun:stun1.l.google.com:19302',
          process.env.STUN_SERVER_2 || 'stun:stun2.l.google.com:19302'
        ]
      },

      // ========== TURN 服务器（中继，用于 NAT 穿透失败时） ==========
      {
        urls: [`turn:${TURN_SERVER}:${TURN_PORT}?transport=udp`],
        username: TURN_USERNAME,
        credential: TURN_PASSWORD
      },
      {
        urls: [`turn:${TURN_SERVER}:${TURN_PORT}?transport=tcp`],
        username: TURN_USERNAME,
        credential: TURN_PASSWORD
      }
    ],
    iceCandidatePoolSize: 10
  };
};

module.exports = {
  getIceServers
};