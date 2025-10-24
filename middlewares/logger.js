// logger.js
import { createLogger, transports, format } from "winston";
import fs from "fs";
import path from "path";
import "winston-daily-rotate-file";

const { combine, timestamp, errors, json } = format;

// Créer un dossier "logs" s'il n'existe pas
const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Transport de rotation pour les logs généraux
const dailyRotateFileTransport = new transports.DailyRotateFile({
  dirname: logDir, // Dossier
  filename: "app-%DATE%.log", // Exemple : app-2025-10-23.log
  datePattern: "YYYY-MM-DD", // Rotation chaque jour
  zippedArchive: true, // Compresser les anciens fichiers (.gz)
  maxSize: "20m", // Taille max avant de créer un nouveau fichier
  maxFiles: "14d", // Conserver les fichiers pendant 14 jours
  level: "info",
});

// Transport de rotation pour les erreurs
const errorRotateFileTransport = new transports.DailyRotateFile({
  dirname: logDir,
  filename: "error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d", // garder plus longtemps les erreurs
  level: "error",
});

const logger = createLogger({
  level: "info",
  format: combine(errors({ stack: true }), timestamp(), json()),
  transports: [
    // Console
    new transports.Console(),
    dailyRotateFileTransport,
    errorRotateFileTransport,
  ],
});

export default logger;
