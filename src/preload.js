const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: (username, password) => ipcRenderer.invoke('user-login', { username, password }),
  register: (username, email, password, displayName) => ipcRenderer.invoke('user-register', { username, email, password, displayName }),
  testDbConnection: () => ipcRenderer.invoke('test-db-connection'),
  saveMessage: (conversationId, senderId, messageText) => ipcRenderer.invoke('save-message', { conversationId, senderId, messageText }),
  getMessages: (conversationId) => ipcRenderer.invoke('get-messages', conversationId)
});