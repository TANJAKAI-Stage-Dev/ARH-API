import { Router } from "express";
import { login,SetupPwd } from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";

const auth_routes:Router = Router();

auth_routes.post("/login", login);

auth_routes.put("/setup-password", protect, SetupPwd);

export default auth_routes;
