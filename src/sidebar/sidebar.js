const { ipcRenderer } = require('electron');

const sidebar = {
    // DOM elements
    conversationsList: null,
    
    // Initialize sidebar module
    init: function() {
        this.conversationsList = document.getElementById('conversationsList');
    },
    
    // Load user conversations
    loadConversations: async function() {
        try {
            console.log('Loading conversations for user:', window.currentUser.id);
            const result = await ipcRenderer.invoke('get-user-conversations', window.currentUser.id);
            
            if (result.success) {
                window.conversations = result.conversations;
                console.log('Loaded conversations:', window.conversations);
                this.renderConversationsList();
                
                // Auto-select the first conversation if none is selected
                if (window.conversations.length > 0 && !window.currentConversationId) {
                    await this.selectConversation(window.conversations[0].id);
                } else if (window.conversations.length === 0) {
                    chat.addSystemMessage('No conversations found. Create a new one!');
                    document.getElementById('messageInput').disabled = true;
                    document.getElementById('sendButton').disabled = true;
                    document.getElementById('currentConversationName').textContent = 'No conversation selected';
                }
            } else {
                chat.showMessage('Failed to load conversations: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Load conversations error:', error);
            chat.showMessage('Error loading conversations: ' + error.message, 'error');
        }
    },
    
    // Render conversations list
    renderConversationsList: function() {
        this.conversationsList.innerHTML = '';

        if (window.conversations.length === 0) {
            this.conversationsList.innerHTML = '<div class="no-conversations">No conversations yet</div>';
            return;
        }

        window.conversations.forEach(conv => {
            const convElement = document.createElement('div');
            convElement.className = `conversation-item ${conv.id === window.currentConversationId ? 'active' : ''}`;
            convElement.onclick = () => this.selectConversation(conv.id);
            
            const lastActivity = conv.last_activity ? new Date(conv.last_activity).toLocaleDateString() : 'No messages';
            const messageCount = conv.message_count || 0;
            
            convElement.innerHTML = `
                <div class="conversation-name">${conv.name}</div>
                <div class="conversation-meta">
                    <span>${messageCount} messages</span>
                    <span>${lastActivity}</span>
                </div>
            `;
            this.conversationsList.appendChild(convElement);
        });
    },
    
    // Select conversation
    selectConversation: async function(conversationId) {
        try {
            console.log('Selecting conversation:', conversationId);
            window.currentConversationId = conversationId;
            const conversation = window.conversations.find(c => c.id === conversationId);
            
            if (conversation) {
                document.getElementById('currentConversationName').textContent = conversation.name;
                document.getElementById('messageInput').disabled = false;
                document.getElementById('sendButton').disabled = false;
                
                this.renderConversationsList();
                await this.loadMessages();
                
                console.log('Successfully selected conversation:', conversation.name);
            } else {
                console.error('Conversation not found in local list:', conversationId);
                chat.addSystemMessage('Error: Conversation not found');
            }
        } catch (error) {
            console.error('Error selecting conversation:', error);
            chat.addSystemMessage('Error selecting conversation: ' + error.message);
        }
    },
    
    // Load messages from database
    loadMessages: async function() {
        if (!window.currentConversationId) {
            console.log('No conversation selected, skipping message load');
            return;
        }

        try {
            console.log('Loading messages for conversation:', window.currentConversationId);
            const result = await ipcRenderer.invoke('get-messages', window.currentConversationId);
            
            if (result.success) {
                document.getElementById('messages').innerHTML = '';
                
                if (result.messages.length === 0) {
                    chat.addSystemMessage('No messages yet. Start the conversation!');
                } else {
                    result.messages.forEach(message => {
                        chat.addMessageToUI(message);
                    });
                }
                console.log('Loaded', result.messages.length, 'messages');
            } else {
                console.error('Failed to load messages:', result.error);
                chat.addSystemMessage('Failed to load messages: ' + result.error);
            }
        } catch (error) {
            console.error('Load messages error:', error);
            chat.addSystemMessage('Error loading messages: ' + error.message);
        }
    },
    
    // Create new conversation
    createConversation: async function() {
        const name = document.getElementById('conversationName').value.trim();
        
        if (!name) {
            chat.showMessage('Please enter a conversation name', 'error');
            return;
        }

        try {
            const result = await ipcRenderer.invoke('create-conversation', {
                name: name,
                createdBy: window.currentUser.id
            });

            if (result.success) {
                modals.hideNewConversationModal();
                chat.showMessage('Conversation created successfully!', 'success');
                this.loadConversations(); // Reload the conversations list
            } else {
                chat.showMessage('Failed to create conversation: ' + result.error, 'error');
            }
        } catch (error) {
            chat.showMessage('Error creating conversation: ' + error.message, 'error');
        }
    },
    
    // Join a conversation
    joinConversation: async function(conversationId) {
        try {
            const result = await ipcRenderer.invoke('add-user-to-conversation', {
                conversationId: conversationId,
                userId: window.currentUser.id
            });

            if (result.success) {
                modals.hideJoinConversationModal();
                chat.showMessage('Successfully joined the conversation!', 'success');
                
                // Reload conversations to include the newly joined one
                await this.loadConversations();
                
                // Select the newly joined conversation
                await this.selectConversation(conversationId);
            } else {
                chat.showMessage('Failed to join conversation: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Join conversation error:', error);
            chat.showMessage('Error joining conversation: ' + error.message, 'error');
        }
    }
};

// Make sidebar functions available globally
window.sidebar = sidebar;