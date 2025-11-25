import { Router } from "express";
import {toggleTeamCriteria,createEvaluation,getEvaluations, getCriteria, getTeamCriteria, getSixMonthsChart, getLastNotedMonth, getActifCriteria, isEvaluated, getTopEmployees, getStats, getEvaluationByEmployee, getMyEvaluation, getMyEvaluatedMonths, getTeamsForChart} from "../controllers/performance.controller";
import { protect, authorize } from "../middlewares/auth.middleware";

const perf_routes:Router = Router();

perf_routes.get("/criteria",protect,authorize("ADMIN","SUPERADMIN"),getCriteria);

/* --- Team Criteria --- */
perf_routes.post("/teams/criteria/toggle", protect, authorize("ADMIN","SUPERADMIN"), toggleTeamCriteria);
perf_routes.get("/teams/:id/criteria", protect, authorize("ADMIN","SUPERADMIN"), getTeamCriteria);

/* --- Evaluations --- */
perf_routes.post("/evaluations", protect, authorize("MANAGER"), createEvaluation);
perf_routes.get("/evaluations", protect, authorize("ADMIN", "MANAGER", "EMPLOYEE","SUPERADMIN"), getEvaluations);
perf_routes.get("/Myevaluations", protect, authorize("EMPLOYEE"), getMyEvaluation);
perf_routes.get("/MyevaluatedMonths", protect, authorize("EMPLOYEE"), getMyEvaluatedMonths);
perf_routes.get("/employees", protect, authorize("MANAGER"), isEvaluated);
// Récupérer les critères et scores pour noter un employé
perf_routes.get("/note/:employeeId", protect, authorize("MANAGER"), getActifCriteria);
perf_routes.get("/teams/list", protect, authorize("MANAGER"), getTeamsForChart);
perf_routes.get("/chart/teams", protect, authorize("MANAGER"), getSixMonthsChart);
perf_routes.get("/top5", protect, authorize("MANAGER"), getTopEmployees);
perf_routes.get("/stats", protect, authorize("MANAGER"), getStats);
perf_routes.get("/evaluations/:employeeId",protect,authorize("MANAGER", "ADMIN","SUPERADMIN"),getEvaluationByEmployee);


export default perf_routes;
