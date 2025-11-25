import { Router } from "express";
import { authorize, protect } from "../middlewares/auth.middleware";
import { approveLeave, createLeavePolicy, createLeaveRequest, deleteLeave, deleteLeavePolicy, editLeave, getAllLeaveRequest, getLeaveTypeStats, getMonthlyLeaveStats, getMyLeavePolicy, getMyLeaves, getPolicies, rejectLeave, updateLeavePolicy } from "../controllers/leave.controller";
import uploadJustificatif from "../config/DocumentUpload";

const leave_routes:Router = Router();

leave_routes.post("/create",uploadJustificatif.single("document"),protect,authorize("EMPLOYEE","MANAGER"),createLeaveRequest);
leave_routes.get("/list",protect,authorize("MANAGER","ADMIN","SUPERADMIN"),getAllLeaveRequest);
leave_routes.put("/approve",protect,authorize("MANAGER","ADMIN","SUPERADMIN"),approveLeave);
leave_routes.put("/reject",protect,authorize("MANAGER","ADMIN","SUPERADMIN"),rejectLeave);
leave_routes.get("/my",protect,authorize("EMPLOYEE","MANAGER"),getMyLeaves);
leave_routes.delete("/delete/:id",protect,authorize("EMPLOYEE","MANAGER"),deleteLeave);
leave_routes.put("/edit/:id",uploadJustificatif.single("document"),protect,authorize("EMPLOYEE","MANAGER"),editLeave);
leave_routes.get("/ListLeavePolicies",protect,authorize("MANAGER","ADMIN","EMPLOYEE","SUPERADMIN"),getPolicies);
leave_routes.post("/createLeavePolicy",protect,authorize("ADMIN","SUPERADMIN"),createLeavePolicy);
leave_routes.put("/editLeavePolicy/:id",protect,authorize("ADMIN","SUPERADMIN"),updateLeavePolicy);
leave_routes.delete("/deleteLeavePolicy/:id",protect,authorize("ADMIN","SUPERADMIN"),deleteLeavePolicy);
leave_routes.get("/myLeavePolicy",protect,authorize("EMPLOYEE","MANAGER","ADMIN","SUPERADMIN"),getMyLeavePolicy);
leave_routes.get("/stats/monthly",protect,authorize("EMPLOYEE","MANAGER","ADMIN","SUPERADMIN"),getMonthlyLeaveStats);
leave_routes.get("/stats/type",protect,authorize("EMPLOYEE","MANAGER","ADMIN","SUPERADMIN"),getLeaveTypeStats);


export default leave_routes;