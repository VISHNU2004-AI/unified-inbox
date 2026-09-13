(function () {
  'use strict';

  // Extract configuration from script tag
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var workspaceId = currentScript ? currentScript.getAttribute('data-workspace-id') || 'ws-default-workspace' : 'ws-default-workspace';
  var backendUrl = currentScript ? currentScript.getAttribute('data-backend-url') || (window.location.origin.includes(':3000') ? 'http://localhost:5000' : window.location.origin) : 'http://localhost:5000';
  var wsUrl = backendUrl.replace(/^http/, 'ws') + '/ws';

  // Visitor identity
  var visitorKey = 'ui_visitor_' + workspaceId;
  var visitorToken = localStorage.getItem(visitorKey);
  if (!visitorToken) {
    visitorToken = 'vis_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem(visitorKey, visitorToken);
  }

  var isOpen = false;
  var socket = null;
  var conversationId = null;
  var messages = [];
  var config = {
    businessName: 'Business Support',
    greeting: 'Hello! How can we help you today?',
    primaryColor: '#6366f1',
    accentColor: '#4f46e5'
  };

  // Inject CSS Styles
  var style = document.createElement('style');
  style.id = 'unified-inbox-widget-styles';
  style.textContent = `
    .ui-widget-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999999;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      border: none;
      outline: none;
    }
    .ui-widget-launcher:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 12px 30px rgba(99, 102, 241, 0.55);
    }
    .ui-widget-launcher svg {
      width: 28px;
      height: 28px;
      fill: #ffffff;
      transition: transform 0.3s ease;
    }
    .ui-widget-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 580px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 16px 48px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      animation: uiSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes uiSlideUp {
      from { opacity: 0; transform: translateY(20px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .ui-widget-header {
      background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
      color: #ffffff;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ui-widget-header-title {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .ui-widget-header-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      opacity: 0.9;
      margin-top: 2px;
    }
    .ui-widget-status-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
    }
    .ui-widget-close-btn {
      background: transparent;
      border: none;
      color: #ffffff;
      cursor: pointer;
      opacity: 0.8;
      padding: 4px;
      border-radius: 8px;
      transition: opacity 0.2s;
    }
    .ui-widget-close-btn:hover { opacity: 1; background: rgba(255, 255, 255, 0.15); }
    .ui-widget-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ui-widget-bubble {
      max-width: 80%;
      padding: 12px 16px;
      font-size: 14px;
      line-height: 1.45;
      border-radius: 16px;
      word-wrap: break-word;
    }
    .ui-widget-bubble.inbound {
      background: #6366f1;
      color: #ffffff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .ui-widget-bubble.outbound {
      background: #ffffff;
      color: #0f172a;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .ui-widget-ai-tag {
      font-size: 10px;
      font-weight: 600;
      color: #6366f1;
      background: #eef2ff;
      padding: 2px 6px;
      border-radius: 6px;
      margin-bottom: 4px;
      display: inline-block;
    }
    .ui-widget-time {
      font-size: 10px;
      opacity: 0.7;
      margin-top: 4px;
      text-align: right;
    }
    .ui-widget-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
      background: #ffffff;
      border-radius: 14px;
      width: fit-content;
      border: 1px solid #e2e8f0;
    }
    .ui-widget-typing-dot {
      width: 6px;
      height: 6px;
      background: #94a3b8;
      border-radius: 50%;
      animation: uiBlink 1.4s infinite both;
    }
    .ui-widget-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .ui-widget-typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes uiBlink {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
    .ui-widget-footer {
      padding: 12px 14px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ui-widget-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 24px;
      padding: 10px 16px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .ui-widget-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
    .ui-widget-send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #6366f1;
      color: #ffffff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
    }
    .ui-widget-send-btn:hover { background: #4f46e5; }
    .ui-widget-send-btn:active { transform: scale(0.95); }
    .ui-widget-brand {
      font-size: 10px;
      text-align: center;
      color: #94a3b8;
      padding-bottom: 6px;
      background: #ffffff;
    }
  `;
  document.head.appendChild(style);

  // Create Widget Elements
  var launcher = document.createElement('button');
  launcher.className = 'ui-widget-launcher';
  launcher.setAttribute('aria-label', 'Open Live Chat');
  launcher.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
    </svg>
  `;
  document.body.appendChild(launcher);

  var chatWindow = document.createElement('div');
  chatWindow.className = 'ui-widget-window';
  chatWindow.innerHTML = `
    <div class="ui-widget-header">
      <div>
        <div class="ui-widget-header-title" id="ui-widget-biz-name">Support Chat</div>
        <div class="ui-widget-header-status">
          <span class="ui-widget-status-dot"></span>
          <span>AI & Team Online</span>
        </div>
      </div>
      <button class="ui-widget-close-btn" id="ui-widget-close" aria-label="Close Chat">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="ui-widget-body" id="ui-widget-messages">
      <div class="ui-widget-bubble outbound">
        <div class="ui-widget-ai-tag">AI Assistant</div>
        <div id="ui-widget-welcome-msg">Hello! How can we help you today? Ask any questions about our services, pricing, or hours!</div>
        <div class="ui-widget-time">Just now</div>
      </div>
    </div>
    <div class="ui-widget-footer">
      <input type="text" class="ui-widget-input" id="ui-widget-input" placeholder="Type your message..." />
      <button class="ui-widget-send-btn" id="ui-widget-send" aria-label="Send Message">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
    <div class="ui-widget-brand">⚡ Powered by Unified Inbox</div>
  `;
  document.body.appendChild(chatWindow);

  var messagesContainer = chatWindow.querySelector('#ui-widget-messages');
  var inputField = chatWindow.querySelector('#ui-widget-input');
  var sendButton = chatWindow.querySelector('#ui-widget-send');
  var closeButton = chatWindow.querySelector('#ui-widget-close');
  var bizNameElem = chatWindow.querySelector('#ui-widget-biz-name');
  var welcomeMsgElem = chatWindow.querySelector('#ui-widget-welcome-msg');

  // Toggle Window
  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? 'flex' : 'none';
    if (isOpen) {
      inputField.focus();
      initWebSocket();
    }
  }

  launcher.addEventListener('click', toggleChat);
  closeButton.addEventListener('click', toggleChat);

  // Fetch Workspace Branding Config
  fetch(backendUrl + '/api/livechat/config?workspaceId=' + encodeURIComponent(workspaceId))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.success && data.config) {
        if (data.config.businessName) bizNameElem.textContent = data.config.businessName;
        if (data.config.greeting) welcomeMsgElem.textContent = data.config.greeting;
      }
    })
    .catch(function (err) {
      console.warn('[UnifiedInbox Widget] Could not fetch branding config:', err);
    });

  // WebSocket Connection
  function initWebSocket() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

    try {
      socket = new WebSocket(wsUrl);
      socket.onopen = function () {
        socket.send(JSON.stringify({
          type: 'JOIN_WORKSPACE',
          workspaceId: workspaceId,
          visitorToken: visitorToken
        }));
      };

      socket.onmessage = function (event) {
        try {
          var payload = JSON.parse(event.data);
          if (payload.type === 'NEW_MESSAGE' && payload.message) {
            var msg = payload.message;
            // Display message if it belongs to this visitor/conversation
            if (msg.senderType === 'AI_BOT' || msg.senderType === 'AGENT') {
              removeTypingIndicator();
              appendMessageBubble(msg.content, 'outbound', msg.senderType === 'AI_BOT');
            }
          }
        } catch (e) {
          console.error('[UnifiedInbox Widget] WS Parse error:', e);
        }
      };

      socket.onclose = function () {
        setTimeout(initWebSocket, 4000);
      };
    } catch (err) {
      console.warn('[UnifiedInbox Widget] WebSocket unavailable, falling back to REST');
    }
  }

  function appendMessageBubble(text, direction, isAi) {
    var bubble = document.createElement('div');
    bubble.className = 'ui-widget-bubble ' + direction;
    var html = '';
    if (isAi) {
      html += '<div class="ui-widget-ai-tag">AI Assistant</div>';
    } else if (direction === 'outbound') {
      html += '<div class="ui-widget-ai-tag" style="color:#10b981; background:#ecfdf5;">Agent</div>';
    }
    html += '<div>' + escapeHtml(text) + '</div>';
    html += '<div class="ui-widget-time">Just now</div>';
    bubble.innerHTML = html;
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showTypingIndicator() {
    removeTypingIndicator();
    var typing = document.createElement('div');
    typing.className = 'ui-widget-typing';
    typing.id = 'ui-widget-typing-indicator';
    typing.innerHTML = '<div class="ui-widget-typing-dot"></div><div class="ui-widget-typing-dot"></div><div class="ui-widget-typing-dot"></div>';
    messagesContainer.appendChild(typing);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function removeTypingIndicator() {
    var el = document.getElementById('ui-widget-typing-indicator');
    if (el) el.remove();
  }

  function sendMessage() {
    var text = inputField.value.trim();
    if (!text) return;

    inputField.value = '';
    appendMessageBubble(text, 'inbound', false);
    showTypingIndicator();

    // Send to Backend
    fetch(backendUrl + '/api/livechat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: workspaceId,
        visitorToken: visitorToken,
        content: text,
        visitorName: 'Website Visitor'
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.reply) {
          removeTypingIndicator();
          appendMessageBubble(data.reply.content, 'outbound', data.reply.isAiGenerated);
        }
      })
      .catch(function (err) {
        removeTypingIndicator();
        console.error('[UnifiedInbox Widget] Send failed:', err);
      });
  }

  sendButton.addEventListener('click', sendMessage);
  inputField.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
})();
