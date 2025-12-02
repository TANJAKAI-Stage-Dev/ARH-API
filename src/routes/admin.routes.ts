import { Router } from "express";
import { registerByAdmin,getAllUser } from "../controllers/admin.controller";
import { protect,authorize } from "../middlewares/auth.middleware";

const admin_routes:Router = Router();

admin_routes.post("/registerByAdmin", protect, authorize("ADMIN","SUPERADMIN"), registerByAdmin);

admin_routes.get("/getAllUser",protect,authorize("ADMIN","SUPERADMIN"),getAllUser);

export default admin_routes;