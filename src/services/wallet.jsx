import { ethers } from 'ethers';

// Create a new wallet with mnemonic
export const createWallet = async () => {
    try {
        // Generate a random wallet with mnemonic
        const wallet = ethers.Wallet.createRandom();

        // Connect to a provider
        const provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/5df1b3b20ec844dfa0b0d1a97381a168');
        const connectedWallet = wallet.connect(provider);

        // Get wallet details
        const address = await connectedWallet.getAddress();
        const mnemonic = wallet.mnemonic.phrase;
        const privateKey = wallet.privateKey;

        return {
            success: true,
            wallet: {
                address,
                privateKey,
                mnemonic,
                provider
            }
        };
    } catch (error) {
        console.error("Wallet creation error:", error);
        return {
            success: false,
            error: error.message || 'Failed to create wallet'
        };
    }
};

// Connect using private key - improved implementation
export const connectWalletWithPrivateKey = async (privateKey) => {
    try {
        // Validate private key format
        if (!privateKey.startsWith('0x')) {
            privateKey = '0x' + privateKey;
        }

        // Validate private key length
        if (privateKey.length !== 66) { // 0x + 64 hex characters
            throw new Error('Invalid private key format. It should be 64 characters long.');
        }

        // Create a wallet instance from the private key
        const wallet = new ethers.Wallet(privateKey);

        // Connect to a provider
        // Note: In a real implementation, you might want to allow users to select networks
        const provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/5df1b3b20ec844dfa0b0d1a97381a168');
        const connectedWallet = wallet.connect(provider);

        // Verify the wallet is valid by checking the address
        const address = await connectedWallet.getAddress();

        // Fetch the initial wallet balance
        const balanceWei = await provider.getBalance(address);
        const balanceEth = ethers.utils.formatEther(balanceWei);

        return {
            success: true,
            wallet: {
                address: address,
                privateKey: privateKey,
                provider: provider,
                balance: balanceEth,
                // Note: Wallets connected via private key don't have a mnemonic
                mnemonic: null
            }
        };
    } catch (error) {
        console.error("Wallet connection error:", error);
        return {
            success: false,
            error: error.message || 'Failed to connect wallet with the provided private key'
        };
    }
};

// Helper function to check if private key is valid
export const isValidPrivateKey = (privateKey) => {
    try {
        // If it starts with 0x, remove it for the check
        const keyToCheck = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;

        // Try to create a wallet - this will throw if invalid
        new ethers.Wallet(keyToCheck);
        return true;
    } catch (error) {
        return false;
    }
};