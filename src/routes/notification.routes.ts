import express, { Router } from "express";
import { getUserNotifications, markAsRead, deleteNotification } from "../controllers/notification.controller";
import { authorize, protect } from "../middlewares/auth.middleware";
const notif_routes:Router = Router();

notif_routes.get("/:userId",protect,authorize("ADMIN","MANAGER","EMPLOYEE","SUPERADMIN"), getUserNotifications);
notif_routes.put("/read",protect,authorize("ADMIN","MANAGER","EMPLOYEE","SUPERADMIN"), markAsRead);
notif_routes.delete("/:id",protect,authorize("ADMIN","MANAGER","EMPLOYEE","SUPERADMIN"), deleteNotification);

export default notif_routes;
