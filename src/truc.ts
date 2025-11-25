import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import routes from "./routes";

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api',routes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"],
    credentials: true
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Nouveau client connecté :", socket.id);

  socket.on("send_message", (data) => {
    console.log("📩 Message reçu :", data);
    socket.emit("receive_message", `Message reçu : ${data}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client déconnecté :", socket.id);
  });
});

// ✅ Route test pour vérifier que le backend tourne
app.get("/", (_, res) => {
  res.send("Serveur Express + Socket.io OK ✅");
});

server.listen(3005, () => {
  console.log("Serveur lancé sur http://localhost:3005");
});
