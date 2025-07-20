const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class MCPExecutor {
  constructor(config) {
    this.config = config;
    this.activeExecutions = new Map();
    this.executionQueue = [];
    this.maxConcurrent = config.mcp.maxConcurrentTests;
  }

  async executeTest(testData, sessionId, streamingService) {
    try {
      // Add to queue if at capacity
      if (this.activeExecutions.size >= this.maxConcurrent) {
        this.executionQueue.push({ testData, sessionId, streamingService });
        streamingService.broadcast({
          type: 'execution-queued',
          sessionId,
          position: this.executionQueue.length,
          message: 'Test queued for execution',
          timestamp: new Date().toISOString()
        });
        return { status: 'queued', sessionId };
      }

      return await this.executeTestNow(testData, sessionId, streamingService);
    } catch (error) {
      console.error('Error in executeTest:', error);
      throw error;
    }
  }

  async executeTestNow(testData, sessionId, streamingService) {
    const executionId = uuidv4();
    const startTime = new Date();

    try {
      // Mark as active
      this.activeExecutions.set(sessionId, {
        executionId,
        testData,
        startTime,
        status: 'running'
      });

      streamingService.broadcast({
        type: 'execution-started',
        sessionId,
        executionId,
        testId: testData.id,
        timestamp: startTime.toISOString()
      });

      // Create execution environment
      const executionDir = await this.createExecutionEnvironment(testData, sessionId);

      // Execute the test
      const result = await this.runTest(testData, sessionId, executionDir, streamingService);

      // Process results
      const processedResult = await this.processResults(result, sessionId, executionDir);

      // Clean up
      await this.cleanup(executionDir);

      // Mark as completed
      this.activeExecutions.delete(sessionId);

      // Process queue
      this.processQueue();

      return processedResult;

    } catch (error) {
      console.error('Test execution error:', error);
      
      // Clean up on error
      this.activeExecutions.delete(sessionId);
      this.processQueue();

      throw error;
    }
  }

  async createExecutionEnvironment(testData, sessionId) {
    const executionDir = path.join(this.config.storage.tests, `execution-${sessionId}`);
    await fs.ensureDir(executionDir);

    // Create test file
    const testFile = path.join(executionDir, `${testData.id}.spec.ts`);
    await fs.writeFile(testFile, testData.code);

    // Create Playwright config
    const configFile = path.join(executionDir, 'playwright.config.ts');
    const config = this.generatePlaywrightConfig(testData.mcpConfig, sessionId);
    await fs.writeFile(configFile, config);

    // Create MCP config file
    const mcpConfigFile = path.join(executionDir, 'mcp.json');
    await fs.writeJson(mcpConfigFile, testData.mcpConfig, { spaces: 2 });

    // Create package.json
    const packageJson = {
      name: `saint-test-${sessionId}`,
      version: "1.0.0",
      type: "module",
      dependencies: {
        "@playwright/test": "^1.40.0"
      }
    };
    await fs.writeJson(path.join(executionDir, 'package.json'), packageJson, { spaces: 2 });

    return executionDir;
  }

  generatePlaywrightConfig(mcpConfig, sessionId) {
    const outputDir = path.join(this.config.storage.results, sessionId);
    
    return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: ${mcpConfig.timeout || 30000},
  retries: ${mcpConfig.retries || 1},
  workers: ${mcpConfig.workers || 1},
  outputDir: '${outputDir}',
  
  use: {
    headless: ${mcpConfig.headless !== false},
    screenshot: '${mcpConfig.screenshot || 'only-on-failure'}',
    video: '${mcpConfig.video || 'retain-on-failure'}',
    trace: '${mcpConfig.trace || 'retain-on-failure'}',
    viewport: {
      width: ${mcpConfig.viewport?.width || 1920},
      height: ${mcpConfig.viewport?.height || 1080}
    }
  },

  projects: [
    {
      name: '${mcpConfig.browser || 'chromium'}',
      use: { 
        ...devices[${this.getDeviceConfig(mcpConfig.browser)}]
      },
    },
  ],

  reporter: [
    ['html', { outputFolder: '${outputDir}/html-report' }],
    ['json', { outputFile: '${outputDir}/results.json' }],
    ['junit', { outputFile: '${outputDir}/results.xml' }],
    ['line']
  ],

  globalSetup: require.resolve('./global-setup.js'),
  globalTeardown: require.resolve('./global-teardown.js'),
});`;
  }

  getDeviceConfig(browser) {
    switch (browser) {
      case 'firefox':
        return "'Desktop Firefox'";
      case 'webkit':
        return "'Desktop Safari'";
      case 'edge':
        return "'Desktop Edge'";
      default:
        return "'Desktop Chrome'";
    }
  }

  async runTest(testData, sessionId, executionDir, streamingService) {
    return new Promise((resolve, reject) => {
      // Install dependencies first
      this.installDependencies(executionDir, sessionId, streamingService)
        .then(() => {
          // Run the actual test
          const args = ['playwright', 'test', '--config', 'playwright.config.ts'];
          const process = spawn('npx', args, {
            cwd: executionDir,
            stdio: 'pipe',
            env: { ...process.env, CI: 'true' }
          });

          let output = '';
          let errorOutput = '';
          const startTime = new Date();

          process.stdout.on('data', (data) => {
            const chunk = data.toString();
            output += chunk;
            
            streamingService.broadcast({
              type: 'test-output',
              sessionId,
              data: chunk,
              timestamp: new Date().toISOString()
            });
          });

          process.stderr.on('data', (data) => {
            const chunk = data.toString();
            errorOutput += chunk;
            
            streamingService.broadcast({
              type: 'test-error',
              sessionId,
              data: chunk,
              timestamp: new Date().toISOString()
            });
          });

          process.on('close', (code) => {
            const endTime = new Date();
            const duration = endTime - startTime;

            const result = {
              exitCode: code,
              output,
              errorOutput,
              duration,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              status: code === 0 ? 'passed' : 'failed',
              sessionId,
              testData
            };

            streamingService.broadcast({
              type: 'test-completed',
              sessionId,
              result: {
                status: result.status,
                duration: result.duration,
                exitCode: result.exitCode
              },
              timestamp: new Date().toISOString()
            });

            resolve(result);
          });

          process.on('error', (error) => {
            streamingService.broadcast({
              type: 'test-execution-error',
              sessionId,
              error: error.message,
              timestamp: new Date().toISOString()
            });

            reject(error);
          });
        })
        .catch(reject);
    });
  }

  async installDependencies(executionDir, sessionId, streamingService) {
    return new Promise((resolve, reject) => {
      streamingService.broadcast({
        type: 'dependency-installation-started',
        sessionId,
        timestamp: new Date().toISOString()
      });

      const process = spawn('npm', ['install'], {
        cwd: executionDir,
        stdio: 'pipe'
      });

      let output = '';

      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        streamingService.broadcast({
          type: 'dependency-output',
          sessionId,
          data: chunk,
          timestamp: new Date().toISOString()
        });
      });

      process.stderr.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        streamingService.broadcast({
          type: 'dependency-error',
          sessionId,
          data: chunk,
          timestamp: new Date().toISOString()
        });
      });

      process.on('close', (code) => {
        if (code === 0) {
          streamingService.broadcast({
            type: 'dependency-installation-completed',
            sessionId,
            timestamp: new Date().toISOString()
          });
          resolve();
        } else {
          reject(new Error(`Dependency installation failed with exit code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async processResults(result, sessionId, executionDir) {
    try {
      const resultsDir = path.join(this.config.storage.results, sessionId);
      
      // Ensure results directory exists
      await fs.ensureDir(resultsDir);

      // Process JSON results if available
      const jsonResultsPath = path.join(resultsDir, 'results.json');
      if (await fs.pathExists(jsonResultsPath)) {
        const jsonResults = await fs.readJson(jsonResultsPath);
        result.detailedResults = jsonResults;
      }

      // Find and process artifacts
      result.artifacts = await this.processArtifacts(resultsDir, sessionId);

      // Generate comprehensive summary
      result.summary = this.generateExecutionSummary(result);

      // Save result to storage
      const resultFile = path.join(this.config.storage.results, `${sessionId}-result.json`);
      await fs.writeJson(resultFile, result, { spaces: 2 });

      return result;

    } catch (error) {
      console.error('Error processing results:', error);
      result.processingError = error.message;
      return result;
    }
  }

  async processArtifacts(resultsDir, sessionId) {
    const artifacts = {
      screenshots: [],
      videos: [],
      traces: [],
      reports: []
    };

    try {
      // Process screenshots
      const screenshotFiles = await this.findFiles(resultsDir, ['.png', '.jpg']);
      for (const file of screenshotFiles) {
        const filename = `${sessionId}-${path.basename(file)}`;
        const targetPath = path.join(this.config.storage.screenshots, filename);
        await fs.copy(file, targetPath);
        
        artifacts.screenshots.push({
          filename,
          path: targetPath,
          url: `/screenshots/${filename}`,
          size: (await fs.stat(targetPath)).size,
          timestamp: new Date().toISOString()
        });
      }

      // Process videos
      const videoFiles = await this.findFiles(resultsDir, ['.webm', '.mp4']);
      for (const file of videoFiles) {
        const filename = `${sessionId}-${path.basename(file)}`;
        const targetPath = path.join(this.config.storage.videos, filename);
        await fs.copy(file, targetPath);
        
        artifacts.videos.push({
          filename,
          path: targetPath,
          url: `/videos/${filename}`,
          size: (await fs.stat(targetPath)).size,
          timestamp: new Date().toISOString()
        });
      }

      // Process traces
      const traceFiles = await this.findFiles(resultsDir, ['.zip']);
      for (const file of traceFiles) {
        if (path.basename(file).includes('trace')) {
          const filename = `${sessionId}-${path.basename(file)}`;
          const targetPath = path.join(this.config.storage.traces, filename);
          await fs.copy(file, targetPath);
          
          artifacts.traces.push({
            filename,
            path: targetPath,
            url: `/traces/${filename}`,
            size: (await fs.stat(targetPath)).size,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Process HTML reports
      const htmlReportDir = path.join(resultsDir, 'html-report');
      if (await fs.pathExists(htmlReportDir)) {
        const reportTargetDir = path.join(this.config.storage.results, `${sessionId}-html-report`);
        await fs.copy(htmlReportDir, reportTargetDir);
        
        artifacts.reports.push({
          type: 'html',
          path: reportTargetDir,
          url: `/results/${sessionId}-html-report/index.html`,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error processing artifacts:', error);
    }

    return artifacts;
  }

  async findFiles(dir, extensions) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.findFiles(fullPath, extensions);
          files.push(...subFiles);
        } else if (extensions.some(ext => item.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error('Error finding files:', error);
    }

    return files;
  }

  generateExecutionSummary(result) {
    const summary = {
      status: result.status,
      duration: result.duration,
      exitCode: result.exitCode,
      testCount: 0,
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      artifactCounts: {
        screenshots: result.artifacts?.screenshots?.length || 0,
        videos: result.artifacts?.videos?.length || 0,
        traces: result.artifacts?.traces?.length || 0,
        reports: result.artifacts?.reports?.length || 0
      }
    };

    // Parse detailed results if available
    if (result.detailedResults && result.detailedResults.suites) {
      this.countTestResults(result.detailedResults.suites, summary);
    }

    // Add performance metrics
    summary.performance = {
      executionTime: result.duration,
      avgTestTime: summary.testCount > 0 ? result.duration / summary.testCount : 0
    };

    return summary;
  }

  countTestResults(suites, summary) {
    for (const suite of suites) {
      if (suite.specs) {
        for (const spec of suite.specs) {
          if (spec.tests) {
            for (const test of spec.tests) {
              summary.testCount++;
              
              if (test.outcome === 'expected') {
                summary.passedCount++;
              } else if (test.outcome === 'unexpected') {
                summary.failedCount++;
              } else if (test.outcome === 'skipped') {
                summary.skippedCount++;
              }
            }
          }
        }
      }

      if (suite.suites) {
        this.countTestResults(suite.suites, summary);
      }
    }
  }

  async cleanup(executionDir) {
    try {
      await fs.remove(executionDir);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  processQueue() {
    if (this.executionQueue.length > 0 && this.activeExecutions.size < this.maxConcurrent) {
      const { testData, sessionId, streamingService } = this.executionQueue.shift();
      this.executeTestNow(testData, sessionId, streamingService);
    }
  }

  getExecutionStatus() {
    return {
      active: this.activeExecutions.size,
      queued: this.executionQueue.length,
      maxConcurrent: this.maxConcurrent,
      executions: Array.from(this.activeExecutions.entries()).map(([sessionId, execution]) => ({
        sessionId,
        executionId: execution.executionId,
        status: execution.status,
        startTime: execution.startTime,
        testId: execution.testData.id
      }))
    };
  }
}

module.exports = MCPExecutor;

