# SAINT - Smart AI for Integrated Next-gen Testing

![SAINT Logo](https://img.shields.io/badge/SAINT-v1.0.0-blue?style=for-the-badge&logo=robot)
![Enterprise Ready](https://img.shields.io/badge/Enterprise-Ready-green?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/AI-Powered-purple?style=for-the-badge)

**SAINT** is an enterprise-level AI chat assistant for intelligent test generation, execution, and management. Built with modern technologies and designed for next-generation testing workflows.

## 🚀 Features

### ✨ Core Capabilities
- **AI-Powered Test Generation**: Convert natural language prompts into executable Playwright test code
- **Multi-Modal Testing**: Support for UI, API, Visual, and Mixed test types
- **Real-Time Execution**: Live streaming of test execution with WebSocket integration
- **Enterprise UI**: Modern, responsive design with professional aesthetics
- **MCP Protocol Integration**: Advanced test configuration and management
- **Fallback System**: Robust fallback when AI services are unavailable

### 🎯 Key Features
- **Natural Language Processing**: Describe tests in plain English
- **Intelligent Code Generation**: AI-generated Playwright test scripts
- **Real-Time Monitoring**: Live execution logs and progress tracking
- **Multi-Browser Support**: Chromium, Firefox, and WebKit compatibility
- **Screenshot & Video Capture**: Automatic artifact generation
- **Test Management**: Save, organize, and reuse test cases
- **Analytics Dashboard**: Comprehensive test execution insights

## 🏗️ Architecture

### Backend (Node.js + Express)
- **AI Test Generator**: OpenAI-powered test code generation
- **MCP Executor**: Playwright test execution engine
- **Test Manager**: Test storage and management system
- **Streaming Service**: Real-time WebSocket communication
- **RESTful API**: Comprehensive API endpoints

### Frontend (React + Tailwind CSS)
- **Modern UI**: Enterprise-level design with shadcn/ui components
- **Real-Time Updates**: WebSocket-based live updates
- **Responsive Design**: Mobile and desktop optimized
- **Interactive Dashboard**: Test management and analytics
- **Code Visualization**: Syntax-highlighted test code display

## 📋 Prerequisites

- **Node.js** 18+ 
- **npm** or **pnpm**
- **OpenAI API Key** (optional - fallback available)

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd saint-app
npm install
```

### 2. Configure API Key
Create or update `src/backend/config.js`:
```javascript
module.exports = {
  openaiApiKey: "your_openai_api_key_here", // Optional
  port: 3001,
  environment: 'development',
  // ... other configurations
};
```

### 3. Start the Application
```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run dev:backend  # Backend on port 3001
npm run dev:frontend # Frontend on port 5173
```

### 4. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 🎮 Usage

### Basic Workflow
1. **Enter Prompt**: Describe your test in natural language
2. **Generate Test**: AI creates Playwright test code
3. **Review Code**: Examine generated test in the Code tab
4. **Execute Test**: Run the test and monitor real-time logs
5. **View Results**: Analyze execution results and artifacts

### Example Prompts
```
"Test the login page with invalid credentials and verify error message"
"Check if the signup API returns 404 for missing required fields"
"Test file upload functionality on Safari browser"
"Verify responsive design on mobile viewport for homepage"
"Test payment form validation with various input scenarios"
```

## 🔧 Configuration

### Backend Configuration (`src/backend/config.js`)
```javascript
module.exports = {
  openaiApiKey: "your_api_key_here",
  port: 3001,
  environment: 'development',
  
  mcp: {
    maxConcurrentTests: 5,
    testTimeout: 300000,
    screenshotOnFailure: true,
    videoRecording: true,
    traceOnFailure: true
  },
  
  browsers: ['chromium', 'firefox', 'webkit'],
  
  execution: {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    retries: 2,
    workers: 4
  }
};
```

## 📡 API Endpoints

### Test Generation
- `POST /api/generate/test` - Generate test from prompt
- `GET /api/tests` - Get all saved tests
- `POST /api/tests` - Save a test
- `DELETE /api/tests/:id` - Delete a test

### Test Execution
- `POST /api/execute/test` - Execute a test
- `GET /api/results` - Get execution results
- `GET /api/results/:sessionId` - Get specific result

### Analytics
- `GET /api/analytics/dashboard` - Dashboard analytics
- `GET /api/health` - Service health check

## 🔌 WebSocket Events

### Client → Server
```javascript
{
  type: 'subscribe',
  payload: { channel: 'test-session-123' }
}
```

### Server → Client
```javascript
{
  type: 'generation-completed',
  result: { /* test data */ },
  timestamp: '2025-07-20T13:40:26.054Z'
}
```

## 🎨 UI Components

### Main Interface
- **AI Test Assistant**: Chat-like interface for test generation
- **Test Execution Panel**: Tabbed interface for code, logs, results, and media
- **Real-Time Status**: Connection status and execution monitoring

### Tabs
- **Code**: Syntax-highlighted generated test code
- **Logs**: Real-time execution logs with timestamps
- **Results**: Test execution summary and statistics
- **Media**: Screenshots, videos, and trace files

## 🧪 Testing Types

### UI Tests
- Element interactions and validations
- Form submissions and validations
- Navigation and page transitions
- Visual regression testing

### API Tests
- HTTP request/response validation
- Status code verification
- JSON schema validation
- Authentication testing

### Visual Tests
- Screenshot comparisons
- Responsive design validation
- Cross-browser compatibility
- Accessibility checks

### Mixed Tests
- End-to-end workflows
- UI and API consistency validation
- Multi-step user journeys

## 📊 Analytics & Insights

### Dashboard Metrics
- Total tests and executions
- Success/failure rates
- Average execution times
- Browser distribution
- Test type analysis

### Performance Tracking
- Execution trends over time
- Failure analysis and categorization
- Resource utilization metrics
- Test efficiency insights

## 🔒 Security Features

- **CORS Protection**: Configurable cross-origin policies
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Secure error responses
- **Rate Limiting**: API endpoint protection

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001 5173
CMD ["npm", "run", "dev"]
```

## 🛠️ Development

### Project Structure
```
saint-app/
├── src/
│   ├── backend/          # Node.js backend
│   │   ├── server.js     # Main server file
│   │   ├── config.js     # Configuration
│   │   ├── aiTestGenerator.js
│   │   ├── mcpExecutor.js
│   │   ├── testManager.js
│   │   └── streamingService.js
│   └── frontend/         # React frontend
│       ├── src/
│       │   ├── App.jsx   # Main component
│       │   ├── components/
│       │   └── assets/
│       └── public/
├── data/                 # Test data storage
├── tests/               # Test files
├── package.json
└── README.md
```

### Adding New Features
1. **Backend**: Add new endpoints in `server.js`
2. **Frontend**: Create components in `src/components/`
3. **Testing**: Add tests in the `tests/` directory
4. **Documentation**: Update this README

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues

**WebSocket Connection Failed**
- Ensure backend is running on port 3001
- Check firewall settings
- Verify CORS configuration

**Test Generation Fails**
- Check OpenAI API key configuration
- Fallback generator will activate automatically
- Review backend logs for errors

**Test Execution Timeout**
- Increase timeout in MCP configuration
- Check system resources
- Verify Playwright installation

### Getting Help
- Check the logs in the browser console
- Review backend logs for detailed error messages
- Ensure all dependencies are installed correctly

## 🔮 Future Enhancements

- **CI/CD Integration**: GitHub Actions, GitLab CI support
- **Advanced Analytics**: ML-powered test insights
- **Team Collaboration**: Multi-user support
- **Plugin System**: Extensible architecture
- **Cloud Deployment**: AWS, Azure, GCP support

---

**SAINT v1.0.0** - Built with ❤️ for the future of testing

*Smart AI for Integrated Next-gen Testing*

