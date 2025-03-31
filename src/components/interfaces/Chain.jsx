// src/interfaces/Chain.jsx

// Chain interface definition
export const CHAIN_TYPE = {
    TESTNET: 'testnet',
    MAINNET: 'mainnet'
};

// Chain interface structure
export class Chain {
    constructor(
        chainId,
        chainName,
        currencySymbol,
        rpcUrl,
        blockExplorerUrl,
        chainType = CHAIN_TYPE.MAINNET
    ) {
        this.chainId = chainId;
        this.chainName = chainName;
        this.currencySymbol = currencySymbol;
        this.rpcUrl = rpcUrl;
        this.blockExplorerUrl = blockExplorerUrl;
        this.chainType = chainType;
    }
}

// Define chain configurations
export const ethereum = new Chain(
    "0x1",
    "Ethereum Mainnet",
    "ETH",
    "https://mainnet.infura.io/v3/5df1b3b20ec844dfa0b0d1a97381a168",
    "https://etherscan.io",
    CHAIN_TYPE.MAINNET
);

export const sepolia = new Chain(
    "0xaa36a7",
    "Sepolia Testnet",
    "ETH",
    "https://sepolia.infura.io/v3/5df1b3b20ec844dfa0b0d1a97381a168",
    "https://sepolia.etherscan.io",
    CHAIN_TYPE.TESTNET
);

export const polygon = new Chain(
    "0x89",
    "Polygon Mainnet",
    "MATIC",
    "https://polygon-rpc.com",
    "https://polygonscan.com",
    CHAIN_TYPE.MAINNET
);

export const amoy = new Chain(
    "0x9088",
    "Amoy Testnet",
    "ETH",
    "https://sepolia.infura.io/v3/5df1b3b20ec844dfa0b0d1a97381a168", // Using Sepolia RPC for demo
    "https://amoy.etherscan.io",
    CHAIN_TYPE.TESTNET
);

// Modified Dojima testnet with a fallback RPC URL
export const dojima = new Chain(
    "0x5d5b",
    "Dojima Testnet",
    "DOJ",
    "https://ethereum-sepolia.publicnode.com", // Using a working public node as fallback
    "https://testnet-explorer.dojima.network",
    CHAIN_TYPE.TESTNET
);

// Update the CHAINS_CONFIG to include Dojima
export const CHAINS_CONFIG = {
    "0x1": ethereum,
    "0xaa36a7": sepolia,
    "0x89": polygon,
    "0x9088": amoy,
    "0x5d5b": dojima
};

// Helper function to get chain by ID
export const getChainById = (chainId) => {
    return CHAINS_CONFIG[chainId] || ethereum; // Default to Ethereum if not found
};