# WalletConnectX Technical Bridge Documentation

## Overview

This document provides a detailed technical explanation of how WalletConnectX establishes and maintains connections with decentralized applications (dApps). The bridge between our extension and web applications is a critical component that enables seamless integration while maintaining strict security boundaries.

## Architecture Overview

WalletConnectX employs a multi-layered architecture to securely bridge the gap between dApps and the wallet:

```
┌─────────────────┐      ┌────────────────┐     ┌────────────────┐     ┌───────────────┐
│                 │      │                │     │                │     │               │
│  Web3 dApp      │◄────►│  Injected      │◄───►│  Content       │◄───►│  Background   │
│  (Website)      │      │  Provider      │     │  Script        │     │  Script       │
│                 │      │                │     │                │     │               │
└─────────────────┘      └────────────────┘     └────────────────┘     └───────────────┘
                             |                                               ▲
                             |                                               │
                             ▼                                               │
                         ┌────────────────┐                          ┌───────────────┐
                         │                │                          │               │
                         │  Extension     │◄─────────────────────────┤  Popup UI     │
                         │  Storage       │                          │               │
                         │                │                          └───────────────┘
                         └────────────────┘
```

## Communication Layers

The bridge consists of several distinct communication layers, each with specific responsibilities:

### 1. Injected Provider Layer

**Purpose**: Exposes the EIP-1193 compliant interface to dApps, serving as the primary connection point for web applications.

**Implementation**:
- Injected via `injectScript.js` at the earliest possible time in document load
- Registers as `window.ethereum` for compatibility with existing dApps
- Also registers as `window.walletConnectX` for specific WalletConnectX features
- Implements standard EIP-1193 methods and events

**Key Code Implementation**:
```javascript
// From injectScript.js
window.crossNetWalletProvider = {
    isMetaMask: true, // For compatibility with dApps that check for MetaMask
    isWalletConnect: false,
    isCrossNetWallet: true,
    
    // EIP-1193 required method
    request: async function(request) {
        // Method implementation...
    },
    
    // Event system implementation
    on: function(eventName, listener) {
        // Event registration...
    }
};

// Assign to window.ethereum for dApp compatibility
window.ethereum = window.crossNetWalletProvider;
```

### 2. Content Script Layer

**Purpose**: Acts as a secure bridge between the web page context and the extension's privileged context.

**Implementation**:
- Runs in an isolated context with limited privileges
- Communicates with injected script via `window.postMessage()`
- Communicates with background script via Chrome messaging API
- Handles request/response routing between contexts

**Key Code Implementation**:
```javascript
// From contentScript.js
window.addEventListener('message', async function(event) {
    // Only accept messages from our window
    if (event.source !== window) return;
    
    const message = event.data;
    
    // Process messages from the page
    if (message && message.type === 'CROSSNET_WEB3_REQUEST') {
        await handleWeb3Request(message);
    }
});

// Send to background script
async function sendBackgroundMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            // Handle response...
        });
    });
}
```

### 3. Background Script Layer

**Purpose**: Serves as the central controller for wallet operations, handling permissions, connections, and transactions.

**Implementation**:
- Runs with extension privileges
- Manages wallet state and connections
- Handles permissions and security controls
- Processes and routes messages between components

**Key Code Implementation**:
```javascript
// From background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'WEB3_REQUEST':
            return handleWeb3Request(message, sender, sendResponse);
        case 'CONNECT_REQUEST':
            return handleConnectRequest(message, sender, sendResponse);
        // Additional message handlers...
    }
});
```

## Message Flow for Key Operations

### Connection Flow (eth_requestAccounts)

1. **dApp Initiates Connection**:
   ```javascript
   // dApp code
   const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
   ```

2. **Injected Provider Processes Request**:
   - Checks if already connected
   - If not connected, creates a connection request
   - Serializes request and sends via postMessage

3. **Content Script Receives Request**:
   - Receives the postMessage
   - Adds origin information for security
   - Forwards to background script via chrome.runtime.sendMessage

4. **Background Script Processes Request**:
   - Checks if site is already connected
   - If not, creates a new pending connection request
   - Stores request in state
   - Opens popup for user approval
   - Responds with "pending" status

5. **User Approves/Rejects in Popup**:
   - User sees connection request details
   - User selects accounts to share
   - User approves or rejects

6. **Background Script Processes Approval**:
   - Updates connected sites in state
   - Sends approval message to content script
   - Updates storage with new connection

7. **Content Script Forwards Approval**:
   - Receives approval from background
   - Sends success event via postMessage
   - Updates local state

8. **Injected Provider Completes Request**:
   - Receives success message
   - Resolves the original promise with accounts
   - Emits 'connect' and 'accountsChanged' events
   - Updates local state

### Transaction Signing Flow

1. **dApp Initiates Transaction**:
   ```javascript
   // dApp code
   const txHash = await window.ethereum.request({
     method: 'eth_sendTransaction',
     params: [transactionParameters]
   });
   ```

2. **Transaction Request Processing**:
   - Similar flow to connection request
   - Background script creates pending transaction
   - User approves in popup
   - Transaction is signed with private key
   - Result is returned to dApp

## Security Considerations

### Isolation and Context Boundaries

The extension uses Chrome's extension architecture to maintain strict context isolation:

1. **Web Page Context**: Contains only the injected provider script
2. **Content Script Context**: Isolated from page, limited permissions
3. **Background Script Context**: Full extension permissions, isolated storage

### Message Validation

All messages between contexts are validated:

1. **Origin Checking**: Messages are validated based on origin
2. **Request Sanitization**: Parameters are checked and sanitized
3. **Permission Verification**: Requests are checked against granted permissions

### Critical Security Implementations

```javascript
// Origin validation in Content Script
if (event.source !== window) return;

// Origin tracking in Background Script
const origin = new URL(sender.tab.url).origin;

// Permission checking
if (!state.connectedSites[origin] || !state.connectedSites[origin].connected) {
    sendResponse({
        error: {
            code: 4100,
            message: 'Unauthorized: Please connect first'
        }
    });
    return;
}
```

## EIP-1193 Compliance

WalletConnectX implements the Ethereum Provider JavaScript API as specified in [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193):

### Required Methods

1. **request**: Primary RPC method
   ```javascript
   provider.request({ method: String, params: Array });
   ```

### Required Events

1. **connect**: Emitted when successfully connected to chain
2. **disconnect**: Emitted on disconnection from chain
3. **chainChanged**: Emitted when the current chain changes
4. **accountsChanged**: Emitted when the available accounts change

### Error Handling

Standardized error codes following EIP-1193:
- 4001: User Rejected Request
- 4100: Unauthorized
- 4200: Unsupported Method
- 4900: Disconnected
- 4901: Chain Disconnected

## Implementation Deep Dive

### Injecting the Provider

The provider injection happens at document start to ensure it's available before any dApp code executes:

```javascript
// Manifest.json
"content_scripts": [
    {
        "matches": ["<all_urls>"],
        "js": ["contentScript.js"],
        "run_at": "document_start"
    }
]

// Content script injection logic
function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injectScript.js');
    (document.head || document.documentElement).appendChild(script);
}
```

### Message Serialization and Deserialization

All messages between contexts must be serializable:

```javascript
// Sending message from content script to injected script
window.postMessage({
    type: responseType,
    requestId,
    response: response,
    result: response
}, '*');

// Sending message from content script to background
chrome.runtime.sendMessage({
    type: 'WEB3_REQUEST',
    method,
    params,
    origin,
    requestId
}, (response) => {
    // Handle response
});
```

### Request/Response Tracking

Tracking is done through unique request IDs to match responses with requests:

```javascript
const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Store in pending requests
pendingRequests[requestId] = request;

// Match response to request later
if (response && response.requestId === message.requestId) {
    // Process matched response
}
```

## Testing the Bridge

To verify the bridge functionality:

1. **Basic Connection Test**:
   ```javascript
   await window.ethereum.request({ method: 'eth_requestAccounts' });
   ```

2. **Chain Switching Test**:
   ```javascript
   await window.ethereum.request({
     method: 'wallet_switchEthereumChain',
     params: [{ chainId: '0x89' }] // Polygon network
   });
   ```

3. **Transaction Signing Test**:
   ```javascript
   const txHash = await window.ethereum.request({
     method: 'eth_sendTransaction',
     params: [{
       from: accounts[0],
       to: '0xRecipientAddress',
       value: '0x0',
       gasLimit: '0x5028',
       gasPrice: '0x3b9aca00'
     }]
   });
   ```

## Troubleshooting Common Issues

### Connection Issues

- **Event bubbling**: Ensure events properly bubble through the DOM
- **Content script injection**: Verify script is injected at document_start
- **CSP restrictions**: Check for Content Security Policy blocking scripts

### Communication Failures

- **Message format**: Ensure all messages follow expected format
- **Response timing**: Handle asynchronous responses properly
- **Error propagation**: Make sure errors are properly propagated 

## Conclusion

The WalletConnectX bridge implements a secure, robust connection between dApps and the wallet extension. By following the EIP-1193 standard and implementing proper isolation between contexts, it enables seamless integration while maintaining strong security boundaries.

The multi-layered approach with injected provider, content script, and background script ensures that potentially malicious websites cannot access sensitive information while allowing legitimate dApps to interact with the wallet. 