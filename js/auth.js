import { supabase } from './config.js';

// ==========================================================================
// DOM Elements
// ==========================================================================
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const toastContainer = document.getElementById('toast-container');

// ==========================================================================
// Session Management (Check if already logged in)
// ==========================================================================
// Only redirect on an explicit SIGNED_IN event — never on a raw session check.
// This prevents the loop caused by onAuthStateChange firing on page load
// when a session already exists in localStorage.
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        window.location.replace('dashboard.html');
    }
});

// ==========================================================================
// UI Interactions: Toggle Forms
// ==========================================================================
showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active-form');
    loginForm.classList.add('hidden-form');
    registerForm.classList.remove('hidden-form');
    registerForm.classList.add('active-form');
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active-form');
    registerForm.classList.add('hidden-form');
    loginForm.classList.remove('hidden-form');
    loginForm.classList.add('active-form');
});

// ==========================================================================
// Notification System (Toast)
// ==========================================================================
export function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon based on type
    let icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'warning') icon = '⚠';

    toast.innerHTML = `<strong>${icon}</strong> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.add('closing');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

// Button State Helper
function setButtonLoading(button, isLoading) {
    const text = button.querySelector('.btn-text');
    const loader = button.querySelector('.loader');

    if (isLoading) {
        button.disabled = true;
        text.style.display = 'none';
        loader.classList.remove('hidden');
    } else {
        button.disabled = false;
        text.style.display = 'block';
        loader.classList.add('hidden');
    }
}

// ==========================================================================
// Authentication Handling: Registration
// ==========================================================================
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;

    if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
    }

    setButtonLoading(registerBtn, true);

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    setButtonLoading(registerBtn, false);

    if (error) {
        showToast(error.message, 'error');
    } else {
        showToast('Clearance initialized. You can now authenticate.', 'success');
        // Switch back to login form automatically
        showLoginBtn.click();
        registerForm.reset();
    }
});

// ==========================================================================
// Authentication Handling: Login
// ==========================================================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    setButtonLoading(loginBtn, true);

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    setButtonLoading(loginBtn, false);

    if (error) {
        showToast('Authentication failed: ' + error.message, 'error');
    } else {
        // Do NOT manually redirect here. The onAuthStateChange listener above
        // will fire with event === 'SIGNED_IN' and handle the redirect cleanly.
        showToast('Clearance granted. Redirecting...', 'success');
    }
});