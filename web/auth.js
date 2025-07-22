document.addEventListener('DOMContentLoaded', function() {
    // --- SIGNUP PAGE LOGIC ---
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent the form from reloading the page
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const messageEl = document.getElementById('message');
            
            // Call the Python function 'handle_signup'
            let response = await eel.handle_signup(name, email, password)();
            
            messageEl.textContent = response.message;
            if (response.status === 'success') {
                messageEl.className = 'success';
                // Wait 2 seconds and then redirect to the login page
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            } else {
                messageEl.className = 'error';
            }
        });
    }

    // --- LOGIN PAGE LOGIC ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent the form from reloading the page
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('error-message');

            // Call the Python function 'handle_login'
            let response = await eel.handle_login(email, password)();

            if (response.status === 'success') {
                // Login successful! Redirect to the main Jarvis UI.
                localStorage.setItem('jarvis_user', response.name); // Store user's name
                window.location.href = 'main_app.html'; 
            } else {
                errorEl.textContent = response.message;
                errorEl.style.display = 'block'; // Show the error message
            }
        });
    }
});

// --- GOOGLE SIGN IN LOGIC (This is the callback function from login.html) ---

// Helper function to decode the JWT token from Google
function jwt_decode(token) {
    try {
        let base64Url = token.split('.')[1];
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        let jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error decoding JWT', e);
        return null;
    }
}

// This function is called automatically by Google after a successful sign-in
async function onGoogleSignIn(googleUser) {
    const profile = jwt_decode(googleUser.credential);
    if (!profile) {
        document.getElementById('error-message').textContent = 'Could not decode Google user profile.';
        return;
    }

    const userData = {
        id: profile.sub, // 'sub' is the unique Google ID
        name: profile.name,
        email: profile.email
    };

    // Call the Python function 'handle_google_login'
    let response = await eel.handle_google_login(userData)();
    
    if (response.status === 'success') {
        // Google login successful! Redirect to the main Jarvis UI.
        localStorage.setItem('jarvis_user', response.name); // Store user's name
        window.location.href = 'main_app.html';
    } else {
        const errorEl = document.getElementById('error-message');
        errorEl.textContent = 'Google login failed: ' + response.message;
        errorEl.style.display = 'block'; // Show the error message
    }
}