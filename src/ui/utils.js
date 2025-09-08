// DOM elements cache
let authContainer, mainApp, messagesContainer, messageInput, sendButton;
let loginBtn, registerBtn, conversationsList, currentConversationName, logoutBtn;

function cacheDOMElements() {
    authContainer = document.getElementById('authContainer');
    mainApp = document.getElementById('mainApp');
    messagesContainer = document.getElementById('messages');
    messageInput = document.getElementById('messageInput');
    sendButton = document.getElementById('sendButton');
    loginBtn = document.getElementById('loginBtn');
    registerBtn = document.getElementById('registerBtn');
    conversationsList = document.getElementById('conversationsList');
    currentConversationName = document.getElementById('currentConversationName');
    logoutBtn = document.getElementById('logoutBtn');
}

function addMessageToUI(message) {
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
            <div class="message-content">${escapeHtml(message.messageText)}</div>
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
                <button class="edit-btn" onclick="startEditMessage('${message.id}', '${escapeHtml(message.messageText)}')">Edit</button>
                <button class="delete-btn" onclick="deleteMessage('${message.id}')">Delete</button>
            </div>
        ` : ''}
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addSystemMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message system';
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showMessage(text, type = 'info') {
    // Clear any existing system messages first
    const existingMessages = messagesContainer.querySelectorAll('.message.system');
    existingMessages.forEach(msg => msg.remove());
    
    const messageElement = document.createElement('div');
    messageElement.className = `message system ${type}`;
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

module.exports = {
    cacheDOMElements,
    addMessageToUI,
    addSystemMessage,
    showMessage,
    escapeHtml,
    // Export DOM elements for other modules to use
    authContainer,
    mainApp,
    messagesContainer,
    messageInput,
    sendButton,
    loginBtn,
    registerBtn,
    conversationsList,
    currentConversationName,
    logoutBtn
};