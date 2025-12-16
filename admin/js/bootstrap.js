/**
 * Bootstrap Page - First-Time Admin Setup
 */

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// DOM elements
const bootstrapFormContainer = document.getElementById('bootstrap-form-container');
const bootstrapCompleteContainer = document.getElementById('bootstrap-complete-container');
const bootstrapInvalidContainer = document.getElementById('bootstrap-invalid-container');
const bootstrapForm = document.getElementById('bootstrap-form');
const bootstrapError = document.getElementById('bootstrap-error');
const bootstrapSuccess = document.getElementById('bootstrap-success');
const submitBtn = document.getElementById('submit-btn');
const tokenInput = document.getElementById('token');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('password-confirm');
const passwordStrength = document.getElementById('password-strength');
const passwordStrengthBar = document.getElementById('password-strength-bar');
const passwordStrengthText = document.getElementById('password-strength-text');
const invalidMessage = document.getElementById('invalid-message');

// Check if token exists and populate field
if (!token) {
    showInvalid('No bootstrap token provided in URL');
} else {
    tokenInput.value = token;
}

// Password strength checker
function checkPasswordStrength(password) {
    if (!password) return { score: 0, text: '', color: '' };

    const length = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const criteria = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

    let score = 0;
    if (length >= 8) score++;
    if (length >= 12) score++;
    if (criteria >= 3) score++;
    if (criteria === 4) score++;

    const levels = [
        { min: 0, max: 1, text: 'Weak', color: 'bg-red-500', width: '25%' },
        { min: 2, max: 2, text: 'Fair', color: 'bg-yellow-500', width: '50%' },
        { min: 3, max: 3, text: 'Good', color: 'bg-blue-500', width: '75%' },
        { min: 4, max: 4, text: 'Strong', color: 'bg-green-500', width: '100%' }
    ];

    const level = levels.find(l => score >= l.min && score <= l.max) || levels[0];
    return { score, ...level };
}

passwordInput.addEventListener('input', (e) => {
    const strength = checkPasswordStrength(e.target.value);
    if (e.target.value.length > 0) {
        passwordStrength.classList.remove('hidden');
        passwordStrengthBar.className = `h-full transition-all duration-300 ${strength.color}`;
        passwordStrengthBar.style.width = strength.width;
        passwordStrengthText.textContent = strength.text;
        passwordStrengthText.className = `text-xs font-medium ${strength.color.replace('bg-', 'text-')}`;
    } else {
        passwordStrength.classList.add('hidden');
    }
});

// Hash password client-side (same as login)
async function hashPassword(username, password) {
    // Get password salt from server
    const configResponse = await fetch('/api/config');
    const config = await configResponse.json();
    const salt = config.passwordSalt;

    const message = username + ':' + password + ':' + salt;
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Form submission
bootstrapForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;

    // Hide previous messages
    bootstrapError.classList.add('hidden');
    bootstrapSuccess.classList.add('hidden');

    // Validate passwords match
    if (password !== passwordConfirm) {
        showError('Passwords do not match');
        return;
    }

    // Validate password strength
    const strength = checkPasswordStrength(password);
    if (strength.score < 2) {
        showError('Password is too weak. Please choose a stronger password.');
        return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
        // Hash password client-side before sending
        const hashedPassword = await hashPassword(username, password);

        const response = await fetch('/admin/api/bootstrap/setup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token, username, hashedPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401 && data.error === 'TOKEN_EXPIRED') {
                showInvalid('This bootstrap link has expired');
            } else if (response.status === 401 && data.error === 'TOKEN_USED') {
                showInvalid('This bootstrap link has already been used');
            } else if (response.status === 403) {
                showInvalid('Bootstrap is not available. Active admin users already exist.');
            } else {
                showError(data.message || 'Failed to create admin account');
            }
            return;
        }

        // Success!
        showComplete();
    } catch (error) {
        showError('Network error. Please check your connection and try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Admin Account';
    }
});

function showError(message) {
    bootstrapError.textContent = message;
    bootstrapError.classList.remove('hidden');
}

function showComplete() {
    bootstrapFormContainer.classList.add('hidden');
    bootstrapCompleteContainer.classList.remove('hidden');
}

function showInvalid(message) {
    invalidMessage.textContent = message;
    bootstrapFormContainer.classList.add('hidden');
    bootstrapInvalidContainer.classList.remove('hidden');
}
