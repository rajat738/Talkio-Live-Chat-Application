import { useEffect, useState, useRef } from "react";
import socket from "../socket";
import { getAvatarColor } from "../App";

const EMOJIS = [
  "😀","😂","😍","🥰","😎","😭","😡","🤔","😴","🥳",
  "👍","👎","❤️","🔥","✅","🎉","🙏","💯","😢","😮",
  "🤣","😇","🤩","😏","🥺","😤","🤯","😱","🤗","😜",
  "👏","💪","🤝","✌️","🫶","😅","🙈","💀","👀","🎊",
];

export default function Chat({ userId, receiverId, onBack, isMobile }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!userId || !receiverId) return;
    fetch(`http://localhost:5000/api/messages/${userId}/${receiverId}`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setMessages(data); })
      .catch((err) => console.error("History error:", err));
  }, [userId, receiverId]);

  useEffect(() => {
    if (!userId) return;

    socket.on("online:users", (users) => setIsOnline(users.includes(receiverId)));

    const handleReceive = (msg) => {
      const mine =
        (msg.sender === userId && msg.receiver === receiverId) ||
        (msg.sender === receiverId && msg.receiver === userId);
      if (!mine) return;
      setMessages((prev) => {
        if (msg._id && prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    const handleTyping = ({ sender }) => {
      if (sender !== receiverId) return;
      setIsTyping(true);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setIsTyping(false), 2000);
    };

    const handleDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => m._id === messageId ? { ...m, deleted: true, content: "", imageUrl: "" } : m)
      );
    };

    socket.on("receive:private", handleReceive);
    socket.on("user:typing", handleTyping);
    socket.on("message:deleted", handleDeleted);

    return () => {
      socket.off("receive:private", handleReceive);
      socket.off("online:users");
      socket.off("user:typing", handleTyping);
      socket.off("message:deleted", handleDeleted);
    };
  }, [userId, receiverId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest("#emoji-picker") && !e.target.closest("#emoji-btn")) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit("send:private", { sender: userId, receiver: receiverId, content: message, messageType: "text" });
    setMessage("");
    setShowEmoji(false);
  };

  const sendImage = async () => {
    if (!imageFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const res = await fetch("http://localhost:5000/api/messages/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.imageUrl) {
        socket.emit("send:private", { sender: userId, receiver: receiverId, content: "", messageType: "image", imageUrl: data.imageUrl });
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      setImagePreview(null);
      setImageFile(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    socket.emit("typing", { sender: userId, receiver: receiverId });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const deleteMessage = (msgId) => {
    socket.emit("delete:message", { messageId: msgId, sender: userId, receiver: receiverId });
    setMessages((prev) => prev.map((m) => m._id === msgId ? { ...m, deleted: true, content: "", imageUrl: "" } : m));
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const groupByDate = (msgs) => {
    const groups = {};
    msgs.forEach((msg) => {
      const d = msg.createdAt ? new Date(msg.createdAt) : new Date();
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      let label;
      if (d.toDateString() === today.toDateString()) label = "Today";
      else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
      else label = d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
      if (!groups[label]) groups[label] = [];
      groups[label].push(msg);
    });
    return groups;
  };

  const grouped = groupByDate(messages);
  const receiverColor = getAvatarColor(receiverId);
  const senderColor = getAvatarColor(userId);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        {isMobile && <button onClick={onBack} style={styles.backBtn}>←</button>}
        <div style={{ ...styles.headerAvatar, background: receiverColor }}>
          {receiverId[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.headerName}>{receiverId}</div>
          <div style={{ fontSize: 12, color: isOnline ? "#4ade80" : "#94a3b8" }}>
            {isTyping ? "✍️ typing..." : isOnline ? "● Online" : "● Offline"}
          </div>
        </div>
      </div>

      <div style={styles.messageArea}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>👋</div>
            <div style={{ color: "#94a3b8", fontSize: 14 }}>No messages yet. Say hi!</div>
          </div>
        )}

        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <div style={styles.dateSeparator}>
              <span style={styles.dateLabel}>{date}</span>
            </div>
            {msgs.map((msg, i) => {
              const isSelf = msg.sender === userId;
              return (
                <div
                  key={i}
                  style={{ display: "flex", justifyContent: isSelf ? "flex-end" : "flex-start", marginBottom: 6, alignItems: "flex-end", gap: 6 }}
                  onMouseEnter={() => setHoveredMsg(msg._id)}
                  onMouseLeave={() => setHoveredMsg(null)}
                >
                  {!isSelf && <div style={{ ...styles.msgAvatar, background: receiverColor }}>{receiverId[0]?.toUpperCase()}</div>}
                  <div style={{ maxWidth: "65%", position: "relative" }}>
                    {isSelf && !msg.deleted && hoveredMsg === msg._id && (
                      <button onClick={() => deleteMessage(msg._id)} style={styles.deleteBtn}>🗑️</button>
                    )}
                    {msg.deleted ? (
                      <div style={{ ...styles.bubble, ...styles.bubbleDeleted }}>
                        <span style={{ fontStyle: "italic", opacity: 0.6 }}>🚫 Message deleted</span>
                      </div>
                    ) : msg.messageType === "image" ? (
                      <div style={{ ...styles.bubble, ...(isSelf ? styles.bubbleSelf : styles.bubbleOther), padding: 6 }}>
                        <img src={`http://localhost:5000${msg.imageUrl}`} alt="sent" onClick={() => setLightboxImg(`http://localhost:5000${msg.imageUrl}`)} style={styles.msgImage} />
                      </div>
                    ) : (
                      <div style={{ ...styles.bubble, ...(isSelf ? styles.bubbleSelf : styles.bubbleOther) }}>{msg.content}</div>
                    )}
                    <div style={{ ...styles.timeStamp, textAlign: isSelf ? "right" : "left" }}>
                      {formatTime(msg.createdAt)}
                      {isSelf && !msg.deleted && <span style={{ marginLeft: 4, color: "#818cf8" }}>✓✓</span>}
                    </div>
                  </div>
                  {isSelf && <div style={{ ...styles.msgAvatar, background: senderColor }}>{userId[0]?.toUpperCase()}</div>}
                </div>
              );
            })}
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <div style={{ ...styles.msgAvatar, background: receiverColor }}>{receiverId[0]?.toUpperCase()}</div>
            <div style={{ ...styles.bubble, ...styles.bubbleOther, padding: "12px 16px" }}>
              <div style={styles.typingDots}>
                <span style={{ ...styles.dot, animationDelay: "0s" }} />
                <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
                <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {imagePreview && (
        <div style={styles.imagePreviewBar}>
          <img src={imagePreview} alt="preview" style={{ height: 80, borderRadius: 8, objectFit: "cover" }} />
          <div style={{ flex: 1, paddingLeft: 12 }}>
            <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 600 }}>Ready to send</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{imageFile?.name}</div>
          </div>
          <button onClick={() => { setImagePreview(null); setImageFile(null); }} style={styles.cancelPreviewBtn}>✕</button>
          <button onClick={sendImage} disabled={uploading} style={styles.sendImageBtn}>{uploading ? "⏳" : "Send 📤"}</button>
        </div>
      )}

      {showEmoji && (
        <div id="emoji-picker" style={styles.emojiPicker}>
          {EMOJIS.map((emoji, i) => (
            <button key={i} onClick={() => setMessage((p) => p + emoji)} style={styles.emojiBtn}>{emoji}</button>
          ))}
        </div>
      )}

      <div style={styles.inputArea}>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} />
        <button onClick={() => fileInputRef.current.click()} style={styles.iconBtn}>📎</button>
        <button id="emoji-btn" onClick={() => setShowEmoji((p) => !p)} style={styles.iconBtn}>😊</button>
        <input value={message} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Type a message..." style={styles.input} />
        <button onClick={sendMessage} disabled={!message.trim()} style={{ ...styles.sendBtn, opacity: message.trim() ? 1 : 0.5, background: getAvatarColor(userId) }}>➤</button>
      </div>

      {lightboxImg && (
        <div style={styles.lightbox} onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="full" style={styles.lightboxImg} />
          <button style={styles.lightboxClose} onClick={() => setLightboxImg(null)}>✕</button>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", height: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid #e5e7eb", background: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", position: "relative" },
  header: { display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: "#1e293b", color: "white", flexShrink: 0 },
  backBtn: { background: "transparent", border: "none", color: "white", fontSize: 20, cursor: "pointer", padding: "0 8px 0 0" },
  headerAvatar: { width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 18, color: "white", flexShrink: 0 },
  headerName: { fontWeight: 600, fontSize: 16, color: "white" },
  messageArea: { flex: 1, overflowY: "auto", padding: "16px 20px", background: "#f8fafc" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", paddingTop: 60 },
  dateSeparator: { display: "flex", justifyContent: "center", margin: "14px 0" },
  dateLabel: { background: "#e2e8f0", color: "#64748b", fontSize: 11, padding: "3px 14px", borderRadius: 20, fontWeight: 500 },
  msgAvatar: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold", color: "white", flexShrink: 0 },
  bubble: { padding: "10px 14px", borderRadius: 18, fontSize: 14, lineHeight: 1.6, wordBreak: "break-word" },
  bubbleSelf: { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", borderBottomRightRadius: 4 },
  bubbleOther: { background: "#ffffff", color: "#1e293b", border: "1px solid #e2e8f0", borderBottomLeftRadius: 4 },
  bubbleDeleted: { background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#94a3b8", borderRadius: 18, padding: "10px 14px" },
  msgImage: { maxWidth: 220, maxHeight: 220, borderRadius: 12, display: "block", cursor: "pointer", objectFit: "cover" },
  deleteBtn: { position: "absolute", top: -28, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "2px 8px", cursor: "pointer", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", zIndex: 10 },
  timeStamp: { fontSize: 10, color: "#94a3b8", marginTop: 3, paddingLeft: 4, paddingRight: 4 },
  typingDots: { display: "flex", gap: 4, alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: "50%", background: "#94a3b8", display: "inline-block", animation: "bounce 1.2s infinite" },
  imagePreviewBar: { display: "flex", alignItems: "center", padding: "10px 16px", background: "#f1f5f9", borderTop: "1px solid #e2e8f0", gap: 8, flexShrink: 0 },
  cancelPreviewBtn: { background: "#e2e8f0", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 13, fontWeight: "bold" },
  sendImageBtn: { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  emojiPicker: { position: "absolute", bottom: 70, left: 16, background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 12, display: "flex", flexWrap: "wrap", width: 280, gap: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", zIndex: 50 },
  emojiBtn: { background: "transparent", border: "none", fontSize: 22, cursor: "pointer", padding: 4, borderRadius: 8, lineHeight: 1 },
  inputArea: { display: "flex", gap: 8, padding: "12px 16px", background: "#ffffff", borderTop: "1px solid #e5e7eb", alignItems: "center", flexShrink: 0 },
  iconBtn: { background: "#f1f5f9", border: "none", borderRadius: "50%", width: 38, height: 38, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  input: { flex: 1, padding: "11px 18px", borderRadius: 24, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", background: "#f8fafc", color: "#1e293b" },
  sendBtn: { width: 44, height: 44, borderRadius: "50%", color: "white", border: "none", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  lightbox: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, cursor: "pointer" },
  lightboxImg: { maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
  lightboxClose: { position: "fixed", top: 20, right: 20, background: "rgba(255,255,255,0.2)", border: "none", color: "white", fontSize: 20, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontWeight: "bold" },
};
