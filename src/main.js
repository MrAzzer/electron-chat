const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./db');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('src/index.html');
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Initialize database and create window
// In your main.js, update the app.whenReady() section:
app.whenReady().then(async () => {
  try {
    console.log('Initializing application...');
    await db.initializeDatabase();
    console.log('Database initialized, creating window...');
    createWindow();
    
    // Debug: Check database state after a short delay
    setTimeout(() => {
      db.debugDatabaseState().catch(console.error);
    }, 2000);
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    // Show error dialog to user
    dialog.showErrorBox('Database Error', `Failed to initialize database: ${error.message}\n\nPlease check your MySQL server and try again.`);
    // Even if DB fails, still create the window but show error
    createWindow();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for database operations
ipcMain.handle('test-db-connection', async () => {
  try {
    return await db.testConnection();
  } catch (error) {
    console.error('Test connection failed:', error);
    return false;
  }
});

ipcMain.handle('user-login', async (event, { username, password }) => {
  try {
    const user = await db.getUserByUsername(username);
    // For demo purposes only - in production, use proper password hashing!
    if (user && user.password === password) {
      return { success: true, user };
    }
    return { success: false, error: 'Invalid username or password' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('user-register', async (event, { username, email, password, displayName }) => {
  try {
    const userId = await db.createUser(username, email, password, displayName);
    return { success: true, userId };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-message', async (event, { conversationId, senderId, messageText }) => {
  try {
    console.log('Main: Saving message:', { conversationId, senderId, messageText });
    const messageId = await db.saveMessage(conversationId, senderId, messageText);
    return { success: true, messageId };
  } catch (error) {
    console.error('Save message error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-messages', async (event, conversationId) => {
  try {
    console.log('Main: Getting messages for conversation:', conversationId);
    const messages = await db.getMessages(conversationId);
    return { success: true, messages };
  } catch (error) {
    console.error('Get messages error:', error);
    return { success: false, error: error.message };
  }
});

// Get user conversations
ipcMain.handle('get-user-conversations', async (event, userId) => {
  try {
    console.log('Main: Getting conversations for user:', userId);
    const conversations = await db.getUserConversations(userId);
    return { success: true, conversations };
  } catch (error) {
    console.error('Get conversations error:', error);
    return { success: false, error: error.message };
  }
});

// Get all conversations (for joining) - FIXED VERSION
ipcMain.handle('get-all-conversations', async () => {
  try {
    console.log('Main: Getting all conversations for joining');
    
    // Check if promisePool is available
    if (!db.promisePool) {
      throw new Error('Database connection not established');
    }
    
    const [conversations] = await db.promisePool.execute(`
      SELECT c.*, 
             COUNT(DISTINCT cp.user_id) as member_count,
             COUNT(m.id) as message_count
      FROM conversations c
      LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN messages m ON c.id = m.conversation_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    
    console.log('Found conversations:', conversations.length);
    return { success: true, conversations };
  } catch (error) {
    console.error('Get all conversations error:', error);
    return { success: false, error: error.message };
  }
});

// Create new conversation
ipcMain.handle('create-conversation', async (event, { name, createdBy }) => {
  try {
    console.log('Main: Creating conversation:', name, 'by user:', createdBy);
    const conversationId = await db.createConversation(name, createdBy);
    
    // Automatically add the creator to the conversation
    await db.addUserToConversation(conversationId, createdBy);
    
    return { success: true, conversationId };
  } catch (error) {
    console.error('Create conversation error:', error);
    return { success: false, error: error.message };
  }
});

// Add user to conversation
ipcMain.handle('add-user-to-conversation', async (event, { conversationId, userId }) => {
  try {
    console.log('Main: Adding user to conversation:', userId, '->', conversationId);
    await db.addUserToConversation(conversationId, userId);
    return { success: true };
  } catch (error) {
    console.error('Add user to conversation error:', error);
    return { success: false, error: error.message };
  }
});

// Edit message
ipcMain.handle('edit-message', async (event, { messageId, newText }) => {
  try {
    await db.promisePool.execute(
      'UPDATE messages SET message_text = ?, is_edited = TRUE, edited_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newText, messageId]
    );
    return { success: true };
  } catch (error) {
    console.error('Edit message error:', error);
    return { success: false, error: error.message };
  }
});

// Delete message
ipcMain.handle('delete-message', async (event, messageId) => {
  try {
    await db.promisePool.execute(
      'UPDATE messages SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [messageId]
    );
    return { success: true };
  } catch (error) {
    console.error('Delete message error:', error);
    return { success: false, error: error.message };
  }
});

// Get video chat token (you'll need to integrate with a service like Twilio, Agora, etc.)
ipcMain.handle('get-video-token', async (event, { userId, conversationId }) => {
  try {
    // This is a placeholder - implement based on your video service
    const token = generateVideoToken(userId, conversationId);
    return { success: true, token };
  } catch (error) {
    console.error('Get video token error:', error);
    return { success: false, error: error.message };
  }
});

// Helper function for video token generation (placeholder)
function generateVideoToken(userId, conversationId) {
  // Implement based on your video service API
  return `video-token-${userId}-${conversationId}-${Date.now()}`;
}

// Debug function to check database state
ipcMain.handle('debug-database-state', async () => {
  try {
    await db.debugDatabaseState();
    return { success: true };
  } catch (error) {
    console.error('Debug error:', error);
    return { success: false, error: error.message };
  }
});

// Debug: Log all registered IPC handlers
console.log('Registered IPC handlers:');
console.log(Array.from(ipcMain.eventNames()));

module.exports = { app };