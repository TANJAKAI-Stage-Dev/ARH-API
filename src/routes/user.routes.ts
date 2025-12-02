import { Router } from "express";
import { authorize, protect } from "../middlewares/auth.middleware";
import { getProfile ,createTeam,getTeams,updateTeam,deleteTeam, deleteUser, getAllEmployees,} from "../controllers/user.controller";
import { updateAvatar } from "../controllers/user.controller";
import upload from "../config/AvatarUpload";

const user_routes:Router = Router();

user_routes.get('/profile',protect,authorize("EMPLOYEE","ADMIN","MANAGER","SUPERADMIN"),getProfile);
user_routes.put("/avatar", protect, upload.single("avatar"), updateAvatar);
user_routes.delete('/delete/:userId',protect,authorize("SUPERADMIN"),deleteUser);
user_routes.get('/getAllEmployee',protect,authorize("MANAGER"),getAllEmployees);
/* --- Teams --- */
user_routes.post("/teams", protect, authorize("ADMIN","SUPERADMIN"), createTeam);
user_routes.get("/teams", protect, authorize("ADMIN", "MANAGER","SUPERADMIN"), getTeams);
user_routes.put("/teams/:id", protect, authorize("ADMIN","SUPERADMIN"), updateTeam);
user_routes.delete("/teams/:id", protect, authorize("ADMIN","SUPERADMIN"), deleteTeam);


export default user_routes;