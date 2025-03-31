/**
 * Cross-Net Wallet Provider Injection Script
 * 
 * This script is injected into web pages to provide a wallet interface
 * that web3 applications can detect and interact with.
 * Implementation follows EIP-1193 standard for Ethereum providers.
 */

(function () {
    console.log('Cross-Net Wallet provider injecting...');

    // Prevent double injection
    if (window.crossNetInjected) {
        console.log('Cross-Net Wallet provider already injected, skipping');
        return;
    }

    // Set flag to prevent double injection
    window.crossNetInjected = true;

    // Track connection state
    let connected = false;
    let accounts = [];
    let chainId = null;
    let pendingRequests = {};

    // EIP-1193 Error Codes and Classes
    const ERROR_CODES = {
        USER_REJECTED: 4001,
        UNAUTHORIZED: 4100,
        UNSUPPORTED_METHOD: 4200,
        DISCONNECTED: 4900,
        CHAIN_DISCONNECTED: 4901,
        RESOURCE_UNAVAILABLE: -32002,
        RESOURCE_NOT_FOUND: -32601
    };

    class ProviderRpcError extends Error {
        constructor(code, message) {
            super(message);
            this.code = code;
            this.name = this.constructor.name;
            this.message = message;
        }
    }

    // Create our provider object
    window.crossNetWalletProvider = {
        isMetaMask: true, // For compatibility with dApps that check for MetaMask
        isWalletConnect: false,
        isCrossNetWallet: true,
        isConnected: () => connected,
        chainId: null, // Will be set on initialization
        selectedAddress: null, // Will be set on connection

        on: function (eventName, listener) {
            if (!this._events) this._events = {};
            if (!this._events[eventName]) this._events[eventName] = [];
            this._events[eventName].push(listener);
            return this;
        },

        removeListener: function (eventName, listener) {
            if (!this._events || !this._events[eventName]) return this;
            const idx = this._events[eventName].indexOf(listener);
            if (idx > -1) this._events[eventName].splice(idx, 1);
            return this;
        },

        emit: function (eventName, ...args) {
            if (!this._events || !this._events[eventName]) return false;
            const listeners = this._events[eventName].slice();
            for (const listener of listeners) {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Error in ${eventName} event listener:`, error);
                }
            }
            return true;
        },

        // Main JSON-RPC request handler
        request: async function (request) {
            if (!request || typeof request !== 'object') {
                throw new ProviderRpcError(
                    ERROR_CODES.INVALID_PARAMS,
                    'Invalid request: Expected object with method and params'
                );
            }

            const { method, params } = request;
            console.log(`Cross-Net Wallet: request method=${method}`, params);

            // Special handling for eth_requestAccounts
            if (method === 'eth_requestAccounts') {
                // If already connected, return the accounts
                if (connected && accounts.length > 0) {
                    console.log('Already connected, returning accounts:', accounts);
                    return accounts;
                }

                // If there's a pending request, tell the user
                if (pendingRequests['eth_requestAccounts']) {
                    console.log('Connection request already pending');
                    throw new ProviderRpcError(
                        ERROR_CODES.RESOURCE_UNAVAILABLE,
                        'Request to connect is already pending. Check the Cross-Net Wallet extension popup.'
                    );
                }

                // Request connection from the extension
                try {
                    console.log('Requesting connection from extension...');
                    pendingRequests['eth_requestAccounts'] = true;

                    // Send connection request to extension
                    const result = await this._sendToContentScript({
                        method: 'eth_requestAccounts',
                        params: []
                    });

                    delete pendingRequests['eth_requestAccounts'];

                    // If the request is pending approval in the extension
                    if (result && result.pending === true) {
                        console.log('Connection request pending approval in the wallet...');

                        // Instead of returning immediately with an error, we should
                        // indicate to the dApp that we're waiting for approval

                        // Keep tracking the pending state
                        pendingRequests['eth_requestAccounts'] = true;

                        // Show a notification to the user if possible
                        try {
                            // Create a subtle notification
                            const notificationElement = document.createElement('div');
                            notificationElement.id = 'crossnet-wallet-notification';
                            notificationElement.style.cssText = `
                                position: fixed;
                                top: 20px;
                                right: 20px;
                                padding: 15px;
                                background: rgba(49, 151, 149, 0.9);
                                color: white;
                                border-radius: 8px;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                z-index: 9999;
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                font-size: 14px;
                                max-width: 300px;
                            `;
                            notificationElement.textContent = "Please check the Cross-Net Wallet extension to approve this connection.";
                            document.body.appendChild(notificationElement);

                            // Remove after 5 seconds
                            setTimeout(() => {
                                if (notificationElement && notificationElement.parentNode) {
                                    notificationElement.parentNode.removeChild(notificationElement);
                                }
                            }, 5000);
                        } catch (e) {
                            console.log('Could not show notification:', e);
                        }

                        // Now wait for the user to respond
                        throw new ProviderRpcError(
                            ERROR_CODES.RESOURCE_UNAVAILABLE,
                            'Wallet connection request pending. Please check Cross-Net Wallet extension to approve.'
                        );
                    }

                    // If we got accounts back, we're connected
                    if (result && Array.isArray(result) && result.length > 0) {
                        connected = true;
                        accounts = result;
                        chainId = result.chainId || '0x1';
                        this.selectedAddress = accounts[0];
                        this.chainId = chainId;

                        console.log('Connected to Cross-Net Wallet:', {
                            accounts,
                            chainId
                        });

                        // Emit connection events
                        this.emit('connect', { chainId });
                        this.emit('accountsChanged', accounts);
                        this.emit('chainChanged', chainId);

                        return accounts;
                    } else if (result && result.accounts && Array.isArray(result.accounts) && result.accounts.length > 0) {
                        // Alternative format sometimes returned
                        connected = true;
                        accounts = result.accounts;
                        chainId = result.chainId || '0x1';
                        this.selectedAddress = accounts[0];
                        this.chainId = chainId;

                        // Emit connection events
                        this.emit('connect', { chainId });
                        this.emit('accountsChanged', accounts);
                        this.emit('chainChanged', chainId);

                        return accounts;
                    } else {
                        connected = false;
                        accounts = [];
                        throw new ProviderRpcError(
                            ERROR_CODES.USER_REJECTED,
                            'User rejected the request.'
                        );
                    }
                } catch (error) {
                    delete pendingRequests['eth_requestAccounts'];
                    console.error('Connection error:', error);

                    // Convert error to a standardized provider error
                    throw new ProviderRpcError(
                        error.code || ERROR_CODES.USER_REJECTED,
                        error.message || 'User rejected the request'
                    );
                }
            }

            // Special handling for wallet_switchEthereumChain
            if (method === 'wallet_switchEthereumChain') {
                try {
                    console.log('Switching chain to:', params[0]?.chainId);

                    // Send the request to the content script
                    const result = await this._sendToContentScript({
                        method: 'wallet_switchEthereumChain',
                        params: params || []
                    });

                    console.log('Chain switch result:', result);

                    // As per EIP-1193, if successful, this method returns null
                    if (result === null) {
                        // Update chainId in the provider
                        if (params[0]?.chainId) {
                            this.chainId = params[0].chainId;
                            chainId = params[0].chainId;

                            // Emit chainChanged event
                            this.emit('chainChanged', this.chainId);
                        }
                        return null;
                    } else if (result && result.error) {
                        throw new ProviderRpcError(
                            result.error.code || ERROR_CODES.CHAIN_DISCONNECTED,
                            result.error.message || 'Error switching chain'
                        );
                    }

                    // Return whatever result we got
                    return result;
                } catch (error) {
                    console.error('Error switching chain:', error);
                    throw new ProviderRpcError(
                        error.code || ERROR_CODES.CHAIN_DISCONNECTED,
                        error.message || 'Failed to switch chain'
                    );
                }
            }

            // Handle eth_accounts - Return connected accounts or empty array
            if (method === 'eth_accounts') {
                if (connected && accounts.length > 0) {
                    return accounts;
                }
                return [];
            }

            // Handle eth_chainId - Return the current chainId
            if (method === 'eth_chainId') {
                return chainId || '0x1'; // Default to Ethereum Mainnet
            }

            // Forward all other requests to the extension
            return this._sendToContentScript({
                method,
                params: params || []
            });
        },

        // Helper to send requests to content script
        _sendToContentScript: function (request) {
            return new Promise((resolve, reject) => {
                const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                // Create message listener for this request
                const messageListener = (event) => {
                    if (event.source !== window) return;

                    // Check for responses to our requests
                    if (
                        event.data &&
                        (event.data.type === 'CROSSNET_WEB3_RESPONSE' ||
                            event.data.type === 'CROSS_NET_WALLET_RESPONSE') &&
                        event.data.requestId === requestId
                    ) {
                        // Clean up listener
                        window.removeEventListener('message', messageListener);

                        if (event.data.error) {
                            console.error('Request failed:', event.data.error);
                            reject(new ProviderRpcError(
                                event.data.error.code || ERROR_CODES.INTERNAL_ERROR,
                                event.data.error.message || 'Unknown error'
                            ));
                        } else {
                            console.log('Request succeeded:', event.data.result || event.data.response);
                            resolve(event.data.result || event.data.response);
                        }
                    }
                };

                // Add listener for response
                window.addEventListener('message', messageListener);

                // Send request to content script
                window.postMessage({
                    type: 'CROSSNET_WEB3_REQUEST',
                    requestId,
                    request
                }, '*');

                // Set timeout for response
                setTimeout(() => {
                    window.removeEventListener('message', messageListener);
                    reject(new ProviderRpcError(
                        ERROR_CODES.RESOURCE_UNAVAILABLE,
                        'Request timed out. Please check that Cross-Net Wallet extension is enabled.'
                    ));
                }, 30000); // 30 second timeout
            });
        },

        // Legacy methods for compatibility
        enable: function () {
            console.log('Legacy enable() method called, redirecting to eth_requestAccounts');
            return this.request({ method: 'eth_requestAccounts' });
        },

        send: function (methodOrPayload, paramsOrCallback) {
            console.log('Legacy send() method called:', methodOrPayload, paramsOrCallback);

            // Case 1: send({ method, params }) - promise-based usage
            if (methodOrPayload && typeof methodOrPayload === 'object' && !Array.isArray(methodOrPayload)) {
                return this.request(methodOrPayload);
            }

            // Case 2: send(method, params) - promise-based usage
            if (typeof methodOrPayload === 'string' && (!paramsOrCallback || Array.isArray(paramsOrCallback))) {
                return this.request({
                    method: methodOrPayload,
                    params: paramsOrCallback || []
                });
            }

            // Case 3: send(payload, callback) - callback-based usage
            if (methodOrPayload && typeof methodOrPayload === 'object' && typeof paramsOrCallback === 'function') {
                const callback = paramsOrCallback;
                this.request(methodOrPayload)
                    .then(result => callback(null, { id: methodOrPayload.id, jsonrpc: '2.0', result }))
                    .catch(error => callback(error, null));
                return;
            }

            throw new ProviderRpcError(
                ERROR_CODES.UNSUPPORTED_METHOD,
                'Unsupported send() usage. Please use request() instead.'
            );
        },

        sendAsync: function (payload, callback) {
            console.log('Legacy sendAsync() method called:', payload);
            if (!callback || typeof callback !== 'function') {
                throw new ProviderRpcError(
                    ERROR_CODES.INVALID_PARAMS,
                    'Invalid callback provided to sendAsync. Expected function.'
                );
            }

            // Handle batch requests
            if (Array.isArray(payload)) {
                Promise.all(payload.map(p => this.request(p)))
                    .then(results => callback(null, results.map((result, i) => ({
                        id: payload[i].id,
                        jsonrpc: '2.0',
                        result
                    }))))
                    .catch(error => callback(error, null));
                return;
            }

            // Handle single request
            this.request(payload)
                .then(result => callback(null, {
                    id: payload.id,
                    jsonrpc: '2.0',
                    result
                }))
                .catch(error => callback(error, null));
        }
    };

    // Set provider in window scope for dApp detection
    window.ethereum = window.crossNetWalletProvider;

    // Also support walletConnectX detection
    window.walletConnectX = {
        connected: false,
        chainId: 1,
        accounts: [],

        // Add methods needed for WalletConnect detection
        getAllAccounts: function () {
            return window.ethereum.request({ method: 'eth_accounts' });
        },

        request: function (request) {
            return window.ethereum.request(request);
        }
    };

    // Listen for wallet events from content script
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;

        const { data } = event;
        if (!data || !data.type) return;

        if (data.type === 'CROSSNET_WALLET_EVENT' || data.type === 'CROSS_NET_WALLET_EVENT') {
            console.log('Received wallet event:', data.event, data.data);

            // Update our state based on the event
            switch (data.event) {
                case 'connect':
                    connected = true;
                    chainId = data.data.chainId;
                    window.crossNetWalletProvider.chainId = chainId;
                    window.crossNetWalletProvider.emit('connect', { chainId });
                    // Also update walletConnectX
                    window.walletConnectX.connected = true;
                    window.walletConnectX.chainId = parseInt(chainId, 16);
                    break;

                case 'disconnect':
                    connected = false;
                    accounts = [];
                    window.crossNetWalletProvider.selectedAddress = null;
                    window.crossNetWalletProvider.emit('disconnect', data.data);
                    // Also update walletConnectX
                    window.walletConnectX.connected = false;
                    window.walletConnectX.accounts = [];
                    break;

                case 'accountsChanged':
                    accounts = data.data;
                    window.crossNetWalletProvider.selectedAddress = accounts && accounts.length > 0 ? accounts[0] : null;
                    window.crossNetWalletProvider.emit('accountsChanged', accounts);
                    // Also update walletConnectX
                    window.walletConnectX.accounts = accounts;
                    break;

                case 'chainChanged':
                    chainId = data.data;
                    window.crossNetWalletProvider.chainId = chainId;
                    window.crossNetWalletProvider.emit('chainChanged', chainId);
                    // Also update walletConnectX
                    window.walletConnectX.chainId = parseInt(chainId, 16);
                    break;
            }
        }

        // Handle events from MetaMask compatibility layer
        if (data.type === 'metamask:chainChanged') {
            window.crossNetWalletProvider.emit('chainChanged', data.data);
        }

        if (data.type === 'metamask:accountsChanged') {
            window.crossNetWalletProvider.emit('accountsChanged', data.data);
        }
    });

    // Check if we're already connected by looking for cached accounts
    try {
        const cachedAccounts = localStorage.getItem('crossnet_connected_accounts');
        if (cachedAccounts) {
            accounts = JSON.parse(cachedAccounts);
            if (Array.isArray(accounts) && accounts.length > 0) {
                connected = true;
                window.crossNetWalletProvider.selectedAddress = accounts[0];
                console.log('Found cached connection:', accounts);
            }
        }
    } catch (error) {
        console.error('Error checking cached connection:', error);
    }

    console.log('Cross-Net Wallet provider injected successfully');

    // Dispatch events to notify the page about the provider
    document.dispatchEvent(new Event('crossNetExtensionLoaded'));
    window.dispatchEvent(new Event('ethereum#initialized'));

    // Dispatch an event for MetaMask compatibility
    window.dispatchEvent(new Event('metamask#initialized'));
})(); 
