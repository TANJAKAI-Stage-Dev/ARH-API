import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/justificatifs";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const uploadJustificatif = multer({
  storage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Format de fichier invalide. Formats acceptés: JPG, PNG, PDF, DOC, DOCX"));
    }
  },
});

export default uploadJustificatif;
