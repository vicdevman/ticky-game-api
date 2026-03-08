const onlineUsers = {}; // userId -> socketId
const socketIdToUsers = {}; // socketId -> userId

export const presenceService = {
  addUser(userId, socketId) {
    onlineUsers[userId] = socketId;
    socketIdToUsers[socketId] = userId;
  },

  removeBySocketId(socketId) {
    const userId = socketIdToUsers[socketId];
    if (userId) {
      delete onlineUsers[userId];
      delete socketIdToUsers[socketId];
    }
    return userId;
  },

  getOnlineUserIds() {
    return Object.keys(onlineUsers);
  },

  getSocketId(userId) {
    return onlineUsers[userId];
  },

  isUserOnline(userId) {
    return !!onlineUsers[userId];
  },

  getUserIdBySocketId(socketId) {
    return socketIdToUsers[socketId];
  },
};
