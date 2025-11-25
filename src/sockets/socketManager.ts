import { Server } from "socket.io";
import http from "http";
import { initNotificationSocket } from "./notificationSocket";

export let io: Server;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173"], 
      methods: ["GET", "POST"],
      credentials: true
    },
  });
  initNotificationSocket(io);
};

