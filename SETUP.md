# Portfolio Contact Form Setup

## 🚀 Backend Email Setup

### 1. Gmail App Password Setup
1. Go to your Gmail account settings
2. Enable 2-Factor Authentication
3. Go to "App passwords" 
4. Generate a new app password for "Mail"
5. Copy the 16-character password

### 2. Environment Setup
Edit the `.env` file and replace:
```
EMAIL_USER=haniehk43@gmail.com
EMAIL_PASS=your_16_character_app_password_here
```

### 3. Start the Backend Server
```bash
npm start
```

### 4. Access Your Portfolio
Open: http://localhost:3001

## 📧 How It Works
1. User fills out contact form
2. Form sends data to backend server
3. Backend sends formatted email to your Gmail
4. You receive notification in your email inbox
5. User sees success message

## 🔧 Commands
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-restart

The contact form will now send real emails to haniehk43@gmail.com!