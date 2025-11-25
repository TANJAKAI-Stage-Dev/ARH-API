import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routes from "./routes";
import { swaggerDocs } from "./config/swagger";
import http from 'http';
import { initSocket } from "./sockets/socketManager";
import path from "path";

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true
}));

app.use(express.json());

app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
// app.use("/uploads", express.static(path.resolve("uploads")));


app.use("/api", routes);

const server = http.createServer(app);

initSocket(server);

swaggerDocs(app);

const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger disponible sur http://localhost:${PORT}/api-docs`);
});
