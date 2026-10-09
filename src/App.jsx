import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const queueApiUrl = (path) => {
  if (!API_BASE_URL) {
    throw new Error("Set VITE_API_BASE_URL in your local .env file.");
  }

  return `${API_BASE_URL}${path}`;
};
const SERVICES = ["Office", "Library", "Lab", "Administration", "Canteen"];
const PENDING_EMAIL_KEY = "smartqueue.pendingVerificationEmail";
const VERIFIED_EMAIL_KEY = "smartqueue.verifiedEmail";

const appStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f8fafc; color: #0f172a; }
  a { color: inherit; text-decoration: none; }
  button, input, select { font: inherit; }
  .smartqueue-app { min-height: 100vh; background: linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%); color: #0f172a; }
  .topbar { position: sticky; top: 0; z-index: 10; background: rgba(255,255,255,0.9); backdrop-filter: blur(12px); border-bottom: 1px solid #e2e8f0; }
  .topbar-inner { max-width: 1200px; margin: 0 auto; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; color: #0f172a; }
  .brand-mark { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff; font-size: 18px; box-shadow: 0 10px 25px rgba(37,99,235,0.25); }
  .nav { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .nav-btn { border: 1px solid #dbeafe; background: #f8fbff; color: #1e293b; padding: 10px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
  .nav-btn:hover, .nav-btn:focus-visible { border-color: #93c5fd; outline: none; }
  .nav-btn.active { background: #2563eb; color: white; border-color: #2563eb; box-shadow: 0 8px 18px rgba(37,99,235,0.2); }
  .user-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #dbeafe; border-radius: 10px; background: #f8fbff; color: #1e293b; font-size: 0.9rem; }
  .container { max-width: 1200px; margin: 0 auto; padding: 32px 24px 56px; }
  .panel { background: rgba(255,255,255,0.88); border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 16px 40px rgba(15,23,42,0.06); }
  .student-wrapper { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 28px; align-items: stretch; }
  .hero-card { padding: 28px; display: flex; flex-direction: column; justify-content: center; min-height: 420px; }
  .eyebrow { display: inline-flex; align-items: center; width: fit-content; padding: 8px 12px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  h1, h2, h3, p { margin-top: 0; }
  .hero-title { margin: 18px 0 12px; font-size: clamp(2.1rem, 3vw, 3.2rem); line-height: 1.1; letter-spacing: -0.04em; }
  .hero-copy { color: #475569; font-size: 1.04rem; line-height: 1.7; max-width: 56ch; margin-bottom: 18px; }
  .mini-grid { display: grid; grid-template-columns: repeat(3, minmax(110px, 1fr)); gap: 14px; margin-top: 18px; }
  .mini-stat { background: #f8fbff; border: 1px solid #dbeafe; border-radius: 16px; padding: 14px 12px; }
  .mini-stat-label { display: block; color: #64748b; font-size: 12px; margin-bottom: 8px; }
  .mini-stat-value { font-weight: 700; font-size: 1.15rem; color: #0f172a; }
  .queue-card { padding: 28px; min-height: 420px; display: flex; flex-direction: column; justify-content: center; }
  .card-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 18px; }
  .card-title { font-size: 1.5rem; margin: 0; }
  .badge { display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; background: #e0f2fe; color: #0369a1; }
  .field { margin-bottom: 18px; }
  .field-label { display: block; font-size: 0.92rem; font-weight: 600; color: #334155; margin-bottom: 8px; }
  .text-input, .select-input { width: 100%; border: 1px solid #dbe3ef; border-radius: 12px; background: #ffffff; color: #0f172a; padding: 14px 15px; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
  .text-input:focus, .select-input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37,99,235,0.12); }
  .primary-btn, .secondary-btn { appearance: none; border: none; border-radius: 12px; cursor: pointer; padding: 14px 18px; font-weight: 700; transition: transform 0.15s ease, opacity 0.2s ease; }
  .primary-btn { width: 100%; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff; box-shadow: 0 14px 30px rgba(37,99,235,0.22); }
  .primary-btn:hover:not(:disabled), .secondary-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .primary-btn:disabled, .secondary-btn:disabled { opacity: 0.7; cursor: not-allowed; }
  .secondary-btn { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .error-box { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 12px; padding: 12px 14px; font-size: 0.94rem; margin-bottom: 18px; }
  .success-box { background: #ecfdf5; border: 1px solid #bbf7d0; color: #166534; border-radius: 12px; padding: 12px 14px; font-size: 0.94rem; margin-bottom: 18px; }
  .ticket-card { background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); border: 1px solid #dbeafe; border-radius: 18px; padding: 24px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.6); }
  .ticket-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 18px; }
  .success-pill { background: #dcfce7; color: #166534; border-radius: 999px; padding: 7px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .ticket-grid { display: grid; gap: 12px; margin-bottom: 18px; }
  .ticket-row { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
  .ticket-row:last-child { border-bottom: none; }
  .ticket-label { color: #64748b; font-size: 0.9rem; }
  .ticket-value { font-weight: 700; text-align: right; }
  .position-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 16px; margin: 18px 0; text-align: center; }
  .position-box strong { display: block; color: #1e3a8a; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px; }
  .position-box span { font-size: clamp(1.8rem, 2.4vw, 2.4rem); font-weight: 800; color: #0f172a; }
  .dashboard { display: grid; gap: 24px; }
  .dashboard-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
  .dashboard-header h2 { margin: 0; font-size: clamp(1.9rem, 2vw, 2.5rem); letter-spacing: -0.03em; }
  .dashboard-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .subheader { color: #64748b; font-size: 1rem; margin-top: 8px; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, minmax(140px, 1fr)); gap: 18px; }
  .stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 20px; box-shadow: 0 12px 25px rgba(15,23,42,0.04); }
  .stats-grid.staff-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 12px; }
  .staff-stat { position: relative; overflow: hidden; }
  .staff-stat::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 4px; background: #94a3b8; }
  .staff-stat.waiting::before { background: #f59e0b; }
  .staff-stat.completed::before { background: #16a34a; }
  .staff-stat.skipped::before { background: #64748b; }
  .staff-stat.serving::before { background: #2563eb; }
  .stat-label { color: #64748b; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px; }
  .stat-value { font-size: clamp(1.8rem, 2vw, 2.5rem); font-weight: 800; letter-spacing: -0.04em; color: #0f172a; }
  .staff-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .staff-action { width: auto; }
  .staff-action.call { background: #2563eb; color: #fff; }
  .staff-action.complete { background: #15803d; color: #fff; }
  .staff-action.skip { background: #fff7ed; color: #b45309; border: 1px solid #fed7aa; }
  .action-note { color: #64748b; font-size: 0.9rem; line-height: 1.5; }
  .serving-banner { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; color: #fff; background: linear-gradient(120deg, #1d4ed8, #2563eb 65%, #0f766e); border-radius: 16px; box-shadow: 0 12px 24px rgba(37,99,235,0.16); }
  .serving-banner-label { color: rgba(255,255,255,0.75); font-size: 0.78rem; font-weight: 700; text-transform: uppercase; }
  .serving-banner-name { margin: 4px 0 0; font-size: 1.25rem; font-weight: 750; }
  .serving-banner-ticket { color: rgba(255,255,255,0.8); font-size: 0.88rem; overflow-wrap: anywhere; text-align: right; }
  .queue-table-row-serving { background: #eff6ff; box-shadow: inset 3px 0 #2563eb; }
  .queue-table-row-serving:hover { background: #e5efff; }
  .status-serving { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
  .status-completed { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
  .status-skipped { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
  .table-panel { padding: 24px; }
  .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
  .toolbar-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .status-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 92px; padding: 7px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .status-waiting { background: #fff7ed; color: #b45309; border: 1px solid #fed7aa; }
  .status-other { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
  .table-wrap { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; }
  table { width: 100%; border-collapse: collapse; min-width: 720px; }
  th, td { padding: 14px 16px; border-bottom: 1px solid #edf2f7; text-align: left; vertical-align: middle; }
  th { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: #64748b; background: #f8fafc; }
  td { color: #334155; font-size: 0.96rem; }
  tbody tr:hover { background: #f8fbff; }
  .queue-empty { display: flex; align-items: center; justify-content: center; min-height: 200px; text-align: center; padding: 28px; color: #64748b; background: #f8fafc; border: 1px dashed #dbeafe; border-radius: 16px; }
  .queue-empty strong { display: block; color: #0f172a; margin-bottom: 8px; font-size: 1.1rem; }
  .auth-shell { display: grid; place-items: center; min-height: calc(100vh - 120px); padding: 24px; }
  .auth-card { width: min(100%, 480px); background: #fff; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 18px 44px rgba(15,23,42,0.08); padding: 32px; }
  .auth-top { text-align: center; margin-bottom: 24px; }
  .auth-brand { display: inline-flex; align-items: center; gap: 12px; justify-content: center; font-weight: 700; margin-bottom: 10px; }
  .auth-title { margin: 0; font-size: 2rem; letter-spacing: -0.04em; }
  .auth-subtitle { margin: 12px 0 0; color: #64748b; line-height: 1.6; }
  .auth-form { display: grid; gap: 16px; }
  .auth-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
  .link-btn { background: transparent; border: none; color: #2563eb; font-weight: 600; cursor: pointer; padding: 0; }
  .link-btn:hover, .link-btn:focus-visible { text-decoration: underline; outline: none; }
  .footer { max-width: 1200px; margin: 0 auto; padding: 0 24px 28px; text-align: center; color: #64748b; font-size: 0.9rem; }
  .auth-config-note { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; padding: 14px; color: #9a4d00; font-size: 0.92rem; line-height: 1.6; }
  .verification-email { padding: 12px 14px; border: 1px solid #dbeafe; border-radius: 12px; background: #f8fbff; color: #1e3a8a; font-weight: 650; overflow-wrap: anywhere; }
  .verification-code { text-align: center; font-size: 1.4rem; font-weight: 750; letter-spacing: 0.18em; }
  .loading-state { display: grid; place-items: center; min-height: 320px; color: #334155; font-weight: 600; }
  @media (max-width: 920px) { .student-wrapper { grid-template-columns: 1fr; } .stats-grid { grid-template-columns: 1fr; } .stats-grid.staff-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .topbar-inner { flex-direction: column; align-items: flex-start; } }
  @media (max-width: 640px) { .container { padding-left: 14px; padding-right: 14px; } .topbar-inner { padding: 14px 16px; } .nav { width: 100%; } .nav-btn { flex: 1; min-width: 140px; } .hero-card, .queue-card, .table-panel, .auth-card { padding: 20px; } .mini-grid { grid-template-columns: 1fr; } .dashboard-header { align-items: flex-start; } .toolbar { align-items: flex-start; } }
`;

const normalizeQueueResponse = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.queue)) {
    return payload.queue;
  }

  if (payload && payload.data && Array.isArray(payload.data.queue)) {
    return payload.data.queue;
  }

  return [];
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (error) {
    return value;
  }
};

function AuthScreen({ authMode, setAuthMode, onLogin, onRegister, onConfirmEmail, onResendCode, configReady }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(() => localStorage.getItem(PENDING_EMAIL_KEY) || localStorage.getItem(VERIFIED_EMAIL_KEY) || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");

  const normalizedIdentifier = email.trim();

  const handleVerifyEmail = async () => {
    if (!normalizedIdentifier) {
      setAuthError("Enter the email address that received the verification code.");
      return;
    }
    if (!verificationCode.trim()) {
      setAuthError("Enter the verification code from your email.");
      return;
    }

    setBusyAction("verify");
    setAuthError("");
    setSuccessMessage("");
    try {
      const result = await onConfirmEmail({ identifier: normalizedIdentifier, code: verificationCode.trim() });
      localStorage.removeItem(PENDING_EMAIL_KEY);
      localStorage.setItem(VERIFIED_EMAIL_KEY, normalizedIdentifier);
      setSuccessMessage(result.alreadyConfirmed ? "This email is already verified." : "Email verified successfully.");
      setAuthMode("verified");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to verify this email. Please try again.");
    } finally {
      setBusyAction("");
    }
  };

  const handleResendCode = async () => {
    if (!normalizedIdentifier) {
      setAuthError("Enter your registered email or Cognito username first.");
      return;
    }

    setBusyAction("resend");
    setAuthError("");
    setSuccessMessage("");
    try {
      const result = await onResendCode({ identifier: normalizedIdentifier });
      if (result.alreadyConfirmed) {
        localStorage.removeItem(PENDING_EMAIL_KEY);
        localStorage.setItem(VERIFIED_EMAIL_KEY, normalizedIdentifier);
        setSuccessMessage("This email is already verified.");
        setAuthMode("verified");
      } else {
        localStorage.setItem(PENDING_EMAIL_KEY, normalizedIdentifier);
        setSuccessMessage("A new verification code was sent to the email address on this account.");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to resend the code. Please try again.");
    } finally {
      setBusyAction("");
    }
  };

  const handleSubmit = async () => {
    if (!configReady) {
      setAuthError(
        "A public Cognito app client is required. Create a public SPA client in AWS Console and configure VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_CLIENT_ID, and VITE_COGNITO_REGION."
      );
      return;
    }

    if (authMode === "register") {
      if (!fullName.trim()) {
        setAuthError("Please enter your full name.");
        return;
      }
      if (!email.trim()) {
        setAuthError("Please enter your email.");
        return;
      }
      if (!password) {
        setAuthError("Please enter a password.");
        return;
      }
      if (password !== confirmPassword) {
        setAuthError("Password confirmation does not match.");
        return;
      }
    } else {
      if (!normalizedIdentifier) {
        setAuthError(authMode === "login" ? "Please enter your email or username." : "Please enter your email.");
        return;
      }
      if (authMode === "login" && !password) {
        setAuthError("Please enter your password.");
        return;
      }
    }

    setBusyAction("submit");
    setAuthError("");
    setSuccessMessage("");

    try {
      if (authMode === "register") {
        await onRegister({ fullName: fullName.trim(), email: normalizedIdentifier, password });
        localStorage.setItem(PENDING_EMAIL_KEY, normalizedIdentifier);
        localStorage.removeItem(VERIFIED_EMAIL_KEY);
        setSuccessMessage(`Cognito sent a verification code to ${normalizedIdentifier}.`);
        setAuthMode("verify");
      } else {
        await onLogin({ identifier: normalizedIdentifier, password });
      }
    } catch (error) {
      if (error && (error.code === "UserNotConfirmedException" || error.code === "UsernameExistsException")) {
        localStorage.setItem(PENDING_EMAIL_KEY, normalizedIdentifier);
        localStorage.removeItem(VERIFIED_EMAIL_KEY);
        setAuthMode("verify");
        setAuthError(error.code === "UsernameExistsException"
          ? "An account with this email already exists. If it is unverified, enter its code or resend one below."
          : "Please verify your email. Enter the code or resend it below.");
      } else {
        setAuthError(error instanceof Error ? error.message : "Unable to complete the request.");
      }
    } finally {
      setBusyAction("");
    }
  };

  const showVerification = authMode === "verify" || authMode === "verified";

  const returnToLogin = () => {
    localStorage.removeItem(VERIFIED_EMAIL_KEY);
    setAuthMode("login");
    setPassword("");
    setAuthError("");
    setSuccessMessage("");
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-top">
          <div className="auth-brand">
            <div className="brand-mark">Q</div>
            <span>SmartQueue</span>
          </div>
          <h1 className="auth-title">{authMode === "verify" ? "Verify Your Email" : authMode === "verified" ? "Email verified successfully" : authMode === "login" ? "Welcome back" : "Create account"}</h1>
          <p className="auth-subtitle">{showVerification ? "Confirm your email to finish setting up your SmartQueue account." : "Smart Campus Queue Management System"}</p>
        </div>

        {!configReady ? (
          <div className="auth-config-note">
            Public Cognito SPA configuration is required before browser authentication can run.
            Create a public app client in AWS Console and set the environment values for
            VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_CLIENT_ID, and VITE_COGNITO_REGION.
          </div>
        ) : null}

        {authError ? <div className="error-box" role="alert">{authError}</div> : null}
        {successMessage ? <div className="success-box" role="status">{successMessage}</div> : null}

        {authMode === "verified" ? (
          <div className="auth-form">
            <div className="verification-email">{localStorage.getItem(VERIFIED_EMAIL_KEY) || normalizedIdentifier}</div>
            <button type="button" className="primary-btn" onClick={returnToLogin}>Login</button>
          </div>
        ) : authMode === "verify" ? (
          <div className="auth-form">
            <div className="field">
              <label className="field-label" htmlFor="verification-email">Registered email or username</label>
              <input id="verification-email" className="text-input" type="text" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@college.edu or username" />
            </div>
            <div className="verification-email">Use the account email or Cognito username. The code is delivered to the email address on the account.</div>
            <div className="field">
              <label className="field-label" htmlFor="verification-code">Verification code</label>
              <input id="verification-code" className="text-input verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} placeholder="Enter code" />
            </div>
            <button type="button" className="primary-btn" disabled={Boolean(busyAction) || !configReady} onClick={handleVerifyEmail}>
              {busyAction === "verify" ? "Verifying..." : "Verify Email"}
            </button>
            <button type="button" className="secondary-btn" disabled={Boolean(busyAction) || !configReady} onClick={handleResendCode}>
              {busyAction === "resend" ? "Sending code..." : "Resend Code"}
            </button>
            <button type="button" className="link-btn" onClick={returnToLogin}>Back to Login</button>
          </div>
        ) : (
        <div className="auth-form">
          {authMode === "register" ? (
            <div className="field">
              <label className="field-label" htmlFor="full-name">Full name</label>
              <input id="full-name" className="text-input" type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" />
            </div>
          ) : null}

          <div className="field">
            <label className="field-label" htmlFor="auth-email">{authMode === "login" ? "Email or username" : "Email"}</label>
            <input id="auth-email" className="text-input" type={authMode === "login" ? "text" : "email"} autoComplete={authMode === "login" ? "username" : "email"} value={email} onChange={(event) => setEmail(event.target.value)} placeholder={authMode === "login" ? "name@college.edu or username" : "name@college.edu"} />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="auth-password">Password</label>
            <input id="auth-password" className="text-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
          </div>

          {authMode === "register" ? (
            <div className="field">
              <label className="field-label" htmlFor="confirm-password">Confirm password</label>
              <input id="confirm-password" className="text-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" />
            </div>
          ) : null}

          <button type="button" className="primary-btn" disabled={Boolean(busyAction) || !configReady} onClick={handleSubmit}>
            {busyAction === "submit" ? (authMode === "login" ? "Logging in..." : "Creating account...") : authMode === "login" ? "Login" : "Register"}
          </button>

          <div className="auth-actions">
            <span style={{ color: "#64748b" }}>{authMode === "login" ? "Need an account?" : "Already have an account?"}</span>
            <button type="button" className="link-btn" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
              {authMode === "login" ? "Register" : "Login"}
            </button>
          </div>
          {authMode === "login" ? (
            <button type="button" className="link-btn" onClick={() => { localStorage.setItem(PENDING_EMAIL_KEY, normalizedIdentifier); setAuthMode("verify"); setAuthError(""); setSuccessMessage(""); }}>
              Need to verify your email?
            </button>
          ) : null}
        </div>
        )}
      </div>
    </div>
  );
}

function AppContent() {
  const { currentUser, isAuthenticated, loading, configReady, login, register, confirmEmail, resendVerificationCode, logout } = useAuth();

  const [view, setView] = useState("student");
  const [authMode, setAuthMode] = useState(() => localStorage.getItem(VERIFIED_EMAIL_KEY) ? "verified" : localStorage.getItem(PENDING_EMAIL_KEY) ? "verify" : "login");
  const [name, setName] = useState("");
  const [service, setService] = useState("Office");
  const [ticket, setTicket] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [staffService, setStaffService] = useState("Office");
  const [queue, setQueue] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffSuccess, setStaffSuccess] = useState("");
  const [staffAction, setStaffAction] = useState("");

  const loadQueueForService = async (selectedService) => {
    setStaffLoading(true);
    setStaffError("");
    setStaffSuccess("");

    try {
      const response = await fetch(queueApiUrl(`/queue?service=${encodeURIComponent(selectedService)}`));
      if (!response.ok) {
        throw new Error("Unable to load the queue.");
      }

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      setQueue(normalizeQueueResponse(payload));
      return true;
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : "Unable to load the queue.");
      setQueue([]);
      return false;
    } finally {
      setStaffLoading(false);
    }
  };

  const performQueueAction = async (action) => {
    setStaffAction(action);
    setStaffError("");
    setStaffSuccess("");

    try {
      const response = await fetch(queueApiUrl("/queue/action"), {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ service: staffService, action }),
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || `Queue action failed (${response.status}).`);
      }

      const refreshed = await loadQueueForService(staffService);
      if (!refreshed) {
        setStaffError("The action succeeded, but the updated queue could not be loaded. Use Refresh Queue to try again.");
      }
      setStaffSuccess(payload.message || "Queue updated successfully.");
    } catch (error) {
      const message = error instanceof Error && error.message === "Failed to fetch"
        ? "Could not reach the queue API. Check the API Gateway connection and try again."
        : error instanceof Error
          ? error.message
          : "Queue action failed. Please try again.";
      setStaffError(message);
    } finally {
      setStaffAction("");
    }
  };

  useEffect(() => {
    if (view === "staff" && isAuthenticated) {
      loadQueueForService(staffService);
    }
  }, [view, isAuthenticated, staffService]);

  const handleJoinQueue = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setStudentError("Please enter your name.");
      return;
    }

    setStudentLoading(true);
    setStudentError("");

    try {
      const response = await fetch(queueApiUrl("/queue"), {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ name: trimmedName, service }),
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(payload && payload.message ? payload.message : "Unable to connect to SmartQueue. Please try again.");
      }

      const returnedTicket = payload && payload.queue ? payload.queue : payload;
      if (!returnedTicket || !returnedTicket.queue_id) {
        throw new Error("The queue service did not return a valid ticket.");
      }

      const queueResponse = await fetch(queueApiUrl(`/queue?service=${encodeURIComponent(service)}`));
      let queuePayload = {};
      try {
        queuePayload = await queueResponse.json();
      } catch {
        queuePayload = {};
      }

      if (!queueResponse.ok) {
        throw new Error(queuePayload && queuePayload.message ? queuePayload.message : "Unable to load the queue.");
      }

      const waitingQueue = normalizeQueueResponse(queuePayload)
        .filter((item) => item.status === "WAITING")
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      const index = waitingQueue.findIndex((item) => item.queue_id === returnedTicket.queue_id);
      const position = index >= 0 ? index + 1 : waitingQueue.length + 1;

      setTicket({ ...returnedTicket, position });
    } catch (error) {
      const message = error instanceof Error && error.message === "Failed to fetch"
        ? "Unable to connect to SmartQueue. Please try again."
        : error instanceof Error
          ? error.message
          : "Unable to join the queue.";

      setStudentError(message);
    } finally {
      setStudentLoading(false);
    }
  };

  const handleJoinAnotherQueue = () => {
    setTicket(null);
    setName("");
    setStudentError("");
  };

  const handleLogin = async (credentials) => {
    await login(credentials);
    setView("staff");
  };

  const handleRegister = async (credentials) => {
    await register(credentials);
    setView("auth");
  };

  const handleLogout = () => {
    logout();
    setView("student");
    setAuthMode("login");
  };

  const waitingCount = queue.filter((item) => item.status === "WAITING").length;
  const completedCount = queue.filter((item) => item.status === "COMPLETED").length;
  const skippedCount = queue.filter((item) => item.status === "SKIPPED").length;
  const servingTicket = queue.find((item) => item.status === "SERVING");
  const orderedQueue = [...queue].sort((a, b) => {
    const statusOrder = { SERVING: 0, WAITING: 1, COMPLETED: 2, SKIPPED: 3 };
    const statusDifference = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
    if (statusDifference !== 0) return statusDifference;
    return new Date(a.created_at) - new Date(b.created_at);
  });

  if (loading) {
    return (
      <div className="smartqueue-app">
        <style>{appStyles}</style>
        <div className="loading-state">Checking authentication...</div>
      </div>
    );
  }

  return (
    <>
      <style>{appStyles}</style>
      <div className="smartqueue-app">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand" aria-label="SmartQueue home">
              <div className="brand-mark">Q</div>
              <span>SmartQueue</span>
            </div>

            <nav className="nav" aria-label="Main navigation">
              <button type="button" className={view === "student" ? "nav-btn active" : "nav-btn"} onClick={() => setView("student")}>Student</button>

              {isAuthenticated ? (
                <>
                  <button type="button" className={view === "staff" ? "nav-btn active" : "nav-btn"} onClick={() => { setView("staff"); loadQueueForService(staffService); }}>Staff Dashboard</button>
                  <span className="user-pill">{currentUser && typeof currentUser.getUsername === "function" ? currentUser.getUsername() : "Staff"}</span>
                  <button type="button" className="nav-btn" onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <button type="button" className={view === "auth" ? "nav-btn active" : "nav-btn"} onClick={() => { setView("auth"); }}>Staff Login</button>
              )}
            </nav>
          </div>
        </header>

        <main className="container">
          {view === "auth" ? (
            <AuthScreen authMode={authMode} setAuthMode={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} onConfirmEmail={confirmEmail} onResendCode={resendVerificationCode} configReady={configReady} />
          ) : view === "staff" && !isAuthenticated ? (
            <AuthScreen authMode={authMode} setAuthMode={setAuthMode} onLogin={handleLogin} onRegister={handleRegister} onConfirmEmail={confirmEmail} onResendCode={resendVerificationCode} configReady={configReady} />
          ) : view === "staff" ? (
            <section className="dashboard">
              <div className="dashboard-header">
                <div>
                  <h2>SmartQueue Staff Dashboard</h2>
                  <div className="subheader">Manage and monitor campus service queues</div>
                </div>
                <div className="dashboard-meta">
                  <span className="badge">{configReady ? "Staff Dashboard" : "Development"}</span>
                  <button type="button" className="secondary-btn" onClick={() => loadQueueForService(staffService)} disabled={staffLoading}>
                    {staffLoading ? "Refreshing..." : "Refresh Queue"}
                  </button>
                </div>
              </div>

              <div className="panel table-panel">
                <div className="toolbar">
                  <div>
                    <label className="field-label" htmlFor="staff-service-select">Service</label>
                    <select id="staff-service-select" className="select-input" value={staffService} onChange={(event) => { const nextService = event.target.value; setStaffService(nextService); loadQueueForService(nextService); }} style={{ minWidth: 220 }}>
                      {SERVICES.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="stats-grid staff-stats">
                  <div className="stat-card staff-stat waiting"><div className="stat-label">Waiting</div><div className="stat-value">{waitingCount}</div></div>
                  <div className="stat-card staff-stat completed"><div className="stat-label">Completed</div><div className="stat-value">{completedCount}</div></div>
                  <div className="stat-card staff-stat skipped"><div className="stat-label">Skipped</div><div className="stat-value">{skippedCount}</div></div>
                  <div className="stat-card staff-stat serving"><div className="stat-label">Currently Serving</div><div className="stat-value">{servingTicket ? 1 : 0}</div></div>
                </div>
              </div>

              <div className="panel table-panel">
                <div className="toolbar">
                  <div>
                    <h3 style={{ margin: "0 0 6px" }}>Queue Overview</h3>
                    <div className="action-note">Showing live tickets for {staffService}</div>
                  </div>
                  <div className="staff-actions" aria-label="Queue management actions">
                    <button type="button" className="primary-btn staff-action call" onClick={() => performQueueAction("CALL_NEXT")} disabled={Boolean(staffAction) || waitingCount === 0 || Boolean(servingTicket)}>
                      {staffAction === "CALL_NEXT" ? "Calling..." : "Call Next"}
                    </button>
                    <button type="button" className="primary-btn staff-action complete" onClick={() => performQueueAction("COMPLETE")} disabled={Boolean(staffAction) || !servingTicket}>
                      {staffAction === "COMPLETE" ? "Completing..." : "Complete"}
                    </button>
                    <button type="button" className="primary-btn staff-action skip" onClick={() => performQueueAction("SKIP")} disabled={Boolean(staffAction) || !servingTicket}>
                      {staffAction === "SKIP" ? "Skipping..." : "Skip"}
                    </button>
                  </div>
                </div>

                {staffError ? <div className="error-box">{staffError}</div> : null}
                {staffSuccess ? <div className="success-box" role="status">{staffSuccess}</div> : null}

                {servingTicket ? (
                  <div className="serving-banner" style={{ marginBottom: 18 }}>
                    <div>
                      <div className="serving-banner-label">Currently serving</div>
                      <div className="serving-banner-name">{servingTicket.name || "Customer"}</div>
                    </div>
                    <div className="serving-banner-ticket">Ticket {servingTicket.queue_id || "-"}</div>
                  </div>
                ) : null}

                {staffLoading ? (
                  <div className="queue-empty"><div><strong>Loading queue...</strong>Fetching the latest service queue.</div></div>
                ) : orderedQueue.length === 0 ? (
                  <div className="queue-empty"><div><strong>No tickets in this queue.</strong>The live queue is currently clear for this service.</div></div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Service</th>
                          <th>Status</th>
                          <th>Joined At</th>
                          <th>Ticket ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderedQueue.map((entry, index) => (
                          <tr key={entry.queue_id || index} className={entry.status === "SERVING" ? "queue-table-row-serving" : ""}>
                            <td>{index + 1}</td>
                            <td>{entry.name || "Unknown"}</td>
                            <td>{entry.service || "-"}</td>
                            <td><span className={`status-badge ${entry.status === "WAITING" ? "status-waiting" : entry.status === "SERVING" ? "status-serving" : entry.status === "COMPLETED" ? "status-completed" : entry.status === "SKIPPED" ? "status-skipped" : "status-other"}`}>{entry.status || "UNKNOWN"}</span></td>
                            <td>{formatDateTime(entry.created_at)}</td>
                            <td>{entry.queue_id || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="student-wrapper">
              <div className="panel hero-card">
                <span className="eyebrow">Campus Services</span>
                <h1 className="hero-title">Smart Campus Queue Management System</h1>
                <p className="hero-copy">Join a service queue in seconds and keep track of your place in line without waiting in crowded campus spaces.</p>

                <div className="mini-grid">
                  <div className="mini-stat"><span className="mini-stat-label">Office</span><span className="mini-stat-value">Live</span></div>
                  <div className="mini-stat"><span className="mini-stat-label">Library</span><span className="mini-stat-value">Live</span></div>
                  <div className="mini-stat"><span className="mini-stat-label">Lab</span><span className="mini-stat-value">Live</span></div>
                </div>
              </div>

              <div className="panel queue-card">
                <div className="card-header">
                  <h2 className="card-title">Join Queue</h2>
                  <span className="badge">Student</span>
                </div>

                {!ticket ? (
                  <>
                    {studentError ? <div className="error-box">{studentError}</div> : null}

                    <div className="field">
                      <label className="field-label" htmlFor="student-name">Your name</label>
                      <input id="student-name" className="text-input" type="text" placeholder="Enter your full name" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleJoinQueue(); }} aria-label="Your name" />
                    </div>

                    <div className="field">
                      <label className="field-label" htmlFor="service-select">Service</label>
                      <select id="service-select" className="select-input" value={service} onChange={(event) => setService(event.target.value)} aria-label="Select a service">
                        {SERVICES.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <button type="button" className="primary-btn" onClick={handleJoinQueue} disabled={studentLoading}>{studentLoading ? "Joining queue..." : "Join Queue"}</button>
                  </>
                ) : (
                  <div className="ticket-card">
                    <div className="ticket-head">
                      <h3 style={{ margin: 0 }}>Queue Joined Successfully</h3>
                      <span className="success-pill">Active</span>
                    </div>

                    <div className="ticket-grid">
                      <div className="ticket-row"><span className="ticket-label">Name</span><span className="ticket-value">{ticket.name}</span></div>
                      <div className="ticket-row"><span className="ticket-label">Service</span><span className="ticket-value">{ticket.service}</span></div>
                      <div className="ticket-row"><span className="ticket-label">Status</span><span className="ticket-value">{ticket.status}</span></div>
                    </div>

                    <div className="position-box"><strong>Current Queue Position</strong><span>#{ticket.position}</span></div>
                    <div className="ticket-row" style={{ display: "block", paddingTop: 0 }}>
                      <span className="ticket-label">Ticket ID</span>
                      <div className="ticket-value" style={{ marginTop: 8, textAlign: "left" }}>{ticket.queue_id}</div>
                    </div>

                    <button type="button" className="secondary-btn" onClick={handleJoinAnotherQueue} style={{ width: "100%", marginTop: 18 }}>Join Another Queue</button>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>

        <footer className="footer">SmartQueue • Smart Campus Services</footer>
      </div>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
