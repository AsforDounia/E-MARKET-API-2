import express from "express";
import fs from "fs";
import path from "path";
import {authorize, authenticate} from "../../../middlewares/auth.js";

const router = express.Router();

const logsDir = path.join(process.cwd(), "logs");

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /admin/logs:
 *   get:
 *     summary: View recent server logs
 *     description: Allows an admin to view the last lines from the latest log file.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 file:
 *                   type: string
 *                   example: app-2025-10-31.log
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - "[2025-10-31 10:21:45] INFO: Server started on port 3000"
 *                     - "[2025-10-31 10:22:10] ERROR: MongoDB connection failed"
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error while reading logs
 */

router.get("/logs", authenticate, authorize(["admin"]), async (req, res) => {
    try {
        const files = fs
            .readdirSync(logsDir)
            .filter((file) => file.endsWith(".log"))
            .sort()
            .reverse();

        if (files.length === 0) {
            return res.status(404).json({ message: "No log files found" });
        }

        // Lire le dernier fichier de logs (le plus récent)
        const latestLogFile = path.join(logsDir, files[0]);
        const data = fs.readFileSync(latestLogFile, "utf8");

        // garde les 100 dernières lignes pour ne pas surcharger la réponse
        const lines = data.trim().split("\n");
        const lastLines = lines.slice(-100);

        res.json({
            file: files[0],
            logs: lastLines,
        });
    } catch (error) {
        console.error("Error reading logs:", err);
        res.status(500).json({ message: "Error while reading log files" });
    }
});

export default router;
