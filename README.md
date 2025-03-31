# WalletConnectX (Cross-Net Wallet)

A secure multi-chain crypto wallet browser extension with Web3 provider and WalletConnect support, designed for seamless integration with dApps.

![WalletConnectX Logo](public/icon.svg)

## 🚀 Features

- **Multi-Chain Support**: Connect to Ethereum, Polygon, BSC, Arbitrum, Optimism, and more
- **Secure Key Management**: Local encryption of private keys and session data
- **Permission-Based dApp Connections**: Request approval system for site connections
- **Transaction Signing**: Support for signing and sending blockchain transactions
- **Web3 Provider Interface**: EIP-1193 compliant provider API for dApp integration
- **Network Switching**: Switch between different blockchain networks
- **WalletConnect Integration**: Connect to mobile dApps via WalletConnect protocol
- **Mock Account Support**: Testing capability with mock accounts
- **Token Management**: Add and manage custom ERC-20 tokens
- **Transaction History**: View and monitor transaction history with PolyScan integration

## 📋 Project Structure

```
WalletConnectX/
├── public/                 # Public extension assets
│   ├── background.js       # Extension background script
│   ├── contentScript.js    # Content script injected into web pages
│   ├── injectScript.js     # Script injected into page context
│   ├── manifest.json       # Extension manifest
│   ├── icon.svg            # Extension icon
│   ├── popup.html          # Extension popup HTML
│   └── popup.js            # Extension popup JavaScript
├── src/                    # React app source code
│   ├── components/         # React components
│   │   ├── App.jsx         # Main app component
│   │   ├── Dashboard.jsx   # Wallet dashboard
│   │   ├── Settings.jsx    # Wallet settings
│   │   ├── WalletConnect.jsx # Connect existing wallet
│   │   ├── WalletCreate.jsx  # Create new wallet
│   │   ├── SeedPhrase.jsx    # Seed phrase display/recovery
│   │   └── RequestApproval.jsx # Connection/transaction approval UI
│   ├── services/           # Service modules
│   │   ├── wallet.jsx      # Wallet management service
│   │   ├── storage.jsx     # Secure storage service
│   │   └── extension.jsx   # Extension communication service
│   ├── hooks/              # React hooks
│   │   └── useExtensionRequests.jsx # Hook for managing extension requests
│   └── utils/              # Utility functions
│       └── encryption.jsx  # Encryption utilities
├── build/                  # Production build
├── .gitignore              # Git ignore file
├── package.json            # NPM package configuration
├── README.md               # Project documentation
```

## 🔧 Installation

### For Development

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/WalletConnectX.git
   cd WalletConnectX
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `build` folder

### For Users

1. Download the extension from the Chrome Web Store (coming soon)
2. Or download the latest release from GitHub and load it as an unpacked extension

## 🔑 Usage

### Creating a Wallet

1. Click on the WalletConnectX extension icon
2. Choose "Create New Wallet"
3. Set a secure password
4. Save your recovery seed phrase in a secure location

### Connecting to a dApp

1. Navigate to a Web3-enabled website (e.g., 1inch.io)
2. The site will request to connect to your wallet
3. Approve the connection request in the WalletConnectX popup
4. Your selected accounts will be connected to the site

### Switching Networks

1. In the wallet dashboard, select the desired network
2. Or approve network switch requests from dApps

### Signing Transactions

1. When a dApp requests a transaction, a popup will appear
2. Review transaction details
3. Approve or reject the transaction

## 💻 Developer Integration

### Web3 Provider API

The extension injects a Web3 provider that follows the EIP-1193 standard:

```javascript
// Check if wallet is available
if (window.ethereum) {
  try {
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log('Connected accounts:', accounts);
    
    // Get current chain ID
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    
    // Listen for account changes
    window.ethereum.on('accountsChanged', (accounts) => {
      console.log('Accounts changed:', accounts);
    });
    
    // Listen for chain changes
    window.ethereum.on('chainChanged', (chainId) => {
      console.log('Chain changed:', chainId);
      // Reload the page to refresh state
      window.location.reload();
    });
  } catch (error) {
    console.error('Connection error:', error);
  }
}
```

### WalletConnect Integration

The extension also supports WalletConnect protocol:

```javascript
// Check if WalletConnectX is available
if (window.walletConnectX) {
  // Use WalletConnect methods
  const accounts = await window.walletConnectX.getAllAccounts();
}
```

## 🔐 Security Architecture

- **Local Storage Encryption**: All sensitive data is encrypted using AES encryption
- **Session Management**: Limited-time sessions with secure session keys
- **Permission System**: Explicit user approval for all site connections
- **No Remote Key Storage**: Private keys never leave the user's device
- **Code Isolation**: Content script isolation from page context for security

## 🌐 Supported Networks

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| Ethereum Mainnet | 0x1 | https://eth-mainnet.g.alchemy.com/v2/demo |
| Goerli Testnet | 0x5 | https://eth-goerli.g.alchemy.com/v2/demo |
| Polygon | 0x89 | https://polygon-mainnet.g.alchemy.com/v2/demo |
| Polygon Mumbai | 0x13881 | https://polygon-mumbai.g.alchemy.com/v2/demo |
| Optimism | 0xa | https://opt-mainnet.g.alchemy.com/v2/demo |
| BSC | 0x38 | https://bsc-dataseed.binance.org |
| Arbitrum | 0xa4b1 | https://arb-mainnet.g.alchemy.com/v2/demo |
| Sepolia | 0xaa36a7 | https://eth-sepolia.g.alchemy.com/v2/demo |

## 📊 Transaction Tracking

- Ethereum transactions are tracked via Etherscan
- Polygon transactions are tracked via PolyScan
- Other networks use their respective block explorers

## 🔄 Communication Flow

The extension uses a multi-layered communication architecture:

1. **Injected Provider** → User webpage: Direct communication via `window.ethereum`
2. **Content Script** → Injected Provider: Communication via window.postMessage
3. **Background Script** → Content Script: Communication via Chrome messaging API
4. **Popup UI** → Background Script: Communication via Chrome messaging API

This layered approach ensures security while allowing seamless integration with web3 dApps.

## 🛠️ Customization

The wallet can be further customized to add:

1. Additional networks
2. Custom RPC endpoints
3. Token lists
4. Gas price estimations
5. NFT support
6. Hardware wallet integration

## 🚧 Future Development

- Enhanced transaction UI/UX
- Support for more networks
- Hardware wallet integration
- DeFi dashboard integration
- NFT management
- Gas optimization tools

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

*Note: This wallet extension is provided for educational and development purposes. Always use caution when handling cryptocurrency and private keys.*
 
