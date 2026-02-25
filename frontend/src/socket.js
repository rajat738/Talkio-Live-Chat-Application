import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  autoConnect: false,
});

socket.on("connect", () => {
  console.log("🔥 FRONTEND SOCKET CONNECTED:", socket.id);
});

socket.on("disconnect", () => {
  console.log("🔴 FRONTEND SOCKET DISCONNECTED");
});

export default socket;
