import { Request, Response } from "express";
import prisma from "../config/prismaClient";
import { NotificationType } from "@prisma/client";

export const getUserNotifications = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "userId requis" });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


export const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.body;
  if(!id){
    return res.status(400).json({message:"id requis"});
  }

  try {
    const notif = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.status(200).json(notif);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la notification:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  const { id } = req.params;
  if(!id){
    return res.status(400).json({message:"id requis"});
  }

  try {
    await prisma.notification.delete({
      where: { id },
    });

    res.status(200).json({ message: "Notification supprimée" });
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


export const createNotification = async (userId: string, type: NotificationType, message: string,targetId:string) => {
  try {
    const notif = await prisma.notification.create({
      data: { userId, type, message,targetId },
    });
    return notif;
  } catch (error) {
    console.error("Erreur lors de la création de la notification:", error);
    throw error;
  }
};
