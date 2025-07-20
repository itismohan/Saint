import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { 
  Bot, 
  Play, 
  Code, 
  Terminal, 
  BarChart3, 
  Image, 
  Zap, 
  CheckCircle, 
  XCircle, 
  Clock,
  Sparkles,
  Brain,
  Cpu,
  Globe,
  Shield,
  Rocket
} from 'lucide-react';
import './App.css';

function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('code');
  const wsRef = useRef(null);

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://localhost:3001');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'generation-started':
        setIsGenerating(true);
        break;
      case 'generation-completed':
        setIsGenerating(false);
        setCurrentTest(data.result);
        break;
      case 'generation-error':
        setIsGenerating(false);
        console.error('Generation error:', data.error);
        break;
      case 'execution-started':
        setIsExecuting(true);
        setExecutionLogs([]);
        setTestResults(null);
        break;
      case 'test-output':
      case 'test-error':
      case 'dependency-output':
        setExecutionLogs(prev => [...prev, {
          type: data.type,
          content: data.data,
          timestamp: data.timestamp
        }]);
        break;
      case 'execution-completed':
        setIsExecuting(false);
        setTestResults(data.result);
        break;
      case 'execution-error':
        setIsExecuting(false);
        console.error('Execution error:', data.error);
        break;
    }
  };

  const generateTest = async () => {
    if (!prompt.trim()) return;

    try {
      const response = await fetch('http://localhost:3001/api/generate/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          testType: 'ui',
          options: {}
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate test');
      }

      // Test generation is handled via WebSocket
    } catch (error) {
      console.error('Error generating test:', error);
    }
  };

  const executeTest = async () => {
    if (!currentTest) return;

    try {
      const sessionId = `session-${Date.now()}`;
      
      const response = await fetch('http://localhost:3001/api/execute/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testData: currentTest,
          sessionId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute test');
      }

      // Test execution is handled via WebSocket
    } catch (error) {
      console.error('Error executing test:', error);
    }
  };

  const examplePrompts = [
    "Test the login page with invalid credentials and verify error message",
    "Check if the signup API returns 404 for missing required fields",
    "Test file upload functionality on Safari browser",
    "Verify responsive design on mobile viewport for homepage",
    "Test payment form validation with various input scenarios"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-2 h-2 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  SAINT
                </h1>
                <p className="text-sm text-muted-foreground">Smart AI for Integrated Next-gen Testing</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant={wsConnected ? "default" : "destructive"} className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
              </Badge>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Cpu className="w-4 h-4" />
                <span>Enterprise Ready</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Chat Interface */}
          <div className="lg:col-span-1">
            <Card className="h-fit shadow-xl border-0 bg-white/90 backdrop-blur-sm dark:bg-slate-800/90">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  <span>AI Test Assistant</span>
                </CardTitle>
                <CardDescription>
                  Describe the test you want to create and I'll generate it for you.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Example Prompts */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Quick Examples:</p>
                  <div className="space-y-2">
                    {examplePrompts.slice(0, 3).map((example, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="h-auto p-3 text-left justify-start whitespace-normal text-xs hover:bg-blue-50 dark:hover:bg-slate-700"
                        onClick={() => setPrompt(example)}
                      >
                        "{example}"
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Input Area */}
                <div className="space-y-3">
                  <Textarea
                    placeholder="Describe the test you want to create..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] resize-none border-2 focus:border-blue-500 transition-colors"
                  />
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={generateTest}
                      disabled={!prompt.trim() || isGenerating}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Generate Test
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Current Test Info */}
                {currentTest && (
                  <div className="space-y-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-sm">Test Generated</span>
                      </div>
                      <Badge variant="secondary">{currentTest.testType}</Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {currentTest.summary?.substring(0, 150)}...
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {currentTest.mcpConfig?.tags?.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <Button 
                      onClick={executeTest}
                      disabled={isExecuting}
                      className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                    >
                      {isExecuting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Execute Test
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Test Execution */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm dark:bg-slate-800/90">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Terminal className="w-5 h-5 text-green-600" />
                    <span>Test Execution</span>
                  </CardTitle>
                  
                  {isExecuting && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm text-muted-foreground">Running...</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="code" className="flex items-center space-x-2">
                      <Code className="w-4 h-4" />
                      <span>Code</span>
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="flex items-center space-x-2">
                      <Terminal className="w-4 h-4" />
                      <span>Logs</span>
                    </TabsTrigger>
                    <TabsTrigger value="results" className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Results</span>
                    </TabsTrigger>
                    <TabsTrigger value="media" className="flex items-center space-x-2">
                      <Image className="w-4 h-4" />
                      <span>Media</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="code" className="space-y-4">
                    {currentTest ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Generated Test Code</h3>
                          <Badge variant="outline">{currentTest.testType} test</Badge>
                        </div>
                        
                        <ScrollArea className="h-[500px] w-full rounded-md border bg-slate-50 dark:bg-slate-900">
                          <pre className="p-4 text-sm">
                            <code>{currentTest.code}</code>
                          </pre>
                        </ScrollArea>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-4">
                        <Code className="w-16 h-16 text-muted-foreground/50" />
                        <div>
                          <h3 className="font-semibold text-lg mb-2">No test generated yet</h3>
                          <p className="text-muted-foreground">
                            Enter a prompt and click "Generate Test" to see the code here.
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="logs" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Execution Logs</h3>
                      {executionLogs.length > 0 && (
                        <Badge variant="outline">{executionLogs.length} entries</Badge>
                      )}
                    </div>
                    
                    <ScrollArea className="h-[500px] w-full rounded-md border bg-slate-50 dark:bg-slate-900">
                      {executionLogs.length > 0 ? (
                        <div className="p-4 space-y-2">
                          {executionLogs.map((log, index) => (
                            <div key={index} className="text-sm font-mono">
                              <span className="text-muted-foreground text-xs">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                              <pre className="whitespace-pre-wrap">{log.content}</pre>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                          <Terminal className="w-16 h-16 text-muted-foreground/50" />
                          <div>
                            <h3 className="font-semibold text-lg mb-2">No execution logs yet</h3>
                            <p className="text-muted-foreground">
                              Execute a test to see real-time logs here.
                            </p>
                          </div>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="results" className="space-y-4">
                    {testResults ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="p-4">
                            <div className="flex items-center space-x-2">
                              {testResults.status === 'passed' ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                              <div>
                                <p className="font-semibold capitalize">{testResults.status}</p>
                                <p className="text-sm text-muted-foreground">Status</p>
                              </div>
                            </div>
                          </Card>
                          
                          <Card className="p-4">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="font-semibold">{Math.round(testResults.duration / 1000)}s</p>
                                <p className="text-sm text-muted-foreground">Duration</p>
                              </div>
                            </div>
                          </Card>
                          
                          <Card className="p-4">
                            <div className="flex items-center space-x-2">
                              <BarChart3 className="w-5 h-5 text-purple-600" />
                              <div>
                                <p className="font-semibold">{testResults.summary?.testCount || 1}</p>
                                <p className="text-sm text-muted-foreground">Tests Run</p>
                              </div>
                            </div>
                          </Card>
                        </div>

                        {testResults.summary && (
                          <div className="space-y-4">
                            <h4 className="font-semibold">Test Summary</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <div className="font-semibold text-green-600">{testResults.summary.passedCount}</div>
                                <div className="text-muted-foreground">Passed</div>
                              </div>
                              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <div className="font-semibold text-red-600">{testResults.summary.failedCount}</div>
                                <div className="text-muted-foreground">Failed</div>
                              </div>
                              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <div className="font-semibold text-yellow-600">{testResults.summary.skippedCount}</div>
                                <div className="text-muted-foreground">Skipped</div>
                              </div>
                              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <div className="font-semibold text-blue-600">{testResults.summary.testCount}</div>
                                <div className="text-muted-foreground">Total</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-4">
                        <BarChart3 className="w-16 h-16 text-muted-foreground/50" />
                        <div>
                          <h3 className="font-semibold text-lg mb-2">No test results yet</h3>
                          <p className="text-muted-foreground">
                            Execute a test to see detailed results and analytics here.
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="media" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Screenshots & Videos</h3>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-4">
                      <Image className="w-16 h-16 text-muted-foreground/50" />
                      <div>
                        <h3 className="font-semibold text-lg mb-2">No media artifacts yet</h3>
                        <p className="text-muted-foreground">
                          Screenshots and videos from test execution will appear here.
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center space-x-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span>Multi-Browser Support</span>
            </div>
            <div className="flex items-center space-x-2">
              <Rocket className="w-4 h-4" />
              <span>AI-Powered Testing</span>
            </div>
          </div>
          <p className="mt-4">
            SAINT v1.0.0 - Smart AI for Integrated Next-gen Testing
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;

