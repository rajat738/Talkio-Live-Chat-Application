import React, { useState } from "react";
import API from "../services/api";

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await API.post("/auth/register", form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.msg || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
        <h3 style={{ color: "#1e293b" }}>Account created!</h3>
        <p style={{ color: "#64748b", fontSize: 14 }}>You can now login with your credentials.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h2 style={styles.formTitle}>Create account</h2>
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.field}>
        <label style={styles.label}>Username</label>
        <input
          placeholder="Choose a username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          style={styles.input}
          required
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          style={styles.input}
          required
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Password</label>
        <input
          type="password"
          placeholder="Create a password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          style={styles.input}
          required
        />
      </div>

      <button type="submit" disabled={loading} style={styles.btn}>
        {loading ? "Creating account..." : "Create Account →"}
      </button>
    </form>
  );
}

const styles = {
  formTitle: { fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 20 },
  error: {
    background: "#fef2f2",
    color: "#ef4444",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 14,
    border: "1px solid #fecaca",
  },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    outline: "none",
    background: "#f8fafc",
    color: "#1e293b",
    boxSizing: "border-box",
  },
  btn: {
    width: "100%",
    padding: "12px",
    borderRadius: 10,
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "white",
    border: "none",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    marginTop: 4,
  },
};
