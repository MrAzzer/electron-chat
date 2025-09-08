const { ipcRenderer } = require('electron');

const modals = {
    // DOM elements
    modalsContainer: null,
    
    // Initialize modals module
    init: function() {
        this.modalsContainer = document.getElementById('modalsContainer');
        this.loadModals();
    },
    
    // Load modals HTML
    loadModals: function() {
        fetch('modals/modals.html')
            .then(response => response.text())
            .then(html => {
                this.modalsContainer.innerHTML = html;
            })
            .catch(error => {
                console.error('Error loading modals:', error);
            });
    },
    
    // Show new conversation modal
    showNewConversationModal: function() {
        document.getElementById('newConversationModal').style.display = 'flex';
        document.getElementById('conversationName').focus();
    },
    
    // Hide new conversation modal
    hideNewConversationModal: function() {
        document.getElementById('newConversationModal').style.display = 'none';
        document.getElementById('conversationName').value = '';
    },
    
    // Show join conversation modal
    showJoinConversationModal: async function() {
        try {
            console.log('Showing join conversation modal for user:', window.currentUser.id);
            
            // First, get the user's current conversations
            const userConvsResult = await ipcRenderer.invoke('get-user-conversations', window.currentUser.id);
            
            if (!userConvsResult.success) {
                chat.showMessage('Failed to load your conversations: ' + userConvsResult.error, 'error');
                return;
            }
            
            // Get all conversations
            const result = await ipcRenderer.invoke('get-all-conversations');
            
            if (result.success) {
                const modal = document.getElementById('joinConversationModal');
                const listContainer = document.getElementById('availableConversationsList');
                
                listContainer.innerHTML = '';
                
                if (result.conversations.length === 0) {
                    listContainer.innerHTML = '<div class="no-conversations">No conversations available to join</div>';
                } else {
                    // Filter out conversations the user is already in
                    const userConversationIds = userConvsResult.conversations.map(conv => conv.id);
                    const availableConversations = result.conversations.filter(conv => 
                        !userConversationIds.includes(conv.id)
                    );
                    
                    if (availableConversations.length === 0) {
                        listContainer.innerHTML = '<div class="no-conversations">You\'re already in all conversations</div>';
                    } else {
                        availableConversations.forEach(conv => {
                            const convElement = document.createElement('div');
                            convElement.className = 'conversation-to-join';
                            convElement.onclick = () => sidebar.joinConversation(conv.id);
                            
                            const lastActivity = conv.last_activity ? new Date(conv.last_activity).toLocaleDateString() : 'No messages';
                            
                            convElement.innerHTML = `
                                <div class="conversation-name">${conv.name}</div>
                                <div class="conversation-meta">
                                    <span>${conv.member_count || 0} members</span>
                                    <span>${conv.message_count || 0} messages</span>
                                    <span>Last activity: ${lastActivity}</span>
                                </div>
                            `;
                            
                            listContainer.appendChild(convElement);
                        });
                    }
                }
                
                modal.style.display = 'flex';
            } else {
                chat.showMessage('Failed to load conversations: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Show join conversation modal error:', error);
            chat.showMessage('Error loading conversations: ' + error.message, 'error');
        }
    },
    
    // Hide join conversation modal
    hideJoinConversationModal: function() {
        document.getElementById('joinConversationModal').style.display = 'none';
    },
    
    // Show video chat modal
    showVideoChatModal: function() {
        document.getElementById('videoChatModal').style.display = 'flex';
    },
    
    // Hide video chat modal
    hideVideoChatModal: function() {
        document.getElementById('videoChatModal').style.display = 'none';
    },
    
    // Start video chat
    startVideoChat: async function() {
        try {
            const result = await ipcRenderer.invoke('get-video-token', {
                userId: window.currentUser.id,
                conversationId: window.currentConversationId
            });
            
            if (result.success) {
                // Initialize video chat with the token
                this.initVideoChat(result.token);
                this.hideVideoChatModal();
            } else {
                chat.showMessage('Failed to start video chat: ' + result.error, 'error');
            }
        } catch (error) {
            chat.showMessage('Error starting video chat: ' + error.message, 'error');
        }
    },
    
    // Placeholder for video chat initialization
    initVideoChat: function(token) {
        chat.showMessage('Video chat started with token: ' + token, 'info');
        // Implement your video chat service integration here
        // This would typically involve initializing the video SDK with the token
    }
};

// Make modals functions available globally
window.modals = modals;