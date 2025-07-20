# 🚀 SAINT Quick Start Guide

Get up and running with SAINT in under 5 minutes!

## ⚡ Prerequisites

- Node.js 18+
- npm or pnpm
- OpenAI API Key (optional - fallback available)

## 🏃‍♂️ Quick Setup

### 1. Install Dependencies
```bash
cd saint-app
npm install
```

### 2. Configure API Key (Optional)
Edit `src/backend/config.js`:
```javascript
module.exports = {
  openaiApiKey: "your_openai_api_key_here", // Optional
  port: 3001,
  // ... rest of config
};
```

### 3. Start the Application
```bash
npm run dev
```

This starts:
- Backend server on http://localhost:3001
- Frontend app on http://localhost:5173

### 4. Open SAINT
Navigate to http://localhost:5173 in your browser.

## 🎯 First Test

1. **Enter a prompt**: "Test login with valid credentials"
2. **Click "Generate Test"**: AI creates Playwright code
3. **Review the code**: Check the generated test in the Code tab
4. **Execute the test**: Click "Execute Test" to run it
5. **View results**: Monitor logs and results in real-time

## 📋 Example Prompts

Try these prompts to get started:

```
"Test the login page with invalid credentials and verify error message"
"Check if the signup API returns 404 for missing required fields"  
"Test file upload functionality on Safari browser"
"Verify responsive design on mobile viewport"
"Test payment form validation with various scenarios"
```

## 🔧 Configuration Options

### Test Types
- **UI**: Web interface testing
- **API**: REST API testing  
- **Visual**: Screenshot comparisons
- **Mixed**: Combined UI + API tests

### Browser Support
- Chromium (default)
- Firefox
- WebKit/Safari

### Execution Options
- Headless/headed mode
- Custom viewport sizes
- Screenshot/video capture
- Trace recording

## 🎨 Interface Overview

### Left Panel - AI Assistant
- Enter test descriptions
- Quick example prompts
- Generate and execute tests
- View test status

### Right Panel - Execution
- **Code**: Generated test code
- **Logs**: Real-time execution logs
- **Results**: Test outcomes and metrics
- **Media**: Screenshots and videos

## 🚨 Troubleshooting

### Backend Won't Start
```bash
# Check if port 3001 is available
lsof -i :3001

# Kill existing process if needed
kill -9 <PID>
```

### Frontend Won't Load
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install
```

### WebSocket Connection Issues
- Ensure backend is running first
- Check browser console for errors
- Verify CORS settings in config

### Test Generation Fails
- OpenAI API key may be invalid/missing
- Fallback generator will activate automatically
- Check backend logs for details

## 📊 Health Check

Verify everything is working:
```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "SAINT Backend",
  "version": "1.0.0"
}
```

## 🎉 You're Ready!

SAINT is now running and ready to generate intelligent tests. Start with simple prompts and explore the powerful AI-driven testing capabilities.

For detailed documentation, see [README.md](README.md).

---

**Happy Testing with SAINT! 🤖✨**

