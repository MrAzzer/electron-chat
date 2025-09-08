const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

let promisePool;

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Jesus_loves_u',
    database: 'electron_chat_app',
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
};

// Initialize database connection
async function initializeDatabase() {
    try {
        console.log('Initializing database connection...');
        
        // First, create a connection without specifying the database
        const connection = mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });
        
        // Connect to MySQL
        await new Promise((resolve, reject) => {
            connection.connect((err) => {
                if (err) {
                    console.error('Error connecting to MySQL:', err);
                    reject(err);
                    return;
                }
                console.log('Connected to MySQL server');
                resolve();
            });
        });
        
        // Check if database exists, create if it doesn't
        await new Promise((resolve, reject) => {
            connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`, (err) => {
                if (err) {
                    console.error('Error creating database:', err);
                    reject(err);
                    return;
                }
                console.log(`Database ${dbConfig.database} ready`);
                resolve();
            });
        });
        
        // Close the initial connection
        connection.end();
        
        // Now create the connection pool with the database specified
        promisePool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            queueLimit: 0
        }).promise();
        
        console.log('Connection pool created');
        
        // Initialize database tables
        await initializeTables();
        
        console.log('Database initialization complete');
        return true;
    } catch (error) {
        console.error('Error initializing database:', error.message);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

// Initialize database tables
async function initializeTables() {
    try {
        console.log('Initializing database tables...');
        
        // Users table
        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                display_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Users table ready');
        
        // Conversations table
        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS conversations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                created_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('Conversations table ready');
        
        // Conversation participants table
        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS conversation_participants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                conversation_id INT NOT NULL,
                user_id INT NOT NULL,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_participant (conversation_id, user_id)
            )
        `);
        console.log('Conversation participants table ready');
        
        // Messages table
        await promisePool.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                conversation_id INT NOT NULL,
                sender_id INT NOT NULL,
                message_text TEXT NOT NULL,
                is_edited BOOLEAN DEFAULT FALSE,
                is_deleted BOOLEAN DEFAULT FALSE,
                edited_at TIMESTAMP NULL,
                deleted_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('Messages table ready');
        
        // Add indexes for better performance
        await promisePool.execute(`
            CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at)
        `);
        console.log('Indexes created');
        
        return true;
    } catch (error) {
        console.error('Error initializing tables:', error);
        throw error;
    }
}

// Test database connection
async function testConnection() {
    try {
        if (!promisePool) {
            return false;
        }
        
        const [rows] = await promisePool.execute('SELECT 1 as test');
        return rows.length > 0;
    } catch (error) {
        console.error('Test connection failed:', error);
        return false;
    }
}

// User functions
async function createUser(username, email, password, displayName = null) {
    try {
        const [result] = await promisePool.execute(
            'INSERT INTO users (username, email, password, display_name) VALUES (?, ?, ?, ?)',
            [username, email, password, displayName || username]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

async function getUserByUsername(username) {
    try {
        const [rows] = await promisePool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0] || null;
    } catch (error) {
        console.error('Error getting user by username:', error);
        throw error;
    }
}

async function getUserById(userId) {
    try {
        const [rows] = await promisePool.execute(
            'SELECT id, username, email, display_name FROM users WHERE id = ?',
            [userId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error('Error getting user by ID:', error);
        throw error;
    }
}

// Conversation functions
async function createConversation(name, createdBy) {
    try {
        const [result] = await promisePool.execute(
            'INSERT INTO conversations (name, created_by) VALUES (?, ?)',
            [name, createdBy]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error creating conversation:', error);
        throw error;
    }
}

async function addUserToConversation(conversationId, userId) {
    try {
        const [result] = await promisePool.execute(
            'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
            [conversationId, userId]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error adding user to conversation:', error);
        throw error;
    }
}

async function getUserConversations(userId) {
    try {
        const [rows] = await promisePool.execute(`
            SELECT c.*, 
                   COUNT(DISTINCT m.id) as message_count,
                   MAX(m.created_at) as last_activity
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE cp.user_id = ?
            GROUP BY c.id
            ORDER BY last_activity DESC
        `, [userId]);
        
        return rows;
    } catch (error) {
        console.error('Error getting user conversations:', error);
        throw error;
    }
}

async function getAllConversations() {
    try {
        const [rows] = await promisePool.execute(`
            SELECT c.*, 
                   COUNT(DISTINCT cp.user_id) as member_count,
                   COUNT(DISTINCT m.id) as message_count,
                   MAX(m.created_at) as last_activity
            FROM conversations c
            LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
            LEFT JOIN messages m ON c.id = m.conversation_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `);
        
        return rows;
    } catch (error) {
        console.error('Error getting all conversations:', error);
        throw error;
    }
}

// Message functions
async function saveMessage(conversationId, senderId, messageText) {
    try {
        const [result] = await promisePool.execute(
            'INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (?, ?, ?)',
            [conversationId, senderId, messageText]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
}

async function getMessages(conversationId) {
    try {
        const [rows] = await promisePool.execute(`
            SELECT m.*, u.username, u.display_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ? AND m.is_deleted = FALSE
            ORDER BY m.created_at ASC
        `, [conversationId]);
        
        return rows;
    } catch (error) {
        console.error('Error getting messages:', error);
        throw error;
    }
}

async function editMessage(messageId, newText) {
    try {
        await promisePool.execute(
            'UPDATE messages SET message_text = ?, is_edited = TRUE, edited_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newText, messageId]
        );
        return true;
    } catch (error) {
        console.error('Error editing message:', error);
        throw error;
    }
}

async function deleteMessage(messageId) {
    try {
        await promisePool.execute(
            'UPDATE messages SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
            [messageId]
        );
        return true;
    } catch (error) {
        console.error('Error deleting message:', error);
        throw error;
    }
}

// Debug function to check database state
async function debugDatabaseState() {
    try {
        console.log('=== Database State ===');
        
        const [users] = await promisePool.execute('SELECT COUNT(*) as count FROM users');
        console.log('Users:', users[0].count);
        
        const [conversations] = await promisePool.execute('SELECT COUNT(*) as count FROM conversations');
        console.log('Conversations:', conversations[0].count);
        
        const [participants] = await promisePool.execute('SELECT COUNT(*) as count FROM conversation_participants');
        console.log('Participants:', participants[0].count);
        
        const [messages] = await promisePool.execute('SELECT COUNT(*) as count FROM messages');
        console.log('Messages:', messages[0].count);
        
        console.log('=== End Database State ===');
    } catch (error) {
        console.error('Error debugging database state:', error);
    }
}

module.exports = {
    initializeDatabase,
    testConnection,
    createUser,
    getUserByUsername,
    getUserById,
    createConversation,
    addUserToConversation,
    getUserConversations,
    getAllConversations,
    saveMessage,
    getMessages,
    editMessage,
    deleteMessage,
    debugDatabaseState,
    promisePool: () => promisePool
};