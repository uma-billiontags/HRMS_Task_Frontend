// Login.tsx
// Single login form for both Admin and Employee — the backend decides the role,
// the frontend just redirects based on what comes back.

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const user = await login(email, password);
      navigate(user.role === "admin" ? "/admin/dashboard" : "/employee/dashboard", {
        replace: true,
      });
    } catch {
      // error is already captured in useAuth().error and shown below
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>T</div>
          <span style={styles.logoName}>Task Tracker</span>
        </div>
        <p style={styles.subtitle}>Sign in to your dashboard</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={styles.input}
              autoFocus
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={styles.input}
              required
            />
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Inline styles use the same CSS variables defined in your shared theme file,
// so this page automatically matches the rest of the app.
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg-page)",
    fontFamily: "'Poppins', sans-serif",
  },
  card: {
    width: 360,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-card)",
    boxShadow: "var(--shadow)",
    padding: "32px 28px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  logoIcon: {
    width: 32,
    height: 32,
    background: "var(--accent)",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 800,
    color: "#fff",
  },
  logoName: {
    fontSize: 17,
    fontWeight: 800,
    color: "var(--accent)",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 12,
    color: "var(--text-secondary)",
    marginBottom: 22,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-primary)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  input: {
    background: "var(--bg-input)",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-sm)",
    height: 38,
    padding: "0 12px",
    fontSize: 13,
    fontFamily: "'Poppins', sans-serif",
    color: "var(--text-primary)",
    outline: "none",
  },
  errorBox: {
    background: "var(--red-bg)",
    color: "var(--red)",
    fontSize: 11,
    fontWeight: 600,
    borderRadius: "var(--radius-sm)",
    padding: "8px 10px",
  },
  button: {
    marginTop: 6,
    height: 40,
    background: "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Poppins', sans-serif",
    cursor: "pointer",
  },
};