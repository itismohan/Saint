const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');

// Import core modules
const AITestGenerator = require('./aiTestGenerator');
const MCPExecutor = require('./mcpExecutor');
const TestManager = require('./testManager');
const StreamingService = require('./streamingService');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data directories exist
Object.values(config.storage).forEach(dir => {
  fs.ensureDirSync(dir);
});

// Initialize core services
const aiGenerator = new AITestGenerator(config);
const mcpExecutor = new MCPExecutor(config);
const testManager = new TestManager(config);
const streamingService = new StreamingService(wss);

// Static file serving
app.use('/screenshots', express.static(config.storage.screenshots));
app.use('/videos', express.static(config.storage.videos));
app.use('/traces', express.static(config.storage.traces));
app.use('/results', express.static(config.storage.results));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'SAINT Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    config: {
      environment: config.environment,
      supportedBrowsers: config.browsers,
      maxConcurrentTests: config.mcp.maxConcurrentTests
    }
  });
});

// AI Test Generation Endpoints
app.post('/api/generate/test', async (req, res) => {
  try {
    const { prompt, testType = 'ui', options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    streamingService.broadcast({
      type: 'generation-started',
      prompt,
      testType,
      timestamp: new Date().toISOString()
    });

    const result = await aiGenerator.generateTest(prompt, testType, options);
    
    streamingService.broadcast({
      type: 'generation-completed',
      result,
      timestamp: new Date().toISOString()
    });

    res.json(result);
  } catch (error) {
    console.error('Test generation error:', error);
    
    streamingService.broadcast({
      type: 'generation-error',
      error: error.message,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({ error: error.message });
  }
});

// MCP Test Execution Endpoints
app.post('/api/execute/test', async (req, res) => {
  try {
    const { testData, sessionId } = req.body;
    
    if (!testData || !sessionId) {
      return res.status(400).json({ error: 'Test data and session ID are required' });
    }

    // Start execution asynchronously
    mcpExecutor.executeTest(testData, sessionId, streamingService)
      .then(result => {
        streamingService.broadcast({
          type: 'execution-completed',
          sessionId,
          result,
          timestamp: new Date().toISOString()
        });
      })
      .catch(error => {
        streamingService.broadcast({
          type: 'execution-error',
          sessionId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });

    res.json({ 
      status: 'started',
      sessionId,
      message: 'Test execution started. Monitor via WebSocket for real-time updates.'
    });
  } catch (error) {
    console.error('Test execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test Management Endpoints
app.get('/api/tests', async (req, res) => {
  try {
    const tests = await testManager.getAllTests();
    res.json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tests/:id', async (req, res) => {
  try {
    const test = await testManager.getTest(req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tests', async (req, res) => {
  try {
    const test = await testManager.saveTest(req.body);
    res.json(test);
  } catch (error) {
    console.error('Error saving test:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tests/:id', async (req, res) => {
  try {
    await testManager.deleteTest(req.params.id);
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test Results Endpoints
app.get('/api/results', async (req, res) => {
  try {
    const results = await testManager.getAllResults();
    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/results/:sessionId', async (req, res) => {
  try {
    const result = await testManager.getResult(req.params.sessionId);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analytics and Insights Endpoints
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const analytics = await testManager.getDashboardAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      streamingService.handleMessage(ws, data);
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    streamingService.removeConnection(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection-established',
    message: 'Connected to SAINT Backend',
    timestamp: new Date().toISOString()
  }));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 SAINT Backend Server running on port ${config.port}`);
  console.log(`📡 WebSocket server running on ws://localhost:${config.port}`);
  console.log(`🌍 Environment: ${config.environment}`);
  console.log(`🧪 Max concurrent tests: ${config.mcp.maxConcurrentTests}`);
  console.log(`📁 Data directory: ${path.resolve('./data')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;

