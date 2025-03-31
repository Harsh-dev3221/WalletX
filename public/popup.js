// Initialize popup
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Cross-Net Wallet popup opened');

    // Check if we have a pending connection request
    try {
        const pendingRequestId = await new Promise(resolve => {
            chrome.storage.local.get('currentPendingRequest', (result) => {
                resolve(result.currentPendingRequest || null);
            });
        });

        if (pendingRequestId) {
            console.log('Found pending request:', pendingRequestId);
            await showConnectionRequest(pendingRequestId);
        } else {
            // No pending request, show normal wallet UI
            await initializeWallet();
        }
    } catch (error) {
        console.error('Error checking for pending requests:', error);
        showError('Failed to check for pending requests');
    }
});

// Function to display a connection request
async function showConnectionRequest(requestId) {
    try {
        // Get the state from background
        const state = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
                resolve(response.state || {});
            });
        });

        // Get the request details
        const request = state.pendingRequests?.[requestId];

        if (!request) {
            console.error('Request not found:', requestId);
            showError('Request not found or expired');
            return;
        }

        console.log('Displaying connection request:', request);

        // Clear main content
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = '';

            // Create connection request UI
            const requestDiv = document.createElement('div');
            requestDiv.className = 'connection-request';

            const siteIcon = document.createElement('img');
            siteIcon.className = 'site-icon';
            siteIcon.src = `https://www.google.com/s2/favicons?domain=${request.origin}&sz=64`;
            siteIcon.onerror = () => {
                siteIcon.src = 'assets/default-site-icon.png'; // Fallback icon
            };

            const siteOrigin = document.createElement('h2');
            siteOrigin.textContent = request.origin;

            const requestMessage = document.createElement('p');
            requestMessage.textContent = 'This site is requesting to connect to your wallet';

            const accountsSection = document.createElement('div');
            accountsSection.className = 'accounts-section';

            const accountsTitle = document.createElement('h3');
            accountsTitle.textContent = 'Select accounts to connect:';
            accountsSection.appendChild(accountsTitle);

            // Display available accounts with checkboxes
            const accounts = request.availableAccounts || state.accounts || [];
            if (accounts.length > 0) {
                accounts.forEach((account, index) => {
                    const accountItem = document.createElement('div');
                    accountItem.className = 'account-item';

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `account-${index}`;
                    checkbox.value = account;
                    checkbox.checked = true; // Select by default

                    const label = document.createElement('label');
                    label.htmlFor = `account-${index}`;
                    label.textContent = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;

                    accountItem.appendChild(checkbox);
                    accountItem.appendChild(label);
                    accountsSection.appendChild(accountItem);
                });
            } else {
                const noAccounts = document.createElement('p');
                noAccounts.textContent = 'No accounts available';
                accountsSection.appendChild(noAccounts);
            }

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';

            const rejectButton = document.createElement('button');
            rejectButton.className = 'reject-button';
            rejectButton.textContent = 'Reject';
            rejectButton.onclick = () => rejectConnection(requestId);

            const approveButton = document.createElement('button');
            approveButton.className = 'approve-button';
            approveButton.textContent = 'Connect';
            approveButton.onclick = () => approveConnection(requestId);

            buttonContainer.appendChild(rejectButton);
            buttonContainer.appendChild(approveButton);

            // Assemble the request UI
            requestDiv.appendChild(siteIcon);
            requestDiv.appendChild(siteOrigin);
            requestDiv.appendChild(requestMessage);
            requestDiv.appendChild(accountsSection);
            requestDiv.appendChild(buttonContainer);

            mainContent.appendChild(requestDiv);
        }
    } catch (error) {
        console.error('Error displaying connection request:', error);
        showError('Failed to display connection request');
    }
}

// Function to approve a connection request
async function approveConnection(requestId) {
    try {
        // Get selected accounts
        const selectedAccounts = [];
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            selectedAccounts.push(checkbox.value);
        });

        console.log('Approving connection with accounts:', selectedAccounts);

        // Send approval to background
        await new Promise(resolve => {
            chrome.runtime.sendMessage({
                action: 'approveConnection',
                requestId,
                accounts: selectedAccounts
            }, (response) => {
                if (response && response.success) {
                    console.log('Connection approved successfully');
                } else {
                    console.error('Failed to approve connection:', response?.error);
                }
                resolve();
            });
        });

        // Show success message
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = '';

            const successDiv = document.createElement('div');
            successDiv.className = 'success-message';

            const successIcon = document.createElement('div');
            successIcon.className = 'success-icon';
            successIcon.innerHTML = '✓';

            const successText = document.createElement('p');
            successText.textContent = 'Connection approved!';

            successDiv.appendChild(successIcon);
            successDiv.appendChild(successText);
            mainContent.appendChild(successDiv);

            // Show normal wallet UI after a short delay
            setTimeout(initializeWallet, 1500);
        }
    } catch (error) {
        console.error('Error approving connection:', error);
        showError('Failed to approve connection');
    }
}

// Function to reject a connection request
async function rejectConnection(requestId) {
    try {
        console.log('Rejecting connection request:', requestId);

        // Send rejection to background
        await new Promise(resolve => {
            chrome.runtime.sendMessage({
                action: 'rejectConnection',
                requestId
            }, (response) => {
                if (response && response.success) {
                    console.log('Connection rejected successfully');
                } else {
                    console.error('Failed to reject connection:', response?.error);
                }
                resolve();
            });
        });

        // Show rejection message
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = '';

            const rejectionDiv = document.createElement('div');
            rejectionDiv.className = 'rejection-message';

            const rejectionIcon = document.createElement('div');
            rejectionIcon.className = 'rejection-icon';
            rejectionIcon.innerHTML = '✗';

            const rejectionText = document.createElement('p');
            rejectionText.textContent = 'Connection rejected';

            rejectionDiv.appendChild(rejectionIcon);
            rejectionDiv.appendChild(rejectionText);
            mainContent.appendChild(rejectionDiv);

            // Show normal wallet UI after a short delay
            setTimeout(initializeWallet, 1500);
        }
    } catch (error) {
        console.error('Error rejecting connection:', error);
        showError('Failed to reject connection');
    }
}

// Initialize the wallet display
async function initializeWallet() {
    try {
        // Get the state from background
        const state = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
                resolve(response.state || {});
            });
        });

        // Update UI with wallet info
        updateWalletUI(state);
    } catch (error) {
        console.error('Error initializing wallet:', error);
        showError('Failed to initialize wallet');
    }
}

// Update the wallet UI with current state
function updateWalletUI(state) {
    console.log('Updating wallet UI with state:', state);
    // Implement your existing wallet UI logic here
}

// Display an error message
function showError(message) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        mainContent.innerHTML = '';
        mainContent.appendChild(errorDiv);
    }
} 