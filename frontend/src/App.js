import { useEffect, useState } from "react";
import socket from "./socket";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";

export const getAvatarColor = (name) => {
  const colors = [
    "linear-gradient(135deg, #6366f1, #8b5cf6)",
    "linear-gradient(135deg, #f59e0b, #ef4444)",
    "linear-gradient(135deg, #10b981, #059669)",
    "linear-gradient(135deg, #3b82f6, #06b6d4)",
    "linear-gradient(135deg, #ec4899, #f43f5e)",
    "linear-gradient(135deg, #f97316, #eab308)",
    "linear-gradient(135deg, #8b5cf6, #ec4899)",
    "linear-gradient(135deg, #14b8a6, #6366f1)",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
};

function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [receiverId, setReceiverId] = useState("");
  const [receiverInput, setReceiverInput] = useState("");
  const [chatStarted, setChatStarted] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (!user) return;
    socket.connect();
    socket.emit("user:online", user.username);

    socket.on("receive:private", (msg) => {
      if (msg.receiver === user.username && msg.sender !== receiverId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.sender]: (prev[msg.sender] || 0) + 1,
        }));
        setRecentChats((prev) => {
          if (prev.includes(msg.sender)) return prev;
          return [msg.sender, ...prev].slice(0, 8);
        });
      }
    });

    return () => {
      socket.off("receive:private");
      socket.disconnect();
    };
  }, [user, receiverId]);

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    socket.disconnect();
    setUser(null);
    setChatStarted(false);
    setReceiverId("");
    setRecentChats([]);
    setUnreadCounts({});
  };

  const startChat = (name) => {
    const trimmed = (name || receiverInput).trim();
    if (!trimmed) return;
    if (trimmed === user.username) { alert("You cannot chat with yourself!"); return; }
    setReceiverId(trimmed);
    setChatStarted(true);
    setUnreadCounts((prev) => ({ ...prev, [trimmed]: 0 }));
    setRecentChats((prev) => {
      if (prev.includes(trimmed)) return prev;
      return [trimmed, ...prev].slice(0, 8);
    });
    setReceiverInput("");
    setIsMobileMenuOpen(false);
  };

  if (!user) {
    return (
      <div style={styles.authBg}>
        <div style={styles.authCard}>
          <div style={styles.authLogo}>
            <span style={{ fontSize: 36 }}>🔥</span>
            <h1 style={styles.authTitle}>Talkio</h1>
            <p style={styles.authSubtitle}>Real-time private messaging</p>
          </div>
          {showRegister ? (
            <>
              <Register />
              <p style={styles.switchText}>
                Already have an account?{" "}
                <span style={styles.switchLink} onClick={() => setShowRegister(false)}>Login</span>
              </p>
            </>
          ) : (
            <>
              <Login onLogin={handleLogin} />
              <p style={styles.switchText}>
                Don't have an account?{" "}
                <span style={styles.switchLink} onClick={() => setShowRegister(true)}>Register</span>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appLayout}>
      {isMobile && (
        <div style={styles.mobileTopBar}>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={styles.menuBtn}>☰</button>
          <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>🔥 Talkio</span>
          <div style={{ ...styles.userAvatar, width: 32, height: 32, fontSize: 13, background: getAvatarColor(user.username) }}>
            {user.username[0]?.toUpperCase()}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {(!isMobile || isMobileMenuOpen) && (
          <div style={{ ...styles.sidebar, ...(isMobile ? styles.sidebarMobile : {}) }}>
            <div style={styles.sidebarHeader}>
              <div style={styles.sidebarLogo}>🔥 Talkio</div>
              <div style={styles.userInfo}>
                <div style={{ ...styles.userAvatar, background: getAvatarColor(user.username) }}>
                  {user.username[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>{user.username}</div>
                  <div style={{ fontSize: 11, color: "#4ade80" }}>● Active</div>
                </div>
                <button onClick={handleLogout} style={styles.logoutBtn} title="Logout">⏻</button>
              </div>
            </div>

            <div style={styles.newChatSection}>
              <div style={styles.sectionLabel}>NEW CHAT</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  placeholder="Enter username..."
                  value={receiverInput}
                  onChange={(e) => setReceiverInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startChat()}
                  style={styles.sidebarInput}
                />
                <button onClick={() => startChat()} style={styles.startBtn}>→</button>
              </div>
            </div>

            {recentChats.length > 0 && (
              <div style={{ padding: "0 16px", flex: 1, overflowY: "auto" }}>
                <div style={styles.sectionLabel}>RECENT</div>
                {recentChats.map((name) => (
                  <div
                    key={name}
                    onClick={() => startChat(name)}
                    style={{
                      ...styles.recentItem,
                      background: receiverId === name && chatStarted ? "#334155" : "transparent",
                    }}
                  >
                    <div style={{ ...styles.recentAvatar, background: getAvatarColor(name) }}>
                      {name[0]?.toUpperCase()}
                    </div>
                    <span style={{ color: "#cbd5e1", fontSize: 14, flex: 1 }}>{name}</span>
                    {unreadCounts[name] > 0 && (
                      <span style={styles.badge}>{unreadCounts[name]}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isMobile && isMobileMenuOpen && (
          <div onClick={() => setIsMobileMenuOpen(false)} style={styles.overlay} />
        )}

        <div style={styles.mainArea}>
          {!chatStarted ? (
            <div style={styles.welcomeScreen}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>💬</div>
              <h2 style={{ color: "#1e293b", fontWeight: 700 }}>Welcome, {user.username}!</h2>
              <p style={{ color: "#94a3b8" }}>Search a username on the left to start chatting</p>
            </div>
          ) : (
            <Chat
              userId={user.username}
              receiverId={receiverId}
              onBack={() => { setChatStarted(false); setReceiverId(""); }}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  authBg: { minHeight: "100vh", background: "linear-gradient(135deg, #0f172a, #1e293b)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  authCard: { background: "white", borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  authLogo: { textAlign: "center", marginBottom: 28 },
  authTitle: { margin: "4px 0 4px", fontSize: 28, fontWeight: 800, color: "#1e293b" },
  authSubtitle: { margin: 0, color: "#94a3b8", fontSize: 14 },
  switchText: { textAlign: "center", color: "#64748b", fontSize: 13, marginTop: 16 },
  switchLink: { color: "#6366f1", cursor: "pointer", fontWeight: 600 },
  appLayout: { display: "flex", flexDirection: "column", height: "100vh", background: "#f8fafc", overflow: "hidden" },
  mobileTopBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#1e293b", flexShrink: 0 },
  menuBtn: { background: "transparent", border: "none", color: "white", fontSize: 20, cursor: "pointer", padding: 4 },
  sidebar: { width: 280, background: "#1e293b", display: "flex", flexDirection: "column", flexShrink: 0, height: "100%" },
  sidebarMobile: { position: "absolute", top: 0, left: 0, height: "100%", zIndex: 100, boxShadow: "4px 0 20px rgba(0,0,0,0.3)" },
  overlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 99 },
  sidebarHeader: { padding: "20px 16px 12px", borderBottom: "1px solid #334155" },
  sidebarLogo: { fontSize: 18, fontWeight: 800, color: "white", marginBottom: 16 },
  userInfo: { display: "flex", alignItems: "center", gap: 10 },
  userAvatar: { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "white", fontSize: 15, flexShrink: 0 },
  logoutBtn: { background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, padding: 4, borderRadius: 6 },
  newChatSection: { padding: "16px", borderBottom: "1px solid #334155" },
  sectionLabel: { fontSize: 11, color: "#64748b", marginBottom: 8, fontWeight: 600, letterSpacing: 1 },
  sidebarInput: { flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 13, outline: "none" },
  startBtn: { padding: "8px 12px", borderRadius: 8, background: "#6366f1", color: "white", border: "none", cursor: "pointer", fontSize: 16, fontWeight: "bold" },
  recentItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 10, cursor: "pointer", marginBottom: 2 },
  recentAvatar: { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: "bold", color: "white", flexShrink: 0 },
  badge: { background: "#6366f1", color: "white", borderRadius: "50%", minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, padding: "0 4px" },
  mainArea: { flex: 1, padding: "16px", overflow: "hidden", display: "flex", flexDirection: "column" },
  welcomeScreen: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#64748b" },
};

export default App;
