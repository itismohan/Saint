const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class TestManager {
  constructor(config) {
    this.config = config;
    this.testsFile = path.join(config.storage.tests, 'tests.json');
    this.resultsFile = path.join(config.storage.results, 'results.json');
    
    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      // Ensure storage directories exist
      await fs.ensureDir(this.config.storage.tests);
      await fs.ensureDir(this.config.storage.results);
      await fs.ensureDir(this.config.storage.screenshots);
      await fs.ensureDir(this.config.storage.videos);
      await fs.ensureDir(this.config.storage.traces);

      // Initialize tests file if it doesn't exist
      if (!await fs.pathExists(this.testsFile)) {
        await fs.writeJson(this.testsFile, { tests: [] }, { spaces: 2 });
      }

      // Initialize results file if it doesn't exist
      if (!await fs.pathExists(this.resultsFile)) {
        await fs.writeJson(this.resultsFile, { results: [] }, { spaces: 2 });
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  async saveTest(testData) {
    try {
      const tests = await this.loadTests();
      
      // Add metadata
      const test = {
        ...testData,
        id: testData.id || uuidv4(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: '1.0.0'
      };

      // Check if test already exists
      const existingIndex = tests.findIndex(t => t.id === test.id);
      if (existingIndex >= 0) {
        test.created = tests[existingIndex].created;
        tests[existingIndex] = test;
      } else {
        tests.push(test);
      }

      await this.saveTests(tests);
      return test;
    } catch (error) {
      console.error('Error saving test:', error);
      throw error;
    }
  }

  async getTest(id) {
    try {
      const tests = await this.loadTests();
      return tests.find(test => test.id === id);
    } catch (error) {
      console.error('Error getting test:', error);
      throw error;
    }
  }

  async getAllTests() {
    try {
      return await this.loadTests();
    } catch (error) {
      console.error('Error getting all tests:', error);
      throw error;
    }
  }

  async deleteTest(id) {
    try {
      const tests = await this.loadTests();
      const filteredTests = tests.filter(test => test.id !== id);
      
      if (filteredTests.length === tests.length) {
        throw new Error('Test not found');
      }

      await this.saveTests(filteredTests);
      return true;
    } catch (error) {
      console.error('Error deleting test:', error);
      throw error;
    }
  }

  async saveResult(resultData) {
    try {
      const results = await this.loadResults();
      
      const result = {
        ...resultData,
        id: resultData.id || uuidv4(),
        saved: new Date().toISOString()
      };

      results.push(result);
      await this.saveResults(results);
      return result;
    } catch (error) {
      console.error('Error saving result:', error);
      throw error;
    }
  }

  async getResult(sessionId) {
    try {
      const results = await this.loadResults();
      return results.find(result => result.sessionId === sessionId);
    } catch (error) {
      console.error('Error getting result:', error);
      throw error;
    }
  }

  async getAllResults() {
    try {
      return await this.loadResults();
    } catch (error) {
      console.error('Error getting all results:', error);
      throw error;
    }
  }

  async getDashboardAnalytics() {
    try {
      const tests = await this.loadTests();
      const results = await this.loadResults();

      const analytics = {
        overview: {
          totalTests: tests.length,
          totalExecutions: results.length,
          successRate: this.calculateSuccessRate(results),
          avgExecutionTime: this.calculateAvgExecutionTime(results)
        },
        testTypes: this.analyzeTestTypes(tests),
        executionTrends: this.analyzeExecutionTrends(results),
        browserDistribution: this.analyzeBrowserDistribution(tests),
        tagAnalysis: this.analyzeTestTags(tests),
        recentActivity: this.getRecentActivity(tests, results),
        performance: this.analyzePerformance(results),
        failureAnalysis: this.analyzeFailures(results)
      };

      return analytics;
    } catch (error) {
      console.error('Error generating dashboard analytics:', error);
      throw error;
    }
  }

  async loadTests() {
    try {
      const data = await fs.readJson(this.testsFile);
      return data.tests || [];
    } catch (error) {
      console.error('Error loading tests:', error);
      return [];
    }
  }

  async saveTests(tests) {
    try {
      await fs.writeJson(this.testsFile, { tests }, { spaces: 2 });
    } catch (error) {
      console.error('Error saving tests:', error);
      throw error;
    }
  }

  async loadResults() {
    try {
      const data = await fs.readJson(this.resultsFile);
      return data.results || [];
    } catch (error) {
      console.error('Error loading results:', error);
      return [];
    }
  }

  async saveResults(results) {
    try {
      await fs.writeJson(this.resultsFile, { results }, { spaces: 2 });
    } catch (error) {
      console.error('Error saving results:', error);
      throw error;
    }
  }

  calculateSuccessRate(results) {
    if (results.length === 0) return 0;
    
    const passed = results.filter(r => r.status === 'passed').length;
    return Math.round((passed / results.length) * 100);
  }

  calculateAvgExecutionTime(results) {
    if (results.length === 0) return 0;
    
    const totalTime = results.reduce((sum, r) => sum + (r.duration || 0), 0);
    return Math.round(totalTime / results.length);
  }

  analyzeTestTypes(tests) {
    const types = {};
    tests.forEach(test => {
      const type = test.testType || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  analyzeExecutionTrends(results) {
    const trends = {};
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    results
      .filter(r => new Date(r.startTime) >= last30Days)
      .forEach(result => {
        const date = new Date(result.startTime).toISOString().split('T')[0];
        if (!trends[date]) {
          trends[date] = { total: 0, passed: 0, failed: 0 };
        }
        trends[date].total++;
        if (result.status === 'passed') {
          trends[date].passed++;
        } else {
          trends[date].failed++;
        }
      });

    return trends;
  }

  analyzeBrowserDistribution(tests) {
    const browsers = {};
    tests.forEach(test => {
      const browser = test.mcpConfig?.browser || 'chromium';
      browsers[browser] = (browsers[browser] || 0) + 1;
    });
    return browsers;
  }

  analyzeTestTags(tests) {
    const tagCounts = {};
    tests.forEach(test => {
      const tags = test.mcpConfig?.tags || [];
      tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return tagCounts;
  }

  getRecentActivity(tests, results) {
    const recentTests = tests
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .slice(0, 10);

    const recentResults = results
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .slice(0, 10);

    return {
      recentTests: recentTests.map(test => ({
        id: test.id,
        prompt: test.prompt,
        testType: test.testType,
        created: test.created
      })),
      recentExecutions: recentResults.map(result => ({
        sessionId: result.sessionId,
        status: result.status,
        duration: result.duration,
        startTime: result.startTime
      }))
    };
  }

  analyzePerformance(results) {
    const performance = {
      avgDuration: this.calculateAvgExecutionTime(results),
      fastestExecution: Math.min(...results.map(r => r.duration || Infinity)),
      slowestExecution: Math.max(...results.map(r => r.duration || 0)),
      executionsByDuration: {
        fast: results.filter(r => (r.duration || 0) < 30000).length,
        medium: results.filter(r => (r.duration || 0) >= 30000 && (r.duration || 0) < 120000).length,
        slow: results.filter(r => (r.duration || 0) >= 120000).length
      }
    };

    return performance;
  }

  analyzeFailures(results) {
    const failures = results.filter(r => r.status === 'failed');
    
    const failureReasons = {};
    failures.forEach(failure => {
      // Simple failure categorization based on error output
      const errorOutput = failure.errorOutput || '';
      let reason = 'unknown';
      
      if (errorOutput.includes('timeout')) reason = 'timeout';
      else if (errorOutput.includes('element not found')) reason = 'element_not_found';
      else if (errorOutput.includes('network')) reason = 'network_error';
      else if (errorOutput.includes('assertion')) reason = 'assertion_failed';
      
      failureReasons[reason] = (failureReasons[reason] || 0) + 1;
    });

    return {
      totalFailures: failures.length,
      failureRate: results.length > 0 ? Math.round((failures.length / results.length) * 100) : 0,
      failureReasons,
      recentFailures: failures
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
        .slice(0, 5)
        .map(f => ({
          sessionId: f.sessionId,
          startTime: f.startTime,
          duration: f.duration,
          errorSummary: (f.errorOutput || '').substring(0, 200)
        }))
    };
  }

  async searchTests(query, filters = {}) {
    try {
      const tests = await this.loadTests();
      
      let filteredTests = tests;

      // Text search
      if (query) {
        const lowerQuery = query.toLowerCase();
        filteredTests = filteredTests.filter(test => 
          test.prompt.toLowerCase().includes(lowerQuery) ||
          test.summary?.toLowerCase().includes(lowerQuery) ||
          (test.mcpConfig?.tags || []).some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      }

      // Apply filters
      if (filters.testType) {
        filteredTests = filteredTests.filter(test => test.testType === filters.testType);
      }

      if (filters.browser) {
        filteredTests = filteredTests.filter(test => test.mcpConfig?.browser === filters.browser);
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredTests = filteredTests.filter(test => 
          filters.tags.some(tag => (test.mcpConfig?.tags || []).includes(tag))
        );
      }

      if (filters.dateFrom) {
        filteredTests = filteredTests.filter(test => 
          new Date(test.created) >= new Date(filters.dateFrom)
        );
      }

      if (filters.dateTo) {
        filteredTests = filteredTests.filter(test => 
          new Date(test.created) <= new Date(filters.dateTo)
        );
      }

      return filteredTests;
    } catch (error) {
      console.error('Error searching tests:', error);
      throw error;
    }
  }

  async getTestStatistics() {
    try {
      const tests = await this.loadTests();
      const results = await this.loadResults();

      return {
        totalTests: tests.length,
        totalExecutions: results.length,
        successRate: this.calculateSuccessRate(results),
        avgExecutionTime: this.calculateAvgExecutionTime(results),
        testTypes: this.analyzeTestTypes(tests),
        browsers: this.analyzeBrowserDistribution(tests),
        tags: this.analyzeTestTags(tests)
      };
    } catch (error) {
      console.error('Error getting test statistics:', error);
      throw error;
    }
  }
}

module.exports = TestManager;

