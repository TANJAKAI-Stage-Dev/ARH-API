import { Request, Response } from "express";
import prisma from "../config/prismaClient";
import crypto from "crypto";
import { generateToken } from "../utils/generateToken";
import { sendSetupPwd } from "../utils/Email";

export const registerByAdmin = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, role, teamId } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet utilisateur existe déjà" });
    }

    const data: any = {
      firstName,
      lastName,
      email,
      contact:"",
      password: "123456", 
      role,
      avatarUrl: "",
    };

    // Si c'est un employé, on lui assigne un team
    if (role === "EMPLOYEE" && teamId) {
      data.teamId = teamId;
    }

    const user = await prisma.user.create({ data });

    const token = generateToken(user.id, user.role, user.avatarUrl ?? "");

    //await sendSetupPwd(user.email, user.firstName, token);

    return res.status(201).json({
      message: "Utilisateur créé. Email envoyé pour la configuration du mot de passe.",
      user,
      token,
    });
  } catch (error) {
    console.error("Erreur lors de la création du compte:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const getAllUser = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { team: true }, 
    });
    res.status(200).json({ message: "liste des utilisateurs", users });
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};