const { ipcRenderer } = require('electron');

// Global state
window.currentUser = null;
window.currentConversationId = null;
window.conversations = [];

// Auth module
const auth = {
    // DOM elements
    authContainer: null,
    loginBtn: null,
    registerBtn: null,
    logoutBtn: null,
    
    // Initialize auth module
    init: function() {
        this.authContainer = document.getElementById('authContainer');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.loadAuthOptions();
    },
    
    // Load auth options HTML
    loadAuthOptions: function() {
        // Use inline HTML instead of fetch to avoid path issues
        const authOptionsHTML = `
            <div class="auth-options">
                <h2>Welcome</h2>
                <button id="loginBtn" class="auth-btn">Login</button>
                <button id="registerBtn" class="auth-btn">Register</button>
            </div>
        `;
        
        this.authContainer.innerHTML = authOptionsHTML;
        this.setupAuthEventListeners();
    },
    
    // Setup auth event listeners
    setupAuthEventListeners: function() {
        this.loginBtn = document.getElementById('loginBtn');
        this.registerBtn = document.getElementById('registerBtn');
        
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => {
                this.showLoginForm();
            });
        }
        
        if (this.registerBtn) {
            this.registerBtn.addEventListener('click', () => {
                this.showRegisterForm();
            });
        }
    },
    
    // Show login form
    showLoginForm: function() {
        const loginFormHTML = `
            <div class="auth-form">
                <h2>Login</h2>
                <div class="form-group">
                    <label for="loginUsername">Username:</label>
                    <input type="text" id="loginUsername" placeholder="Enter username">
                </div>
                <div class="form-group">
                    <label for="loginPassword">Password:</label>
                    <input type="password" id="loginPassword" placeholder="Enter password">
                </div>
                <div class="form-buttons">
                    <button class="back-btn" id="backToAuthBtn">Back</button>
                    <button id="loginSubmitBtn">Login</button>
                </div>
            </div>
        `;
        
        this.authContainer.innerHTML = loginFormHTML;
        
        // Add event listeners to the new buttons
        document.getElementById('backToAuthBtn').addEventListener('click', () => {
            this.loadAuthOptions();
        });
        
        document.getElementById('loginSubmitBtn').addEventListener('click', () => {
            this.login();
        });
    },
    
    // Show register form
    showRegisterForm: function() {
        const registerFormHTML = `
            <div class="auth-form">
                <h2>Register</h2>
                <div class="form-group">
                    <label for="regUsername">Username:</label>
                    <input type="text" id="regUsername" placeholder="Choose username">
                </div>
                <div class="form-group">
                    <label for="regEmail">Email:</label>
                    <input type="email" id="regEmail" placeholder="Enter email">
                </div>
                <div class="form-group">
                    <label for="regPassword">Password:</label>
                    <input type="password" id="regPassword" placeholder="Choose password">
                </div>
                <div class="form-group">
                    <label for="regDisplayName">Display Name:</label>
                    <input type="text" id="regDisplayName" placeholder="Optional display name">
                </div>
                <div class="form-buttons">
                    <button class="back-btn" id="backToAuthFromRegBtn">Back</button>
                    <button id="registerSubmitBtn">Register</button>
                </div>
            </div>
        `;
        
        this.authContainer.innerHTML = registerFormHTML;
        
        // Add event listeners to the new buttons
        document.getElementById('backToAuthFromRegBtn').addEventListener('click', () => {
            this.loadAuthOptions();
        });
        
        document.getElementById('registerSubmitBtn').addEventListener('click', () => {
            this.register();
        });
    },
    
    // Login function
    login: async function() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            this.showMessage('Logging in...', 'info');
            const result = await ipcRenderer.invoke('user-login', { username, password });
            
            if (result.success) {
                window.currentUser = result.user;
                this.showMessage('Login successful!', 'success');
                setTimeout(() => {
                    chat.showChatInterface();
                    sidebar.loadConversations();
                }, 1000);
            } else {
                this.showMessage(result.error, 'error');
            }
        } catch (error) {
            this.showMessage('Login failed: ' + error.message, 'error');
        }
    },
    
    // Register function
    register: async function() {
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const displayName = document.getElementById('regDisplayName').value;

        if (!username || !email || !password) {
            this.showMessage('Please fill in all required fields', 'error');
            return;
        }

        try {
            this.showMessage('Creating account...', 'info');
            const result = await ipcRenderer.invoke('user-register', {
                username,
                email,
                password,
                displayName
            });

            if (result.success) {
                this.showMessage('Registration successful! Please login.', 'success');
                setTimeout(() => {
                    this.showLoginForm();
                }, 1500);
            } else {
                this.showMessage(result.error, 'error');
            }
        } catch (error) {
            this.showMessage('Registration failed: ' + error.message, 'error');
        }
    },
    
    // Show message in auth container
    showMessage: function(text, type = 'info') {
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `auth-message ${type}`;
        messageElement.textContent = text;
        messageElement.style.padding = '10px';
        messageElement.style.margin = '10px 0';
        messageElement.style.borderRadius = '4px';
        messageElement.style.textAlign = 'center';
        
        if (type === 'error') {
            messageElement.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            messageElement.style.color = '#f87171';
            messageElement.style.border = '1px solid #f87171';
        } else if (type === 'success') {
            messageElement.style.backgroundColor = 'rgba(74, 222, 128, 0.1)';
            messageElement.style.color = '#4ade80';
            messageElement.style.border = '1px solid #4ade80';
        } else {
            messageElement.style.backgroundColor = 'rgba(96, 165, 250, 0.1)';
            messageElement.style.color = '#93c5fd';
            messageElement.style.border = '1px solid #93c5fd';
        }
        
        // Add message to auth container
        this.authContainer.prepend(messageElement);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 3000);
    },
    
    // Logout function
    logout: function() {
        window.currentUser = null;
        window.currentConversationId = null;
        window.conversations = [];
        
        document.getElementById('mainApp').style.display = 'none';
        this.authContainer.style.display = 'block';
        this.logoutBtn.style.display = 'none';
        
        this.loadAuthOptions();
        
        // Clear messages if chat container exists
        const messagesContainer = document.getElementById('messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        document.querySelector('header h1').textContent = 'Electron Chat';
        
        // Reset input fields if they exist
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        if (messageInput) {
            messageInput.value = '';
            messageInput.disabled = true;
        }
        
        if (sendButton) {
            sendButton.disabled = true;
        }
    }
};

// Chat module
const chat = {
    // Initialize chat module
    init: function() {
        console.log('Chat initialized');
    },
    
    // Show chat interface
    showChatInterface: function() {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        document.getElementById('logoutBtn').style.display = 'block';
        document.querySelector('header h1').textContent = `Electron Chat - ${window.currentUser.username}`;
    },
    
    // Show message
    showMessage: function(text, type = 'info') {
        console.log(`${type}: ${text}`);
    },
    
    // Add system message
    addSystemMessage: function(text) {
        console.log(`System: ${text}`);
    }
};

// Sidebar module
const sidebar = {
    // Initialize sidebar module
    init: function() {
        console.log('Sidebar initialized');
    },
    
    // Load conversations
    loadConversations: function() {
        console.log('Loading conversations...');
    }
};

// Modals module
const modals = {
    // Initialize modals module
    init: function() {
        console.log('Modals initialized');
    },
    
    // Show new conversation modal
    showNewConversationModal: function() {
        alert('New conversation modal would appear here');
    },
    
    // Show join conversation modal
    showJoinConversationModal: function() {
        alert('Join conversation modal would appear here');
    },
    
    // Show video chat modal
    showVideoChatModal: function() {
        alert('Video chat modal would appear here');
    }
};

// Message module
const message = {
    // Start editing a message
    startEditMessage: async function(messageId, currentText) {
        // Create edit interface
        const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
        const messageContent = messageElement.querySelector('.message-content');
        
        messageContent.innerHTML = `
            <input type="text" class="edit-message-input" value="${currentText}" id="editInput-${messageId}">
            <div class="edit-actions">
                <button onclick="message.saveEditedMessage('${messageId}')">Save</button>
                <button onclick="message.cancelEditMessage('${messageId}', '${escapeHtml(currentText)}')">Cancel</button>
            </div>
        `;
        
        const input = document.getElementById(`editInput-${messageId}`);
        input.focus();
        input.select();
    },
    
    // Save edited message
    saveEditedMessage: async function(messageId) {
        const newText = document.getElementById(`editInput-${messageId}`).value.trim();
        
        if (!newText) {
            chat.showMessage('Message cannot be empty', 'error');
            return;
        }
        
        try {
            const result = await ipcRenderer.invoke('edit-message', {
                messageId: messageId,
                newText: newText
            });
            
            if (result.success) {
                // Reload messages to show the edited version
                await sidebar.loadMessages();
            } else {
                chat.showMessage('Failed to edit message: ' + result.error, 'error');
            }
        } catch (error) {
            chat.showMessage('Error editing message: ' + error.message, 'error');
        }
    },
    
    // Cancel message editing
    cancelEditMessage: function(messageId, originalText) {
        const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
        const messageContent = messageElement.querySelector('.message-content');
        messageContent.innerHTML = originalText;
    },
    
    // Delete message
    deleteMessage: async function(messageId) {
        if (!confirm('Are you sure you want to delete this message?')) {
            return;
        }
        
        try {
            const result = await ipcRenderer.invoke('delete-message', messageId);
            
            if (result.success) {
                // Update UI to show message as deleted
                const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
                messageElement.classList.add('deleted');
                messageElement.querySelector('.message-content').innerHTML = '<div class="deleted-message">Message deleted</div>';
                messageElement.querySelector('.message-actions').remove();
            } else {
                chat.showMessage('Failed to delete message: ' + result.error, 'error');
            }
        } catch (error) {
            chat.showMessage('Error deleting message: ' + error.message, 'error');
        }
    }
};

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize app
async function initializeApp() {
    try {
        console.log('Initializing app...');
        
        // Initialize auth module first
        auth.init();
        
        // Initialize other modules
        sidebar.init();
        chat.init();
        modals.init();
        
        // Test database connection
        const connectionResult = await ipcRenderer.invoke('test-db-connection');
        if (!connectionResult) {
            auth.showMessage('Database connection failed. Please check your MySQL server.', 'error');
        }
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        auth.showMessage('App initialization error: ' + error.message, 'error');
    }
}

// Make functions available globally
window.auth = auth;
window.chat = chat;
window.sidebar = sidebar;
window.modals = modals;
window.message = message;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);