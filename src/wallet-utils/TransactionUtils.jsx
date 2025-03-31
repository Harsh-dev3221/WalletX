import { ethers } from 'ethers';
import { Chain } from '../components/interfaces/Chain';

// Function to get the wallet balance
export const getBalance = async (address, chain) => {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            // Try to connect to the specified RPC
            const provider = new ethers.providers.JsonRpcProvider(chain.rpcUrl);

            // Add a timeout to prevent hanging requests
            const balancePromise = provider.getBalance(address);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('RPC request timeout')), 5000)
            );

            // Race between the balance fetch and the timeout
            const balance = await Promise.race([balancePromise, timeoutPromise]);
            return ethers.utils.formatEther(balance);
        } catch (error) {
            console.error(`Error getting balance (attempt ${attempts + 1}/${maxAttempts}):`, error);
            attempts++;

            // If we've tried the chain's RPC URL and it failed, try a fallback
            if (attempts === 1 && chain.chainType === 'testnet') {
                console.log('Trying fallback testnet RPC...');
                // Create a temporary chain object with a fallback RPC
                const fallbackChain = { ...chain };
                fallbackChain.rpcUrl = "https://eth-sepolia.public.blastapi.io";
                chain = fallbackChain;
            } else if (attempts === 2) {
                console.log('Trying Infura as last resort...');
                // Last resort, try Infura
                const fallbackChain = { ...chain };
                fallbackChain.rpcUrl = "https://sepolia.infura.io/v3/5df1b3b20ec844dfa0b0d1a97381a168";
                chain = fallbackChain;
            }

            // If all attempts have failed, throw the error
            if (attempts >= maxAttempts) {
                throw new Error(`Failed to fetch balance after ${maxAttempts} attempts. Please try again later.`);
            }

            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
};


// Function to send tokens
export const sendToken = async (
    privateKey,
    toAddress,
    amount,
    chain
) => {
    try {
        let provider;
        try {
            // Try primary RPC
            provider = new ethers.providers.JsonRpcProvider(chain.rpcUrl);
            // Test the connection
            await provider.getNetwork();
        } catch (error) {
            console.log('Primary RPC failed, trying fallback...');
            // Try fallback RPC
            provider = new ethers.providers.JsonRpcProvider("https://eth-sepolia.public.blastapi.io");
        }

        const wallet = new ethers.Wallet(privateKey, provider);

        // Convert amount to Wei
        const amountInWei = ethers.utils.parseEther(amount);

        // Get the current gas price
        const gasPrice = await provider.getGasPrice();

        // Prepare transaction
        const tx = {
            to: toAddress,
            value: amountInWei,
            gasPrice: gasPrice,
            gasLimit: ethers.utils.hexlify(21000), // Standard gas limit for ETH transfers
        };

        // Send transaction
        const transaction = await wallet.sendTransaction(tx);

        // Wait for transaction confirmation
        await transaction.wait(1);

        return transaction;
    } catch (error) {
        console.error('Error sending tokens:', error);
        throw error;
    }
};

// Function to estimate gas fee
export const estimateGasFee = async (chain) => {
    try {
        let provider;
        try {
            provider = new ethers.providers.JsonRpcProvider(chain.rpcUrl);
            // Test the connection
            await provider.getNetwork();
        } catch (error) {
            console.log('Primary RPC failed when estimating gas, trying fallback...');
            provider = new ethers.providers.JsonRpcProvider("https://eth-sepolia.public.blastapi.io");
        }

        const gasPrice = await provider.getGasPrice();
        const gasFee = gasPrice.mul(21000); // Standard gas limit for ETH transfers
        return ethers.utils.formatEther(gasFee);
    } catch (error) {
        console.error('Error estimating gas fee:', error);
        // Return a default estimation rather than throwing
        return '0.0001';
    }
};

// Function to validate Ethereum address
// Function to validate Ethereum address
export const isValidAddress = (address) => {
    try {
        return ethers.utils.isAddress(address);
    } catch {
        return false;
    }
};

// Function to format transaction amount
export const formatAmount = (amount, decimals = 18) => {
    try {
        return ethers.utils.formatUnits(amount, decimals);
    } catch (error) {
        console.error('Error formatting amount:', error);
        throw error;
    }
};