// Storage service for wallet management
import { encrypt, decrypt } from '../utils/encryption.jsx';

// Constants for storage keys
const STORAGE_KEYS = {
    WALLET_DATA: 'walletData',
    PASSWORD_HASH: 'passwordHash',
    SESSION_DATA: 'sessionData',
    REMEMBER_ME: 'rememberMe'
};

// Fixed encryption key for session data (do not change this once deployed)
const SESSION_ENCRYPTION_KEY = 'cross-net-wallet-session-v1';

// Function to check if wallet exists in storage
export const walletExists = () => {
    const walletData = localStorage.getItem(STORAGE_KEYS.WALLET_DATA);
    return !!walletData;
};

// Check if user has created a password before
export const hasStoredPassword = () => {
    const passwordHash = localStorage.getItem(STORAGE_KEYS.PASSWORD_HASH);
    return !!passwordHash;
};

// Check if user has an active session
export const hasActiveSession = () => {
    const sessionData = localStorage.getItem(STORAGE_KEYS.SESSION_DATA);
    if (!sessionData) return false;

    try {
        const session = JSON.parse(sessionData);
        // Check if session is still valid (not expired)
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
            return true;
        }
        // Session expired, clean it up
        localStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
        return false;
    } catch (error) {
        console.error('Error checking session:', error);
        return false;
    }
};

// Save user session data
export const saveSession = (password) => {
    try {
        // Create session with 30-day expiration
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Encrypt the password with a fixed key instead of itself
        const encryptedPassword = encrypt(password, SESSION_ENCRYPTION_KEY);

        const sessionData = {
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            encryptedPassword
        };

        localStorage.setItem(STORAGE_KEYS.SESSION_DATA, JSON.stringify(sessionData));
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');

        console.log('Session saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving session:', error);
        return false;
    }
};

// Get the session password (for decrypting wallet data)
export const getSessionPassword = () => {
    try {
        const sessionData = localStorage.getItem(STORAGE_KEYS.SESSION_DATA);
        if (!sessionData) return null;

        const session = JSON.parse(sessionData);
        if (!session.encryptedPassword) return null;

        // Decrypt the password using our fixed key
        const password = decrypt(session.encryptedPassword, SESSION_ENCRYPTION_KEY);

        // Verify the password is correct by trying to decrypt the stored password hash
        if (password && verifyPassword(password)) {
            console.log('Session password retrieved successfully');
            return password;
        }

        console.warn('Password verification failed');
        return null;
    } catch (error) {
        console.error('Error getting session password:', error);
        return null;
    }
};

// Clear the active session
export const clearSession = () => {
    try {
        localStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
        console.log('Session cleared successfully');
        return true;
    } catch (error) {
        console.error('Error clearing session:', error);
        return false;
    }
};

// Verify if the entered password matches the stored one
export const verifyPassword = (password) => {
    try {
        const storedHash = localStorage.getItem(STORAGE_KEYS.PASSWORD_HASH);
        if (!storedHash) return false;

        const decryptedHash = decrypt(storedHash, password);
        return decryptedHash === password;
    } catch (error) {
        console.error('Error verifying password:', error);
        return false;
    }
};

// Function to get wallet data from storage with decryption
export const getWalletData = (password) => {
    try {
        const encryptedData = localStorage.getItem(STORAGE_KEYS.WALLET_DATA);
        if (!encryptedData) return null;

        const decryptedData = decrypt(encryptedData, password);
        if (!decryptedData) return null;

        return JSON.parse(decryptedData);
    } catch (error) {
        console.error('Error retrieving wallet data:', error);
        return null;
    }
};

// Function to save wallet data to storage with encryption
export const saveWalletData = (walletData, password) => {
    try {
        const dataToStore = JSON.stringify(walletData);
        const encryptedData = encrypt(dataToStore, password);
        localStorage.setItem(STORAGE_KEYS.WALLET_DATA, encryptedData);

        // Store password hash for future verification
        if (!hasStoredPassword()) {
            localStorage.setItem(STORAGE_KEYS.PASSWORD_HASH, encrypt(password, password));
        }

        console.log('Wallet data saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving wallet data:', error);
        return false;
    }
};

// Function to clear wallet data from storage
export const clearWalletData = () => {
    try {
        localStorage.removeItem(STORAGE_KEYS.WALLET_DATA);
        localStorage.removeItem(STORAGE_KEYS.PASSWORD_HASH);
        clearSession(); // Also clear session when wallet data is cleared
        console.log('Wallet data cleared successfully');
        return true;
    } catch (error) {
        console.error('Error clearing wallet data:', error);
        return false;
    }
};