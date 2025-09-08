const { ipcRenderer } = require('electron');
const utils = require('./utils');

async function loadConversations() {
    try {
        console.log('Loading conversations for user:', window.currentUser.id);
        const result = await ipcRenderer.invoke('get-user-conversations', window.currentUser.id);
        
        if (result.success) {
            window.conversations = result.conversations;
            console.log('Loaded conversations:', window.conversations);
            renderConversationsList();
            
            // Auto-select the first conversation if none is selected
            if (window.conversations.length > 0 && !window.currentConversationId) {
                await selectConversation(window.conversations[0].id);
            } else if (window.conversations.length === 0) {
                utils.addSystemMessage('No conversations found. Create a new one!');
                utils.messageInput.disabled = true;
                utils.sendButton.disabled = true;
                utils.currentConversationName.textContent = 'No conversation selected';
            }
        } else {
            utils.showMessage('Failed to load conversations: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Load conversations error:', error);
        utils.showMessage('Error loading conversations: ' + error.message, 'error');
    }
}

function renderConversationsList() {
    utils.conversationsList.innerHTML = '';

    if (window.conversations.length === 0) {
        utils.conversationsList.innerHTML = '<div class="no-conversations">No conversations yet</div>';
        return;
    }

    window.conversations.forEach(conv => {
        const convElement = document.createElement('div');
        convElement.className = `conversation-item ${conv.id === window.currentConversationId ? 'active' : ''}`;
        convElement.onclick = () => selectConversation(conv.id);
        
        const lastActivity = conv.last_activity ? new Date(conv.last_activity).toLocaleDateString() : 'No messages';
        const messageCount = conv.message_count || 0;
        
        convElement.innerHTML = `
            <div class="conversation-name">${conv.name}</div>
            <div class="conversation-meta">
                <span>${messageCount} messages</span>
                <span>${lastActivity}</span>
            </div>
        `;
        utils.conversationsList.appendChild(convElement);
    });
}

async function selectConversation(conversationId) {
    try {
        console.log('Selecting conversation:', conversationId);
        window.currentConversationId = conversationId;
        const conversation = window.conversations.find(c => c.id === conversationId);
        
        if (conversation) {
            utils.currentConversationName.textContent = conversation.name;
            utils.messageInput.disabled = false;
            utils.sendButton.disabled = false;
            
            renderConversationsList();
            await loadMessages();
            
            console.log('Successfully selected conversation:', conversation.name);
        } else {
            console.error('Conversation not found in local list:', conversationId);
            utils.addSystemMessage('Error: Conversation not found');
        }
    } catch (error) {
        console.error('Error selecting conversation:', error);
        utils.addSystemMessage('Error selecting conversation: ' + error.message);
    }
}

async function loadMessages() {
    if (!window.currentConversationId) {
        console.log('No conversation selected, skipping message load');
        return;
    }

    try {
        console.log('Loading messages for conversation:', window.currentConversationId);
        const result = await ipcRenderer.invoke('get-messages', window.currentConversationId);
        
        if (result.success) {
            utils.messagesContainer.innerHTML = '';
            
            if (result.messages.length === 0) {
                utils.addSystemMessage('No messages yet. Start the conversation!');
            } else {
                result.messages.forEach(message => {
                    utils.addMessageToUI(message);
                });
            }
            console.log('Loaded', result.messages.length, 'messages');
        } else {
            console.error('Failed to load messages:', result.error);
            utils.addSystemMessage('Failed to load messages: ' + result.error);
        }
    } catch (error) {
        console.error('Load messages error:', error);
        utils.addSystemMessage('Error loading messages: ' + error.message);
    }
}

async function createConversation() {
    const name = document.getElementById('conversationName').value.trim();
    
    if (!name) {
        utils.showMessage('Please enter a conversation name', 'error');
        return;
    }

    try {
        const result = await ipcRenderer.invoke('create-conversation', {
            name: name,
            createdBy: window.currentUser.id
        });

        if (result.success) {
            modals.hideNewConversationModal();
            utils.showMessage('Conversation created successfully!', 'success');
            loadConversations(); // Reload the conversations list
        } else {
            utils.showMessage('Failed to create conversation: ' + result.error, 'error');
        }
    } catch (error) {
        utils.showMessage('Error creating conversation: ' + error.message, 'error');
    }
}

async function joinConversation(conversationId) {
    try {
        const result = await ipcRenderer.invoke('add-user-to-conversation', {
            conversationId: conversationId,
            userId: window.currentUser.id
        });

        if (result.success) {
            modals.hideJoinConversationModal();
            utils.showMessage('Successfully joined the conversation!', 'success');
            
            // Reload conversations to include the newly joined one
            await loadConversations();
            
            // Select the newly joined conversation
            await selectConversation(conversationId);
        } else {
            utils.showMessage('Failed to join conversation: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Join conversation error:', error);
        utils.showMessage('Error joining conversation: ' + error.message, 'error');
    }
}

module.exports = {
    loadConversations,
    renderConversationsList,
    selectConversation,
    loadMessages,
    createConversation,
    joinConversation
};