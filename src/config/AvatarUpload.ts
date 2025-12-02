import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/avatars");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Format de fichier invalide"));
    }
  },
});

export default upload;
