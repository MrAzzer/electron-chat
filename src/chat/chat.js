const { ipcRenderer } = require('electron');

const chat = {
    // DOM elements
    messagesContainer: null,
    messageInput: null,
    sendButton: null,
    currentConversationName: null,
    
    // Initialize chat module
    init: function() {
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.currentConversationName = document.getElementById('currentConversationName');
        this.setupChatEventListeners();
    },
    
    // Setup chat event listeners
    setupChatEventListeners: function() {
        // Remove any existing listeners to avoid duplicates
        if (this.sendButton) {
            this.sendButton.replaceWith(this.sendButton.cloneNode(true));
            this.sendButton = document.getElementById('sendButton');
        }
        if (this.messageInput) {
            this.messageInput.replaceWith(this.messageInput.cloneNode(true));
            this.messageInput = document.getElementById('messageInput');
        }

        // Add fresh event listeners
        if (this.sendButton) this.sendButton.addEventListener('click', this.sendMessage);
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        console.log('Chat event listeners setup complete');
    },
    
    // Show chat interface
    showChatInterface: function() {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        document.getElementById('logoutBtn').style.display = 'block';
        document.querySelector('header h1').textContent = `Electron Chat - ${window.currentUser.username}`;
        
        // Setup chat event listeners after chat interface is shown
        this.setupChatEventListeners();
    },
    
    // Send message
    sendMessage: async function() {
        const messageText = chat.messageInput.value.trim();
        
        console.log('Send message attempt:', {
            hasText: !!messageText,
            hasUser: !!window.currentUser,
            userId: window.currentUser?.id,
            hasConversation: !!window.currentConversationId,
            conversationId: window.currentConversationId
        });

        if (!messageText) {
            console.log('No message text to send');
            return;
        }
        
        if (!window.currentUser) {
            console.log('No user logged in');
            chat.addSystemMessage('Please log in to send messages');
            return;
        }
        
        if (!window.currentConversationId) {
            console.log('No conversation selected');
            chat.addSystemMessage('Please select a conversation first');
            return;
        }

        try {
            console.log('Sending message to conversation:', window.currentConversationId);
            
            const result = await ipcRenderer.invoke('save-message', {
                conversationId: window.currentConversationId,
                senderId: window.currentUser.id,
                messageText: messageText
            });

            console.log('Message send result:', result);

            if (result.success) {
                console.log('Message saved successfully with ID:', result.messageId);
                
                // Add message to UI immediately
                const messageData = {
                    messageText: messageText,
                    username: window.currentUser.username,
                    displayName: window.currentUser.displayName,
                    createdAt: new Date(),
                    senderId: window.currentUser.id
                };
                chat.addMessageToUI(messageData);
                
                // Clear input
                chat.messageInput.value = '';
                
                // Reload conversations to update last activity
                sidebar.loadConversations();
                
                console.log('Message UI update complete');
            } else {
                console.error('Failed to send message:', result.error);
                chat.addSystemMessage('Failed to send message: ' + result.error);
            }
        } catch (error) {
            console.error('Send message error:', error);
            chat.addSystemMessage('Error sending message: ' + error.message);
        }
    },
    
    // Add message to UI
    addMessageToUI: function(message) {
        const messageElement = document.createElement('div');
        const isOwnMessage = message.senderId === window.currentUser?.id;
        messageElement.className = `message ${isOwnMessage ? 'own' : 'other'} ${message.is_deleted ? 'deleted' : ''}`;
        messageElement.dataset.messageId = message.id;
        
        const displayName = message.displayName || message.username;
        const timestamp = message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : 'Just now';
        
        let messageContent = '';
        if (message.is_deleted) {
            messageContent = '<div class="message-content deleted-message">Message deleted</div>';
        } else {
            messageContent = `
                <div class="message-content">${this.escapeHtml(message.messageText)}</div>
                ${message.is_edited ? '<span class="edited-indicator">(edited)</span>' : ''}
            `;
        }
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="username">${displayName}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            ${messageContent}
            ${isOwnMessage && !message.is_deleted ? `
                <div class="message-actions">
                    <button class="edit-btn" onclick="message.startEditMessage('${message.id}', '${this.escapeHtml(message.messageText)}')">Edit</button>
                    <button class="delete-btn" onclick="message.deleteMessage('${message.id}')">Delete</button>
                </div>
            ` : ''}
        `;
        
        this.messagesContainer.appendChild(messageElement);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    },
    
    // Add system message
    addSystemMessage: function(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.textContent = text;
        this.messagesContainer.appendChild(messageElement);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    },
    
    // Show message
    showMessage: function(text, type = 'info') {
        // Clear any existing system messages first
        const existingMessages = this.messagesContainer.querySelectorAll('.message.system');
        existingMessages.forEach(msg => msg.remove());
        
        const messageElement = document.createElement('div');
        messageElement.className = `message system ${type}`;
        messageElement.textContent = text;
        this.messagesContainer.appendChild(messageElement);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 3000);
    },
    
    // Escape HTML
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Make chat functions available globally
window.chat = chat;