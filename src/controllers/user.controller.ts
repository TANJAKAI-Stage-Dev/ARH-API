import { Request, Response } from "express";
import prisma from "../config/prismaClient";

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; 

    const foundUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        firstName: true,
        lastName:true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!foundUser) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json(foundUser);
  } catch (error) {
    console.error("Erreur profil :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const updateAvatar = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; 

    if (!user) {
      return res.status(401).json({ message: "Utilisateur non trouvé dans le token" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier reçu" });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });

    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error("Erreur upload avatar:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

export const createTeam = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const team = await prisma.team.create({ data: { name, description } });
    res.status(201).json({ message: "Équipe créée", team });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const getTeams = async (req: Request, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: true,
        criteria: {
          include: { criteria: true },
        },
      },
    });
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const updateTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
    return res.status(400).json({ message: "id requis" });
    }
    const { name, description } = req.body;

    const updated = await prisma.team.update({
      where: { id },
      data: { name, description },
    });

    res.json({ message: "Équipe mise à jour", updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
    return res.status(400).json({ message: "id requis" });
    }

    await prisma.team.delete({ where: { id } });
    res.json({ message: "Équipe supprimée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const deleteUser = async(req: Request,res:Response)=>{
  try{
    const {userId} = req.params;
    if (!userId) {
    return res.status(400).json({ message: "id requis" });
    }

    const user = await prisma.user.findUnique({
      where:{id: userId}
    })

    if(!user){
      return res.status(404).json({message:"utilisateur introuvable"});
    }

    if(user.role === "SUPERADMIN"){
      return res.status(403).json({message:"impossible de supprimer un SUPERADMIN"});
    }

    await prisma.user.delete({
      where:{id:userId}
    });
    res.json({message:"Utilisateur supprimé avec succès"});
  }catch(error:any){
    console.error("erreur de suppression:",error);
    res.json(500).json({message:"erreur serveur",error:error.message});
  }
}

export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        contact: true,
      },
      orderBy: { firstName: "asc" }, 
    });

    res.json({ users: employees });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};