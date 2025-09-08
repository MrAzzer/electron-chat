const { ipcRenderer } = require('electron');

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

// Make message functions available globally
window.message = message;