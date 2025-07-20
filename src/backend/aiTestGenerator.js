const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');

class AITestGenerator {
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });
    this.fallbackGenerator = new FallbackTestGenerator();
  }

  async generateTest(prompt, testType = 'ui', options = {}) {
    const testId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      console.log(`Generating ${testType} test for prompt: ${prompt}`);

      let testCode, mcpConfig, summary;

      // Try OpenAI first, fallback if it fails
      try {
        const result = await this.generateWithAI(prompt, testType, options);
        testCode = result.code;
        summary = result.summary;
      } catch (error) {
        console.log('OpenAI API failed, using fallback generator:', error.message);
        testCode = this.fallbackGenerator.generateTest(prompt, testType);
        summary = this.fallbackGenerator.generateSummary(prompt, testType);
      }

      // Generate MCP configuration
      mcpConfig = this.generateMCPConfig(prompt, testType, options);

      const testData = {
        id: testId,
        prompt,
        testType,
        code: testCode,
        mcpConfig,
        summary,
        options,
        metadata: {
          generated: timestamp,
          generator: 'SAINT AI',
          version: '1.0.0'
        }
      };

      return testData;

    } catch (error) {
      console.error('Error generating test:', error);
      throw new Error(`Test generation failed: ${error.message}`);
    }
  }

  async generateWithAI(prompt, testType, options) {
    const systemPrompt = this.getSystemPrompt(testType);
    const userPrompt = this.getUserPrompt(prompt, testType, options);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });

    const code = this.cleanCode(response.choices[0].message.content);
    
    // Generate summary
    const summaryResponse = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'Generate a concise summary of what this test does, including key steps and validations. Keep it under 200 words.' 
        },
        { 
          role: 'user', 
          content: `Original prompt: ${prompt}\\n\\nGenerated test code:\\n${code}` 
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    return {
      code,
      summary: summaryResponse.choices[0].message.content.trim()
    };
  }

  getSystemPrompt(testType) {
    const basePrompt = `You are SAINT, an expert AI testing assistant. Generate comprehensive, production-ready test code based on user prompts.

Rules:
1. Use modern testing frameworks and best practices
2. Include proper imports and test structure
3. Add meaningful assertions and error handling
4. Use async/await patterns
5. Include comments for complex logic
6. Generate clean, maintainable code
7. Follow enterprise-grade coding standards

Return only the test code without markdown formatting.`;

    switch (testType) {
      case 'ui':
        return `${basePrompt}

For UI tests:
- Use Playwright with TypeScript syntax
- Include proper page navigation and element interactions
- Add visual assertions and screenshot capture
- Handle loading states and dynamic content
- Include accessibility checks where relevant`;

      case 'api':
        return `${basePrompt}

For API tests:
- Use Playwright's request context or axios
- Include proper HTTP methods and headers
- Add response validation and status code checks
- Test both success and error scenarios
- Include authentication handling if mentioned`;

      case 'visual':
        return `${basePrompt}

For Visual tests:
- Use Playwright's visual comparison features
- Include screenshot comparisons
- Add responsive design checks
- Test across different viewports
- Include accessibility and contrast validations`;

      case 'mixed':
        return `${basePrompt}

For Mixed tests:
- Combine UI and API testing approaches
- Verify data consistency between UI and API
- Include end-to-end workflow testing
- Add cross-browser compatibility checks`;

      default:
        return basePrompt;
    }
  }

  getUserPrompt(prompt, testType, options) {
    let userPrompt = `Generate a ${testType} test for: ${prompt}

Include:
- Proper test structure and organization
- Comprehensive assertions
- Error handling and edge cases
- Performance considerations where relevant`;

    if (options.browser) {
      userPrompt += `\\n- Target browser: ${options.browser}`;
    }

    if (options.viewport) {
      userPrompt += `\\n- Viewport: ${options.viewport.width}x${options.viewport.height}`;
    }

    if (options.mobile) {
      userPrompt += `\\n- Mobile-optimized testing`;
    }

    if (options.accessibility) {
      userPrompt += `\\n- Include accessibility checks`;
    }

    return userPrompt;
  }

  generateMCPConfig(prompt, testType, options) {
    const tags = this.extractTags(prompt, testType);
    const timeout = this.determineTimeout(prompt, options);
    const browser = options.browser || this.determineBrowser(prompt);

    return {
      name: `test-${Date.now()}`,
      description: prompt,
      type: testType,
      timeout,
      retries: options.retries || this.config.execution.retries,
      screenshot: options.screenshot || 'only-on-failure',
      video: options.video || (this.config.mcp.videoRecording ? 'retain-on-failure' : 'off'),
      trace: options.trace || (this.config.mcp.traceOnFailure ? 'retain-on-failure' : 'off'),
      headless: options.headless !== undefined ? options.headless : this.config.execution.headless,
      browser,
      viewport: options.viewport || this.config.execution.viewport,
      workers: options.workers || this.config.execution.workers,
      tags,
      metadata: {
        generated: new Date().toISOString(),
        prompt: prompt.substring(0, 200),
        aiGenerated: true
      }
    };
  }

  extractTags(prompt, testType) {
    const tags = [testType];
    const lowerPrompt = prompt.toLowerCase();

    // Functional tags
    if (lowerPrompt.includes('login')) tags.push('login', 'authentication');
    if (lowerPrompt.includes('signup') || lowerPrompt.includes('register')) tags.push('signup', 'registration');
    if (lowerPrompt.includes('payment') || lowerPrompt.includes('checkout')) tags.push('payment', 'e-commerce');
    if (lowerPrompt.includes('upload')) tags.push('upload', 'file-handling');
    if (lowerPrompt.includes('search')) tags.push('search', 'functionality');
    if (lowerPrompt.includes('form')) tags.push('form', 'validation');

    // Technical tags
    if (lowerPrompt.includes('api')) tags.push('api');
    if (lowerPrompt.includes('mobile')) tags.push('mobile', 'responsive');
    if (lowerPrompt.includes('accessibility')) tags.push('accessibility', 'a11y');
    if (lowerPrompt.includes('performance')) tags.push('performance');
    if (lowerPrompt.includes('security')) tags.push('security');

    // Priority tags
    if (lowerPrompt.includes('critical') || lowerPrompt.includes('important')) tags.push('high-priority');
    if (lowerPrompt.includes('regression')) tags.push('regression');
    if (lowerPrompt.includes('smoke')) tags.push('smoke');

    return [...new Set(tags)]; // Remove duplicates
  }

  determineTimeout(prompt, options) {
    if (options.timeout) return options.timeout;

    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('slow') || lowerPrompt.includes('upload') || lowerPrompt.includes('download')) {
      return 120000; // 2 minutes
    }
    if (lowerPrompt.includes('payment') || lowerPrompt.includes('checkout')) {
      return 90000; // 1.5 minutes
    }
    if (lowerPrompt.includes('quick') || lowerPrompt.includes('fast')) {
      return 30000; // 30 seconds
    }
    
    return this.config.mcp.testTimeout; // Default from config
  }

  determineBrowser(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('safari') || lowerPrompt.includes('webkit')) return 'webkit';
    if (lowerPrompt.includes('firefox')) return 'firefox';
    if (lowerPrompt.includes('edge')) return 'chromium'; // Edge uses Chromium
    
    return 'chromium'; // Default
  }

  cleanCode(code) {
    // Remove markdown code blocks if present
    let cleaned = code.replace(/```typescript\\n?/g, '').replace(/```javascript\\n?/g, '').replace(/```\\n?/g, '');
    
    // Ensure proper imports are present
    if (!cleaned.includes("import { test, expect }") && !cleaned.includes("const { test, expect }")) {
      cleaned = "import { test, expect } from '@playwright/test';\\n\\n" + cleaned;
    }
    
    return cleaned.trim();
  }
}

// Fallback generator for when OpenAI API is unavailable
class FallbackTestGenerator {
  generateTest(prompt, testType) {
    const templates = {
      ui: this.getUITemplate(prompt),
      api: this.getAPITemplate(prompt),
      visual: this.getVisualTemplate(prompt),
      mixed: this.getMixedTemplate(prompt)
    };

    return templates[testType] || templates.ui;
  }

  getUITemplate(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('login')) {
      return `import { test, expect } from '@playwright/test';

test.describe('Login Tests', () => {
  test('should handle login functionality', async ({ page }) => {
    // Navigate to login page
    await page.goto('https://example.com/login');
    
    // Fill login form
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    
    // Submit form
    await page.click('[data-testid="login-button"]');
    
    // Verify result
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Take screenshot for verification
    await page.screenshot({ path: 'login-test.png' });
  });
});`;
    }

    return `import { test, expect } from '@playwright/test';

test.describe('UI Tests', () => {
  test('should test UI functionality', async ({ page }) => {
    // Navigate to the page
    await page.goto('https://example.com');
    
    // Verify page loads
    await expect(page).toHaveTitle(/Example/);
    
    // Interact with elements
    await page.click('button');
    
    // Verify results
    await expect(page.locator('.result')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'ui-test.png' });
  });
});`;
  }

  getAPITemplate(prompt) {
    return `import { test, expect } from '@playwright/test';

test.describe('API Tests', () => {
  test('should test API functionality', async ({ request }) => {
    const response = await request.get('/api/endpoint');
    
    expect(response.status()).toBe(200);
    
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('data');
  });
});`;
  }

  getVisualTemplate(prompt) {
    return `import { test, expect } from '@playwright/test';

test.describe('Visual Tests', () => {
  test('should test visual appearance', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Take screenshot for visual comparison
    await expect(page).toHaveScreenshot('baseline.png');
    
    // Test responsive design
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('mobile.png');
  });
});`;
  }

  getMixedTemplate(prompt) {
    return `import { test, expect } from '@playwright/test';

test.describe('Mixed UI and API Tests', () => {
  test('should test UI and API consistency', async ({ page, request }) => {
    // API call
    const apiResponse = await request.get('/api/data');
    expect(apiResponse.status()).toBe(200);
    const apiData = await apiResponse.json();
    
    // UI verification
    await page.goto('https://example.com');
    await expect(page.locator('[data-testid="data"]')).toContainText(apiData.value);
    
    await page.screenshot({ path: 'mixed-test.png' });
  });
});`;
  }

  generateSummary(prompt, testType) {
    return `This ${testType} test was generated based on the prompt: "${prompt}". It includes basic test structure with proper assertions and error handling using the SAINT fallback generator. The test follows enterprise-grade testing practices and includes screenshot capture for verification.`;
  }
}

module.exports = AITestGenerator;

