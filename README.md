# Electron Chat Application

This is a simple chat application built using Electron. It allows users to register, log in, and send messages in a chat interface. The application integrates with a database to manage user accounts and messages.

## Project Structure

```
electron-chat-app
├── src
│   ├── main.js          # Main entry point of the Electron application
│   ├── db.js            # Database connection and operations
│   ├── preload.js       # Secure context bridge for IPC communication
│   ├── login.html       # HTML structure for the login window
│   ├── register.html    # HTML structure for the registration window
│   ├── dashboard.html    # HTML structure for the main dashboard
│   └── renderer.js      # Frontend logic for user interactions
├── package.json         # npm configuration file
└── README.md            # Documentation for the project
```

## Features

- User registration with username, email, password, and display name.
- User login with username and password.
- Sending and receiving messages in real-time.
- Secure database connection for user and message management.

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd electron-chat-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the application:
   ```
   npm start
   ```

## Usage

- Open the application and navigate to the login page.
- Register a new account or log in with an existing account.
- Once logged in, you can access the dashboard and start chatting.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.# electron-chat
