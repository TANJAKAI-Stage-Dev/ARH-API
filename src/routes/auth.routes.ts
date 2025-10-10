// src/routes/auth.routes.ts
import { Router } from "express";
import { registerEmployee, registerByAdmin, login } from "../controllers/auth.controller";
import { protect, authorize } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Gestion de l'authentification et des utilisateurs
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Enregistrer un utilisateur public (EMPLOYEE)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Employee registered successfully
 *       400:
 *         description: User already exists
 */
router.post("/register", registerEmployee);

/**
 * @swagger
 * /api/auth/register/admin:
 *   post:
 *     summary: Enregistrer un utilisateur par un admin (EMPLOYEE, MANAGER, ADMIN)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - role
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [EMPLOYEE, MANAGER, ADMIN]
 *     responses:
 *       201:
 *         description: User registered successfully by admin
 *       400:
 *         description: Invalid role or user already exists
 */
router.post("/register/admin", protect, authorize("ADMIN"), registerByAdmin);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion de l'utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid email or password
 */
router.post("/login", login);

export default router;
