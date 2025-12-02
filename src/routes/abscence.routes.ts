import { Router } from "express";
import { protect,authorize } from "../middlewares/auth.middleware";
import { createAbsence, deleteAbsence, getAbsenceById, getAllAbsences, updateAbsence } from "../controllers/abscence.controller";

const abs_routes:Router = Router();

abs_routes.post("/create", protect, authorize("MANAGER"), createAbsence);
abs_routes.get("/list", protect, authorize("MANAGER"), getAllAbsences);
abs_routes.get("/:id", protect, authorize("MANAGER"),getAbsenceById);
abs_routes.put("/update/:id", protect, authorize("MANAGER"), updateAbsence);
abs_routes.delete("/delete/:id", protect, authorize("MANAGER"), deleteAbsence);

export default abs_routes;