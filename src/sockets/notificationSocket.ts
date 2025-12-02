import { Server } from "socket.io";

export const initNotificationSocket = (io: Server) => {
  io.on("connection", (socket) => {
    console.log("Nouvelle connexion Socket :", socket.id);

    socket.on("join", (userId: string) => {
      console.log(`User ${userId} a rejoint le salon`);
      socket.join(userId);
    });

    socket.on("disconnect", () => {
      console.log("Déconnexion Socket :", socket.id);
    });
  });
};
