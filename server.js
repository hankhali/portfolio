const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('.'));

// Contact form endpoint
app.post('/send-email', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Create message data
        const messageData = {
            timestamp: new Date().toISOString(),
            name: name,
            email: email,
            message: message,
            ip: req.ip || 'unknown'
        };

        // Save to messages file
        const messagesFile = path.join(__dirname, 'messages.json');
        let messages = [];
        
        if (fs.existsSync(messagesFile)) {
            const fileContent = fs.readFileSync(messagesFile, 'utf8');
            messages = JSON.parse(fileContent);
        }
        
        messages.push(messageData);
        fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));

        // Also save to a readable text file
        const textFile = path.join(__dirname, 'messages.txt');
        const textEntry = `
=== NEW MESSAGE ===
Date: ${new Date().toLocaleString()}
Name: ${name}
Email: ${email}
Message: ${message}
==================
`;
        fs.appendFileSync(textFile, textEntry);

        console.log(`📧 New message from ${name} (${email})`);
        console.log(`💬 Message: ${message}`);

        // Success response
        res.json({ 
            success: true, 
            message: 'Message sent successfully! I will get back to you soon.' 
        });

    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send message. Please try again.' 
        });
    }
});

// View messages endpoint (for you to check)
app.get('/admin/messages', (req, res) => {
    try {
        const messagesFile = path.join(__dirname, 'messages.json');
        if (fs.existsSync(messagesFile)) {
            const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
            res.json(messages);
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to load messages' });
    }
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Backend server is running!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 View messages at http://localhost:${PORT}/admin/messages`);
});