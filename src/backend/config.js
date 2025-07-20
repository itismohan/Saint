module.exports = {
  openaiApiKey: process.env.OPENAI_API_KEY || "your_openai_api_key_here",
  port: process.env.PORT || 3001,
  environment: process.env.NODE_ENV || 'development',
  
  // MCP Server Configuration
  mcp: {
    maxConcurrentTests: 5,
    testTimeout: 300000, // 5 minutes
    screenshotOnFailure: true,
    videoRecording: true,
    traceOnFailure: true
  },
  
  // Supported browsers
  browsers: ['chromium', 'firefox', 'webkit'],
  
  // Test execution settings
  execution: {
    headless: true,
    viewport: {
      width: 1920,
      height: 1080
    },
    retries: 2,
    workers: 4
  },
  
  // Storage paths
  storage: {
    tests: './data/tests',
    results: './data/results',
    screenshots: './data/screenshots',
    videos: './data/videos',
    traces: './data/traces'
  }
};

