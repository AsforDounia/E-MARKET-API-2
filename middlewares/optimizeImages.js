import fs from "fs";
import path from "path";
import sharp from "sharp";

const optimizedDir = "./uploads/products/optimized"; 

// Vérifie que le dossier existe, sinon crée-le
if (!fs.existsSync(optimizedDir)) {
  fs.mkdirSync(optimizedDir, { recursive: true });
}

export async function optimizeImages(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) return next();

    await Promise.all(
     req.files.map(async (file) => {
       const inputPath = file.path;
       const outputPath = path.join(optimizedDir, file.filename);

       // Optimiser l'image avec Sharp
       await sharp(inputPath)
         .rotate() 
         .resize({ width: 1000 }) 
         .jpeg({ quality: 80 })
         .toFile(outputPath);

      // Supprimer le fichier original après optimisation
         fs.unlinkSync(inputPath);
         file.path = outputPath;
         file.filename = path.basename(outputPath);
         file.optimized = true;
     })
    );
    next();
  } catch (err) {
    console.error("Erreur d’optimisation image:", error);
    next(err);
  }
}