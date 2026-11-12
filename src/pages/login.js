// ── Nexora CRM — Authentication & Registration Interface ──────────
import { Icons } from '../icons.js';
import { api } from '../api.js';
import { showToast } from '../toast.js';

const LOGO_SVG = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M6 6L6 26L10 26L10 17L22 26L26 26L26 6L22 6L22 15L10 6Z" fill="white"/>
</svg>`;

export function renderLogin(container, onLoginSuccess) {
  let activeTab = 'login'; // 'login' | 'register' | 'forgot' | 'reset' | 'accept-invitation' | 'verify'

  // Detect URL actions
  const hash = location.hash || '';
  const searchPart = hash.includes('?') ? hash.split('?')[1] : location.search.replace('?', '');
  const urlParams = new URLSearchParams(searchPart);
  const initialToken = urlParams.get('token') || '';

  if (hash.startsWith('#reset-password')) activeTab = 'reset';
  else if (hash.startsWith('#accept-invitation')) activeTab = 'accept-invitation';
  else if (hash.startsWith('#verify-email')) activeTab = 'verify';

  function updateView() {
    const showTabs = ['login', 'register'].includes(activeTab);

    container.innerHTML = `
      <div class="login-page">
        <!-- Hero Side -->
        <div class="login-hero">
          <div class="login-hero__content">
            <div class="login-hero__logo">
              <div class="login-hero__logo-mark">${LOGO_SVG}</div>
              <span class="login-hero__logo-text">Nexora CRM</span>
            </div>

            <h2 class="login-hero__tagline">
              Enterprise-grade<br/>
              <span>Intelligence & Security</span><br/>
              for Modern Teams
            </h2>

            <p class="login-hero__desc">
              Next-generation customer relationship management platform featuring multi-tenant architecture, role-based authorization, and secure JWT session management.
            </p>

            <div class="login-hero__stats">
              <div class="login-hero__stat">
                <div class="login-hero__stat-value">100%</div>
                <div class="login-hero__stat-label">HTTP-Only Cookie Auth</div>
              </div>
              <div class="login-hero__stat">
                <div class="login-hero__stat-value">5 Roles</div>
                <div class="login-hero__stat-label">Granular RBAC</div>
              </div>
              <div class="login-hero__stat">
                <div class="login-hero__stat-value">Bcrypt</div>
                <div class="login-hero__stat-label">Salt Hashing</div>
              </div>
            </div>

            <div class="login-security-badges">
              <span class="sec-badge">🔒 AES-256 JWT</span>
              <span class="sec-badge">🛡️ HTTP-Only Cookies</span>
              <span class="sec-badge">🏢 Multi-Tenant Workspaces</span>
            </div>
          </div>
        </div>

        <!-- Form Side -->
        <div class="login-form-panel">
          <div class="login-form-card">
            ${showTabs ? `
              <!-- Auth Mode Switcher Tabs -->
              <div class="auth-tabs" role="tablist">
                <button
                  type="button"
                  class="auth-tab ${activeTab === 'login' ? 'active' : ''}"
                  id="tab-btn-login"
                  role="tab"
                  aria-selected="${activeTab === 'login'}"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  class="auth-tab ${activeTab === 'register' ? 'active' : ''}"
                  id="tab-btn-register"
                  role="tab"
                  aria-selected="${activeTab === 'register'}"
                >
                  Create Workspace
                </button>
              </div>
            ` : `
              <div style="margin-bottom: 20px;">
                <a href="#" id="back-to-login" class="form-link" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;">
                  ← Back to Sign In
                </a>
              </div>
            `}

            ${
              activeTab === 'login' ? renderLoginFormHTML() :
              activeTab === 'register' ? renderRegisterFormHTML() :
              activeTab === 'forgot' ? renderForgotPasswordHTML() :
              activeTab === 'reset' ? renderResetPasswordHTML(initialToken) :
              activeTab === 'accept-invitation' ? renderAcceptInvitationHTML(initialToken) :
              renderVerifyEmailHTML(initialToken)
            }

            ${showTabs ? `
              <!-- Demo Role Fast Switcher Section -->
              <div class="demo-accounts-box">
                <div class="demo-accounts-title">
                  <span>⚡ Quick Test Roles (Click to Auto-Fill & Test RBAC)</span>
                </div>
                <div class="demo-roles-grid">
                  <button type="button" class="demo-role-btn" data-email="admin@nexora.io" data-pass="nexora123" title="Full workspace privileges (*)">
                    <span class="role-badge role-badge--owner">Owner</span>
                    <span class="demo-role-name">Alexandra Reid</span>
                  </button>
                  <button type="button" class="demo-role-btn" data-email="marcus@nexora.io" data-pass="nexora123" title="Pipeline & team oversight">
                    <span class="role-badge role-badge--manager">Manager</span>
                    <span class="demo-role-name">Marcus Chen</span>
                  </button>
                  <button type="button" class="demo-role-btn" data-email="priya@nexora.io" data-pass="nexora123" title="Deals & contacts permissions">
                    <span class="role-badge role-badge--rep">Sales Rep</span>
                    <span class="demo-role-name">Priya Sharma</span>
                  </button>
                  <button type="button" class="demo-role-btn demo-role-btn--inactive" data-email="jordan@nexora.io" data-pass="nexora123" title="Inactive account - tests 403 suspension">
                    <span class="role-badge role-badge--suspended">Inactive</span>
                    <span class="demo-role-name">Jordan Williams (403)</span>
                  </button>
                </div>
              </div>

              <p class="login-form-card__footer">
                ${activeTab === 'login'
                  ? `Don't have a workspace? <a href="#" id="switch-to-register" class="form-link">Register new company →</a>`
                  : `Already registered? <a href="#" id="switch-to-login" class="form-link">Sign in to existing account →</a>`
                }
              </p>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderLoginFormHTML() {
    return `
      <div class="login-form-card__header">
        <h1 class="login-form-card__title">Sign In</h1>
        <p class="login-form-card__subtitle">Enter your work credentials to access your CRM workspace</p>
      </div>

      <form id="login-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="login-email">Work Email</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.mail}</span>
            <input
              class="form-input"
              type="email"
              id="login-email"
              name="email"
              placeholder="admin@nexora.io"
              autocomplete="email"
              value="admin@nexora.io"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="login-password">Password</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.lock}</span>
            <input
              class="form-input"
              type="password"
              id="login-password"
              name="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              value="nexora123"
              required
            />
          </div>
        </div>

        <div class="form-options">
          <label class="form-checkbox-label">
            <input type="checkbox" id="remember-me" checked />
            Remember me on this device
          </label>
          <a href="#" class="form-link" id="forgot-password-link">Forgot password?</a>
        </div>

        <button type="submit" class="login-btn" id="login-submit">
          <span id="login-btn-text">Sign In to Nexora</span>
        </button>
      </form>
    `;
  }

  function renderRegisterFormHTML() {
    return `
      <div class="login-form-card__header">
        <h1 class="login-form-card__title">Create Workspace</h1>
        <p class="login-form-card__subtitle">Provision a new multi-tenant organization & owner account</p>
      </div>

      <form id="register-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="reg-org-name">Workspace / Organization Name</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.building}</span>
            <input
              class="form-input"
              type="text"
              id="reg-org-name"
              name="organizationName"
              placeholder="e.g. Apex Dynamics Corp"
              value="Acme Global Technologies"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-name">Your Full Name</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.user}</span>
            <input
              class="form-input"
              type="text"
              id="reg-name"
              name="name"
              placeholder="e.g. Jonathan Archer"
              value="Elena Rostova"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-email">Work Email</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.mail}</span>
            <input
              class="form-input"
              type="email"
              id="reg-email"
              name="email"
              placeholder="elena@acme-global.com"
              value="elena@acme-global.com"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="reg-password">Password (min 8 chars)</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.lock}</span>
            <input
              class="form-input"
              type="password"
              id="reg-password"
              name="password"
              placeholder="Choose a strong password"
              value="NexoraSecure2026!"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Subscription Tier</label>
          <div class="plan-selector">
            <label class="plan-option active">
              <input type="radio" name="plan" value="enterprise" checked />
              <div class="plan-title">Enterprise</div>
              <div class="plan-sub">Full RBAC & 100 Seats</div>
            </label>
            <label class="plan-option">
              <input type="radio" name="plan" value="growth" />
              <div class="plan-title">Growth</div>
              <div class="plan-sub">50 Seats</div>
            </label>
          </div>
        </div>

        <button type="submit" class="login-btn" id="reg-submit">
          <span id="reg-btn-text">Create Organization & Owner Account</span>
        </button>
      </form>
    `;
  }

  function renderForgotPasswordHTML() {
    return `
      <div class="login-form-card__header">
        <h1 class="login-form-card__title">Reset Password</h1>
        <p class="login-form-card__subtitle">Enter your work email address to receive password recovery instructions</p>
      </div>

      <form id="forgot-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="forgot-email">Work Email</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.mail}</span>
            <input
              class="form-input"
              type="email"
              id="forgot-email"
              placeholder="you@nexora.io"
              required
            />
          </div>
        </div>

        <button type="submit" class="login-btn" id="forgot-submit">
          <span id="forgot-btn-text">Send Recovery Instructions</span>
        </button>

        <div id="forgot-result-box" style="display:none;margin-top:16px;padding:12px;border-radius:8px;background:var(--bg-card);border:1px solid var(--border-color);font-size:13px;line-height:1.5;"></div>
      </form>
    `;
  }

  function renderResetPasswordHTML(token) {
    return `
      <div class="login-form-card__header">
        <h1 class="login-form-card__title">Set New Password</h1>
        <p class="login-form-card__subtitle">Choose a new secure password for your Nexora account</p>
      </div>

      <form id="reset-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="reset-token">Reset Token</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.lock}</span>
            <input
              class="form-input"
              type="text"
              id="reset-token"
              value="${token || ''}"
              placeholder="Paste your reset token"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="reset-pass">New Password (min 8 characters)</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.lock}</span>
            <input
              class="form-input"
              type="password"
              id="reset-pass"
              placeholder="Enter new password"
              required
            />
          </div>
        </div>

        <button type="submit" class="login-btn" id="reset-submit">
          <span id="reset-btn-text">Update Password</span>
        </button>
      </form>
    `;
  }

  function renderAcceptInvitationHTML(token) {
    return `
      <div class="login-form-card__header">
        <h1 class="login-form-card__title">Accept Team Invitation</h1>
        <p class="login-form-card__subtitle">You have been invited to join Nexora CRM. Set your password to activate your account.</p>
      </div>

      <form id="invitation-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="invite-token">Invitation Token</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.lock}</span>
            <input
              class="form-input"
              type="text"
              id="invite-token"
              value="${token || ''}"
              placeholder="Paste invitation token"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="invite-name">Your Full Name (Optional)</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.user}</span>
            <input
              class="form-input"
              type="text"
              id="invite-name"
              placeholder="Your full name"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="invite-pass">Create Account Password</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.lock}</span>
            <input
              class="form-input"
              type="password"
              id="invite-pass"
              placeholder="Create strong password (min 8 chars)"
              required
            />
          </div>
        </div>

        <button type="submit" class="login-btn" id="invite-submit">
          <span id="invite-btn-text">Activate Account & Enter CRM</span>
        </button>
      </form>
    `;
  }

  function renderVerifyEmailHTML(token) {
    return `
      <div class="login-form-card__header">
        <h1 class="login-form-card__title">Verify Email Address</h1>
        <p class="login-form-card__subtitle">Confirm your email address to enable all security features</p>
      </div>

      <form id="verify-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="verify-token">Verification Token</label>
          <div class="form-input-wrap">
            <span class="form-input-icon">${Icons.check}</span>
            <input
              class="form-input"
              type="text"
              id="verify-token"
              value="${token || ''}"
              placeholder="Verification token"
              required
            />
          </div>
        </div>

        <button type="submit" class="login-btn" id="verify-submit">
          <span id="verify-btn-text">Confirm Email Verification</span>
        </button>
      </form>
    `;
  }

  function bindEvents() {
    // Tab buttons
    container.querySelector('#tab-btn-login')?.addEventListener('click', () => {
      activeTab = 'login';
      updateView();
    });

    container.querySelector('#tab-btn-register')?.addEventListener('click', () => {
      activeTab = 'register';
      updateView();
    });

    container.querySelector('#switch-to-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      activeTab = 'register';
      updateView();
    });

    container.querySelector('#switch-to-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      activeTab = 'login';
      updateView();
    });

    container.querySelector('#back-to-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      activeTab = 'login';
      updateView();
    });

    container.querySelector('#forgot-password-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      activeTab = 'forgot';
      updateView();
    });

    // Forgot Password Form Submit
    const forgotForm = container.querySelector('#forgot-form');
    if (forgotForm) {
      forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = forgotForm.querySelector('#forgot-email').value.trim();
        const btn = forgotForm.querySelector('#forgot-submit');
        const btnText = forgotForm.querySelector('#forgot-btn-text');
        const resultBox = forgotForm.querySelector('#forgot-result-box');

        if (!email) {
          showToast('error', 'Email Required', 'Please enter your work email.');
          return;
        }

        btn.classList.add('loading');
        btnText.textContent = 'Generating Token…';

        try {
          const res = await api.auth.forgotPassword(email);
          btn.classList.remove('loading');
          btnText.textContent = 'Instructions Sent';

          if (resultBox) {
            resultBox.style.display = 'block';
            resultBox.innerHTML = `
              <div style="color:var(--accent-color);font-weight:600;margin-bottom:6px;">✓ Recovery Token Generated</div>
              <p style="margin:0 0 8px 0;color:var(--text-secondary);font-size:12px;">${res.message}</p>
              ${res.resetToken ? `
                <div style="margin-top:6px;padding:8px;background:var(--bg-secondary);border-radius:6px;word-break:break-all;font-family:monospace;font-size:11px;">
                  <strong>Reset Link:</strong> <a href="#reset-password?token=${res.resetToken}" id="direct-reset-link" style="color:var(--accent-color);text-decoration:underline;">Click to Reset Password</a>
                </div>
              ` : ''}
            `;
            resultBox.querySelector('#direct-reset-link')?.addEventListener('click', (ev) => {
              ev.preventDefault();
              activeTab = 'reset';
              updateView();
            });
          }
          showToast('success', 'Recovery Sent', 'Check the simulated token link below to set a new password.');
        } catch (err) {
          btn.classList.remove('loading');
          btnText.textContent = 'Send Recovery Instructions';
          showToast('error', 'Request Failed', err.message);
        }
      });
    }

    // Reset Password Form Submit
    const resetForm = container.querySelector('#reset-form');
    if (resetForm) {
      resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = resetForm.querySelector('#reset-token').value.trim();
        const newPassword = resetForm.querySelector('#reset-pass').value;

        if (!token || !newPassword) {
          showToast('error', 'Missing Information', 'Please provide token and new password.');
          return;
        }

        if (newPassword.length < 8) {
          showToast('error', 'Password Too Short', 'Password must be at least 8 characters long.');
          return;
        }

        const btn = resetForm.querySelector('#reset-submit');
        const btnText = resetForm.querySelector('#reset-btn-text');
        btn.classList.add('loading');
        btnText.textContent = 'Updating Password…';

        try {
          await api.auth.resetPassword(token, newPassword);
          showToast('success', 'Password Updated!', 'You can now sign in with your new credentials.');
          await new Promise(r => setTimeout(r, 600));
          activeTab = 'login';
          updateView();
        } catch (err) {
          btn.classList.remove('loading');
          btnText.textContent = 'Update Password';
          showToast('error', 'Reset Failed', err.message);
        }
      });
    }

    // Accept Invitation Form Submit
    const inviteForm = container.querySelector('#invitation-form');
    if (inviteForm) {
      inviteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = inviteForm.querySelector('#invite-token').value.trim();
        const name = inviteForm.querySelector('#invite-name').value.trim();
        const password = inviteForm.querySelector('#invite-pass').value;

        if (!token || !password) {
          showToast('error', 'Missing Information', 'Token and password are required.');
          return;
        }

        const btn = inviteForm.querySelector('#invite-submit');
        const btnText = inviteForm.querySelector('#invite-btn-text');
        btn.classList.add('loading');
        btnText.textContent = 'Activating Account…';

        try {
          const res = await api.auth.acceptInvitation({ token, password, name });
          showToast('success', 'Invitation Accepted!', `Welcome to Nexora CRM, ${res.user?.name}!`);
          await new Promise(r => setTimeout(r, 500));
          onLoginSuccess(res.user);
        } catch (err) {
          btn.classList.remove('loading');
          btnText.textContent = 'Activate Account & Enter CRM';
          showToast('error', 'Activation Failed', err.message);
        }
      });
    }

    // Verify Email Form Submit
    const verifyForm = container.querySelector('#verify-form');
    if (verifyForm) {
      verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = verifyForm.querySelector('#verify-token').value.trim();
        if (!token) {
          showToast('error', 'Token Required', 'Please enter verification token.');
          return;
        }

        const btn = verifyForm.querySelector('#verify-submit');
        const btnText = verifyForm.querySelector('#verify-btn-text');
        btn.classList.add('loading');
        btnText.textContent = 'Verifying…';

        try {
          await api.auth.verifyEmail(token);
          showToast('success', 'Email Verified!', 'Your account is verified. You can now sign in.');
          await new Promise(r => setTimeout(r, 600));
          activeTab = 'login';
          updateView();
        } catch (err) {
          btn.classList.remove('loading');
          btnText.textContent = 'Confirm Email Verification';
          showToast('error', 'Verification Failed', err.message);
        }
      });
    }

    // Demo role fast switcher buttons
    container.querySelectorAll('.demo-role-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const email = btn.dataset.email;
        const pass = btn.dataset.pass;
        if (activeTab !== 'login') {
          activeTab = 'login';
          updateView();
        }
        const emailInput = container.querySelector('#login-email');
        const passInput = container.querySelector('#login-password');
        if (emailInput && passInput) {
          emailInput.value = email;
          passInput.value = pass;
          await doLogin(email, pass, true);
        }
      });
    });

    // Login Form Submit
    const loginForm = container.querySelector('#login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('#login-email').value.trim();
        const password = loginForm.querySelector('#login-password').value;
        const remember = loginForm.querySelector('#remember-me')?.checked ?? true;
        await doLogin(email, password, remember);
      });
    }

    // Register Form Submit
    const regForm = container.querySelector('#register-form');
    if (regForm) {
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const organizationName = regForm.querySelector('#reg-org-name').value.trim();
        const name = regForm.querySelector('#reg-name').value.trim();
        const email = regForm.querySelector('#reg-email').value.trim();
        const password = regForm.querySelector('#reg-password').value;
        const plan = regForm.querySelector('input[name="plan"]:checked')?.value || 'enterprise';

        if (!organizationName || !name || !email || !password) {
          showToast('error', 'Missing Information', 'Please fill in all required registration fields.');
          return;
        }

        if (password.length < 8) {
          showToast('error', 'Password Too Short', 'Password must be at least 8 characters long.');
          return;
        }

        const submitBtn = container.querySelector('#reg-submit');
        const btnText = container.querySelector('#reg-btn-text');
        submitBtn.classList.add('loading');
        btnText.textContent = 'Provisioning Workspace…';

        try {
          const result = await api.auth.register({
            name,
            email,
            password,
            organizationName,
            plan,
          });

          showToast('success', 'Workspace Created!', `Welcome to ${result.organization?.name || organizationName}!`);
          await new Promise(r => setTimeout(r, 600));
          onLoginSuccess(result.user);
        } catch (err) {
          showToast('error', 'Registration Failed', err.message || 'Could not complete registration');
          submitBtn.classList.remove('loading');
          btnText.textContent = 'Create Organization & Owner Account';
        }
      });
    }
  }

  async function doLogin(email, password, remember) {
    const submitBtn = container.querySelector('#login-submit');
    const btnText = container.querySelector('#login-btn-text');
    if (submitBtn) submitBtn.classList.add('loading');
    if (btnText) btnText.textContent = 'Authenticating…';

    try {
      const data = await api.auth.login(email, password, remember);
      showToast('success', 'Authenticated', `Welcome back, ${data.user?.name || email}! Role: ${data.user?.roleTitle || data.user?.role}`);
      await new Promise(r => setTimeout(r, 450));
      onLoginSuccess(data.user);
    } catch (err) {
      showToast('error', 'Sign-in Failed', err.message || 'Invalid credentials');
      if (submitBtn) submitBtn.classList.remove('loading');
      if (btnText) btnText.textContent = 'Sign In to Nexora';
    }
  }

  updateView();
}
