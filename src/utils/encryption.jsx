import { ethers } from 'ethers';

// Function to encrypt sensitive data using AES
export const encryptData = async (data, password) => {
    try {
        // Create a wallet to use its encryption capabilities
        const wallet = ethers.Wallet.createRandom();
        const encryptedData = await wallet.encrypt(password, {
            data // Additional data to encrypt
        });
        return encryptedData;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

// Function to decrypt encrypted data
export const decryptData = async (encryptedData, password) => {
    try {
        const wallet = await ethers.Wallet.fromEncryptedJson(encryptedData, password);
        return wallet.mnemonic.phrase;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
};

// Function to hash passwords or other sensitive data
export const hashData = (data) => {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(data));
};

// Function to generate a random salt
export const generateSalt = () => {
    return ethers.utils.randomBytes(16);
};

// Encryption utilities for secure wallet storage

/**
 * Encrypts data with a password
 * @param {string} data - The data to encrypt
 * @param {string} password - The password to use for encryption
 * @returns {string} - The encrypted data
 */
export const encrypt = (data, password) => {
  try {
    // This is a simple implementation for demonstration
    // In a production app, use a proper encryption library like CryptoJS
    
    // Simple XOR encryption (NOT secure for production)
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ password.charCodeAt(i % password.length);
      result += String.fromCharCode(charCode);
    }
    
    // Convert to base64 for storage
    return btoa(result);
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

/**
 * Decrypts data with a password
 * @param {string} encryptedData - The encrypted data
 * @param {string} password - The password used for encryption
 * @returns {string} - The decrypted data or null if decryption fails
 */
export const decrypt = (encryptedData, password) => {
  try {
    // Convert from base64
    const data = atob(encryptedData);
    
    // Simple XOR decryption (NOT secure for production)
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ password.charCodeAt(i % password.length);
      result += String.fromCharCode(charCode);
    }
    
    return result;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};