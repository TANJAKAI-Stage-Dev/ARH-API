import { Request, Response } from "express";
import prisma from "../config/prismaClient";
import { io } from "../sockets/socketManager";
import { createNotification } from "./notification.controller";

export const createLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { policyId, startDate, endDate, reason } = req.body;
    const user = (req as any).user;

    const document = req.file ? `/uploads/justificatifs/${req.file.filename}` : null;

    const policy = await prisma.leavePolicy.findUnique({ where: { id: policyId } });
    if (!policy) return res.status(404).json({ message: "Type de congé introuvable" });

    const diffDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(diffDays)

    if(diffDays < 0) {
      return res.status(400).json({message:"La date fin doit etre après la date de début"});
    }

    let balance = await prisma.leaveBalance.findFirst({
      where: {userId:user.id,policyId},
    })

    //initiation
    if (!balance) {
      balance = await prisma.leaveBalance.create({
        data: {
          userId: user.id,
          policyId,
          totalDays: policy.annualBalance,
          remaining: policy.annualBalance,
          usedDays: 0,
        },
      });
    }
    
    if(balance.remaining < diffDays) {
      return res.status(400).json({message:"Solde de congé insuffisant"});
    }
    
    //deduction solde
    // await prisma.leaveBalance.update({
    //   where:{id:balance.id},
    //   data:{
    //     remaining:balance.remaining - diffDays,usedDays:balance.totalDays - balance.remaining},
    // });

    const status = policy.autoApproval ? "APPROVED" : "PENDING";

    const taken = await prisma.leaveRequest.findFirst({
      where:{
        userId:user.id,
        OR:[
          {
            startDate:{lte: new Date(endDate)},
            endDate:{gte: new Date(startDate)},
          },
        ],
        status:{in:["PENDING","APPROVED"]},
      },
    });

    if(taken){
      return res.status(400).json({message:"vous avez déjà une demande en attente ou approuvée sur cette période"});
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        user: { connect: { id: user.id } },
        policy:{connect:{id : policyId}},
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        document,
      },
      include: { 
        user: true,
        policy: true
      },
    });

    if (user.role === "EMPLOYEE") {
      const managers = await prisma.user.findMany({ where: { role: "MANAGER" } });
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });

      for (const manager of managers) {
        const notifManager = await createNotification(
          manager.id,
          "LEAVE_REQUEST" as any,
          `${leave.user.firstName} ${leave.user.lastName} a soumis une demande de congé.`,
          leave.id
        );
        io.to(manager.id).emit("notification", notifManager);
      }

      for (const admin of admins) {
        const notifAdmin = await createNotification(
          admin.id,
          "LEAVE_REQUEST" as any,
          `${leave.user.firstName} ${leave.user.lastName} a soumis une demande de congé.`,
          leave.id
        );
        io.to(admin.id).emit("notification", notifAdmin);
      }
    }

    if (user.role === "MANAGER") {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
      console.log("admin trouvé:",admins)

      for (const admin of admins) {
        const notif = await createNotification(
          admin.id,
          "LEAVE_REQUEST" as any,
          `${leave.user.firstName} ${leave.user.lastName} (manager) a soumis une demande de congé.`,
          leave.id
        );
        io.to(admin.id).emit("notification", notif);
      }
    }

    res.status(201).json({
      message: "Demande de congé envoyée avec succès",
      leave,
    });
  } catch (err) {
    console.error("Erreur lors de la création du congé :", err);
    res.status(500).json({ error: "Erreur lors de la création du congé" });
  }
};

export const approveLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.body; 
    if (!id) {
    return res.status(400).json({ message: "id requis" });
    }
    const user = (req as any).user; 

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!leave) {
      return res.status(404).json({ message: "Demande de congé non trouvée" });
    }

    if (user.role === "MANAGER" && leave.user.role !== "EMPLOYEE") {
      return res.status(403).json({ message: "Un manager ne peut approuver que les demandes des employés." });
    }

    if (user.role === "ADMIN" || user.role === "SUPERADMIN" && leave.user.role !== "MANAGER") {
      return res.status(403).json({ message: "Un admin ne peut approuver que les demandes des managers." });
    }

    if (user.role !== "MANAGER" && user.role !== "ADMIN") {
      return res.status(403).json({ message: "Vous n'avez pas l'autorisation pour approuver des congés." });
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
      },
      include: { user: true },
    });

    if(updatedLeave.user.id !==  user.id){
    const notif = await createNotification(
      updatedLeave.user.id,
      "LEAVE_APPROVED" as any,
      `Votre demande de congé a été approuvée par ${user.firstName} ${user.lastName}.`,
      leave.id
    );
    io.to(updatedLeave.user.id).emit("notification", notif);
    }

    // Déduction du solde ici
    const diffDays = Math.ceil(
      (leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const balance = await prisma.leaveBalance.findFirst({
      where: { userId: leave.userId, policyId: leave.policyId },
    });

    if(!balance || balance.remaining < diffDays) {
      return res.status(400).json({ message: "Solde insuffisant pour approbation" });
    }
    
    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        remaining: balance.remaining - diffDays,
        usedDays: balance.usedDays + diffDays,
      },
    });

    res.status(200).json({
      message: "Demande de congé approuvée avec succès",
      leave: updatedLeave,
    });
  } catch (error) {
    console.error("Erreur lors de l’approbation du congé :", error);
    res.status(500).json({ message: "Erreur serveur lors de l’approbation" });
  }
};

export const rejectLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
    return res.status(400).json({ message: "id requis" });
    }
    const user = (req as any).user;

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!leave) {
      return res.status(404).json({ message: "Demande de congé non trouvée" });
    }

    if (user.role === "MANAGER" && leave.user.role !== "EMPLOYEE") {
      return res.status(403).json({ message: "Un manager ne peut rejeter que les demandes des employés." });
    }

    if (user.role === "ADMIN" && leave.user.role !== "MANAGER") {
      return res.status(403).json({ message: "Un admin ne peut rejeter que les demandes des managers." });
    }

    if (user.role !== "MANAGER" && user.role !== "ADMIN") {
      return res.status(403).json({ message: "Vous n'avez pas l'autorisation pour rejeter des congés." });
    }

    
    // Récupération du solde correspondant
    const balance = await prisma.leaveBalance.findFirst({
      where: {
        userId: leave.userId,
        policyId: leave.policyId,
      },
    });

    if (balance) {
      const diffDays = Math.ceil(
        (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Restauration du solde
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { remaining: balance.remaining + diffDays },
      });
    }


    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        // approverId: user.id,
      },
      include: { user: true },
    });

  if(updatedLeave.user.id !==  user.id){
    const notif = await createNotification(
      updatedLeave.user.id,
      "LEAVE_REJECTED" as any,
      `Votre demande de congé a été rejetée par ${user.firstName} ${user.lastName}.`,
      leave.id
    );
    io.to(updatedLeave.user.id).emit("notification", notif);
  }

    res.status(200).json({
      message: "Demande de congé rejetée avec succès",
      leave: updatedLeave,
    });
  } catch (error) {
    console.error("Erreur lors du rejet du congé :", error);
    res.status(500).json({ message: "Erreur serveur lors du rejet" });
  }
};

export const getAllLeaveRequest = async (req: Request, res: Response) => {
  try {
    const leave = await prisma.leaveRequest.findMany({
      include:{
        user:{
          include:{team:true}
        },
        policy:true
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({message:"liste des demandes de congé",leave});
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getMyLeaves = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const leaves = await prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include:{policy:true}
    });
    res.json({ leave: leaves });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const editLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if(!id){
      return res.status(400).json({message:"id requis"});
    }
    const { policyId, startDate, endDate, reason} = req.body;
    const userId = (req as any).user.id;
    
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave || leave.userId !== userId) return res.status(403).json({ message: "Non autorisé" });
    if (leave.status !== "PENDING") return res.status(400).json({ message: "Impossible de modifier une demande traitée" });
    
    const document = req.file ? `/uploads/justificatifs/${req.file.filename}` : leave.document;
    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: { policy:{connect:{id: policyId}}, startDate:new Date(startDate), endDate:new Date(endDate), reason,document },
      include:{user:true,policy:true},
    });
    res.json(updatedLeave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const deleteLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if(!id){
      return res.status(400).json({message:"id requis"});
    }

    const userId = (req as any).user.id;

    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave || leave.userId !== userId) return res.status(403).json({ message: "Non autorisé" });
    if (leave.status !== "PENDING") return res.status(400).json({ message: "Impossible d'annuler une demande traitée" });

    
    // Récupération du solde
    const balance = await prisma.leaveBalance.findFirst({
      where: {
        userId: userId,
        policyId: leave.policyId,
      },
    });

    if (balance) {
      const diffDays = Math.ceil(
        (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Restauration du solde
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { remaining: balance.remaining + diffDays },
      });
    }

    await prisma.leaveRequest.delete({ where: { id } });
    res.json({ message: "Demande annulée" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// LEAVE POLICY

export const createLeavePolicy = async (req: Request, res: Response) => {
  try {
    const { type, annualBalance, autoApproval, description } = req.body;

    const existing = await prisma.leavePolicy.findFirst({ where: { type } });
    if (existing) return res.status(400).json({ message: "Type déjà existant" });

    const policy = await prisma.leavePolicy.create({
      data: { type, annualBalance:Number(annualBalance), autoApproval, description },
    });

    res.status(201).json({ message: "Politique créée", policy });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getPolicies = async (_req: Request, res: Response) => {
  try {
    const policies = await prisma.leavePolicy.findMany();
    res.json({message:"liste policies",policies});
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const updateLeavePolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if(!id){
      return res.status(400).json({message:"id requis"});
    }
    const { type, annualBalance, autoApproval, description } = req.body;

    const policy = await prisma.leavePolicy.update({
      where: { id },
      data: { type, annualBalance, autoApproval, description },
    });

    const balances = await prisma.leaveBalance.findMany({
      where:{policyId:policy.id},
    });

    for(const bal of balances){
      const used = bal.usedDays;
      const total = policy.annualBalance;

      const newRemaining = Math.max(total - used,0);

      await prisma.leaveBalance.update({
        where:{id:bal.id},
        data:{
          totalDays:total,
          remaining:newRemaining,
        },
      });

      await createNotification(bal.userId,"LEAVE_POLICY_UPDATE" as any,`Votre solde de congé pour "${policy.type}" a été mis à jour.`,policy.id);
    }

    res.status(200).json({ message: "Politique mise à jour", policy });
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const deleteLeavePolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if(!id){
      return res.status(400).json({message:"id requis"});
    }
    await prisma.leavePolicy.delete({ where: { id } });
    res.json({ message: "Politique supprimée" });
  } catch {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getMyLeavePolicy = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const policies = await prisma.leavePolicy.findMany();

    const balances = await prisma.leaveBalance.findMany({
      where: { userId: user.id },
    });

    const data = policies.map((policy) => {
      const balance = balances.find((b) => b.policyId === policy.id);
      return {
        id: policy.id,
        type: policy.type,
        description: policy.description,
        annualBalance: policy.annualBalance,
        autoApproval: policy.autoApproval,
        totalDays: balance ? balance.totalDays : policy.annualBalance,
        usedDays: balance ? balance.usedDays : policy.annualBalance,
        remaining: balance ? balance.remaining : policy.annualBalance,
      };
    });

    res.json({
      message: "Liste des politiques de congé avec soldes employés",
      policies: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
function getMonthsCoveredByLeave(startDate: Date, endDate: Date): string[] {
  const months: Set<string> = new Set();
  let current = new Date(startDate);

  while (current <= endDate) {
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
    months.add(key);

    current.setDate(current.getDate() + 1);
  }

  return Array.from(months);
}

export const getMonthlyLeaveStats = async (req: Request, res: Response) => {
  try {
    // Récupérer uniquement les congés approuvés
    const leaves = await prisma.leaveRequest.findMany({
      where: { status: "APPROVED" },
      select: { startDate: true, endDate: true },
    });

    // Compter le nombre de congés par mois
    const monthlyTotals: Record<string, number> = {};

    for (const leave of leaves) {
      const monthsCovered = getMonthsCoveredByLeave(leave.startDate, leave.endDate);

      for (const month of monthsCovered) {
        monthlyTotals[month] = (monthlyTotals[month] ?? 0) + 1;
      }
    }

    // Préparer les 12 mois de l'année en s'assurant que chaque mois existe
    const currentYear = new Date().getFullYear();
    const monthsOfYear = Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1).padStart(2, "0");
      return `${currentYear}-${month}`;
    });

    const chartData = monthsOfYear.map(month => ({
      month,
      count: monthlyTotals[month] ?? 0
    }));

    res.json({ months: chartData });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getLeaveTypeStats = async (_req: Request, res: Response) => {
  try {
    const currentYear = new Date().getFullYear();

    // 1) Récupérer tous les congés approuvés de l'année
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`),
        },
      },
      select: {
        policyId: true,
      },
    });

    // 2) Compter par type de congé
    const counts: Record<string, number> = {}; // CHANGEMENT ICI

    leaves.forEach((leave) => {
      const id = String(leave.policyId);
      counts[id] = (counts[id] ?? 0) + 1;
    });

    // 3) Récupérer les noms des policies
    const policies = await prisma.leavePolicy.findMany();

    const result = policies
      .map((policy) => ({
        name: policy.type, // Nom du type de congé
        count: counts[String(policy.id)] ?? 0,
      }))
      .filter((p) => p.count > 0); // On ne garde que ceux utilisés

    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};



