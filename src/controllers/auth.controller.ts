import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/prismaClient";
import { generateToken } from "../utils/generateToken";

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // const isPasswordValid = await bcrypt.compare(password, user.password);
    // if (!isPasswordValid) {
    //   return res.status(400).json({ message: "Invalid email or password" });
    // }

    const token = generateToken(user.id, user.role,user.avatarUrl ?? "");

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        contact:user.contact,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const SetupPwd = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Le mot de passe est requis." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        isActive:true
       },
    });

    res.status(200).json({ message: "Mot de passe défini avec succès." });
  } catch (error) {
    console.error("Erreur lors de la configuration du mot de passe :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
