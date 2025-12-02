import { Router } from "express";
import auth_routes from "./auth.routes";
import admin_routes from "./admin.routes"
import leave_routes from "./leave.routes";
import notif_routes from "./notification.routes";
import user_routes from "./user.routes";
import perf_routes from "./performance.routes";
import abs_routes from "./abscence.routes";

const routes = Router();

routes.use('/auth',auth_routes);
routes.use('/admin',admin_routes);
routes.use('/leave',leave_routes);
routes.use('/notifications',notif_routes);
routes.use('/user',user_routes);
routes.use('/performance',perf_routes);
routes.use('/abscence',abs_routes)

export default routes;