class StreamingService {
  constructor(wss) {
    this.wss = wss;
    this.connections = new Map();
    this.subscriptions = new Map();
  }

  // Add a WebSocket connection
  addConnection(ws, connectionId) {
    this.connections.set(connectionId, {
      ws,
      subscriptions: new Set(),
      connected: true,
      connectedAt: new Date().toISOString()
    });

    ws.on('close', () => {
      this.removeConnection(connectionId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for connection ${connectionId}:`, error);
      this.removeConnection(connectionId);
    });
  }

  // Remove a WebSocket connection
  removeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.connected = false;
      this.connections.delete(connectionId);
      
      // Clean up subscriptions
      this.subscriptions.forEach((subscribers, channel) => {
        subscribers.delete(connectionId);
        if (subscribers.size === 0) {
          this.subscriptions.delete(channel);
        }
      });
    }
  }

  // Subscribe a connection to a specific channel
  subscribe(connectionId, channel) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel).add(connectionId);

    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.add(channel);
    }
  }

  // Unsubscribe a connection from a specific channel
  unsubscribe(connectionId, channel) {
    const subscribers = this.subscriptions.get(channel);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(channel);
      }
    }

    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.delete(channel);
    }
  }

  // Broadcast message to all connected clients
  broadcast(message) {
    const messageStr = JSON.stringify({
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    });

    this.connections.forEach((connection, connectionId) => {
      if (connection.connected && connection.ws.readyState === 1) { // WebSocket.OPEN
        try {
          connection.ws.send(messageStr);
        } catch (error) {
          console.error(`Error sending message to connection ${connectionId}:`, error);
          this.removeConnection(connectionId);
        }
      }
    });
  }

  // Send message to specific channel subscribers
  sendToChannel(channel, message) {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers) return;

    const messageStr = JSON.stringify({
      ...message,
      channel,
      timestamp: message.timestamp || new Date().toISOString()
    });

    subscribers.forEach(connectionId => {
      const connection = this.connections.get(connectionId);
      if (connection && connection.connected && connection.ws.readyState === 1) {
        try {
          connection.ws.send(messageStr);
        } catch (error) {
          console.error(`Error sending message to connection ${connectionId}:`, error);
          this.removeConnection(connectionId);
        }
      }
    });
  }

  // Send message to specific connection
  sendToConnection(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.connected && connection.ws.readyState === 1) {
      try {
        const messageStr = JSON.stringify({
          ...message,
          timestamp: message.timestamp || new Date().toISOString()
        });
        connection.ws.send(messageStr);
      } catch (error) {
        console.error(`Error sending message to connection ${connectionId}:`, error);
        this.removeConnection(connectionId);
      }
    }
  }

  // Handle incoming messages from clients
  handleMessage(ws, data) {
    try {
      const { type, payload, connectionId } = data;

      switch (type) {
        case 'subscribe':
          if (payload.channel && connectionId) {
            this.subscribe(connectionId, payload.channel);
            this.sendToConnection(connectionId, {
              type: 'subscription-confirmed',
              channel: payload.channel
            });
          }
          break;

        case 'unsubscribe':
          if (payload.channel && connectionId) {
            this.unsubscribe(connectionId, payload.channel);
            this.sendToConnection(connectionId, {
              type: 'unsubscription-confirmed',
              channel: payload.channel
            });
          }
          break;

        case 'ping':
          this.sendToConnection(connectionId, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
          break;

        case 'get-status':
          this.sendToConnection(connectionId, {
            type: 'status',
            payload: this.getStatus()
          });
          break;

        default:
          console.log(`Unknown message type: ${type}`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  // Get service status
  getStatus() {
    return {
      totalConnections: this.connections.size,
      activeChannels: this.subscriptions.size,
      connections: Array.from(this.connections.entries()).map(([id, conn]) => ({
        id,
        connected: conn.connected,
        connectedAt: conn.connectedAt,
        subscriptions: Array.from(conn.subscriptions)
      })),
      channels: Array.from(this.subscriptions.entries()).map(([channel, subscribers]) => ({
        channel,
        subscriberCount: subscribers.size
      }))
    };
  }

  // Send test execution updates
  sendTestUpdate(sessionId, update) {
    this.sendToChannel(`test-${sessionId}`, {
      type: 'test-update',
      sessionId,
      ...update
    });
  }

  // Send system notifications
  sendSystemNotification(message, level = 'info') {
    this.broadcast({
      type: 'system-notification',
      level,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Send analytics updates
  sendAnalyticsUpdate(data) {
    this.sendToChannel('analytics', {
      type: 'analytics-update',
      data
    });
  }

  // Clean up inactive connections
  cleanup() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    this.connections.forEach((connection, connectionId) => {
      const connectedTime = new Date(connection.connectedAt).getTime();
      if (now - connectedTime > timeout && connection.ws.readyState !== 1) {
        this.removeConnection(connectionId);
      }
    });
  }

  // Start periodic cleanup
  startCleanup(interval = 60000) { // 1 minute
    setInterval(() => {
      this.cleanup();
    }, interval);
  }
}

module.exports = StreamingService;

