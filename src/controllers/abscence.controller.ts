import { Request, Response } from "express";
import prisma from "../config/prismaClient";
import { createNotification } from "./notification.controller";
import { io } from "../sockets/socketManager";

export const createAbsence = async (req: Request, res: Response) => {
  try {
    const { employeeId, type, startDate, endDate, comment } = req.body;
    const managerId = (req as any).user.id;
    
    if (!employeeId || !type || !startDate || !endDate) {
      return res.status(400).json({ message: "Champs requis manquants" });
    }

    const validTypes = ["JUSTIFIED", "UNJUSTIFIED", "MEDICAL"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Type d'absence invalide" });
    }

    const absence = await prisma.absence.create({
      data: {
        employeeId,
        managerId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        comment
      }
    });

    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ message: "Employé introuvable" });

    const notif = await createNotification(
      employee.id,
      "ABSENCE_DECLARED" as any,
      `Votre dernière abscence a été noter.`,
      absence.id
    );

    io.to(employee.id).emit("notification", notif);

    res.status(201).json({ message: "Absence ajoutée", absence });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getAllAbsences = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    let absences;

    if (user.role === "ADMIN") {
      absences = await prisma.absence.findMany({
        include: { employee: true, manager: true },
        orderBy: { startDate: "desc" }
      });
    } else if (user.role === "MANAGER") {
      absences = await prisma.absence.findMany({
        where: { managerId: user.id },
        include: { employee: true },
        orderBy: { startDate: "desc" }
      });
    } else {
      absences = await prisma.absence.findMany({
        where: { employeeId: user.id },
        include: { manager: true },
        orderBy: { startDate: "desc" }
      });
    }

    res.json(absences);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getAbsenceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if(!id){
      return res.status(400).json({message:"id requis"})
    }
    const absence = await prisma.absence.findUnique({
      where: { id },
      include: { employee: true, manager: true }
    });

    if (!absence) return res.status(404).json({ message: "Absence introuvable" });

    res.json(absence);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const updateAbsence = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if(!id){
      return res.status(400).json({message:"id requis"})
    }
    const { type, startDate, endDate, comment } = req.body;

    const absence = await prisma.absence.update({
      where: { id },
      data: {
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        comment
      }
    });

    res.json({ message: "Absence modifiée", absence });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const deleteAbsence = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if(!id){
      return res.status(400).json({message:"id requis"})
    }
    await prisma.absence.delete({ where: { id } });

    res.json({ message: "Absence supprimée" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

