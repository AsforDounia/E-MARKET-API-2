import { User } from "../models/Index.js";
import { AppError } from "../middlewares/errorHandler.js";
import bcrypt from "bcryptjs";

async function getAllUsers(req, res, next) {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) throw new AppError("User not found", 404);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { fullname, email, password } = req.body;
    if (!fullname || !email || !password)
      throw new AppError("Fullname, email, and password are required", 400);

    const existingUser = await User.findOne({ email, deletedAt: null });
    if (existingUser) throw new AppError("Email already in use", 400);

    const role = req.body.role || "user";
    if (!["user", "admin"].includes(role))
      throw new AppError("Invalid role specified", 400);

    const user = await User.create({ fullname, email, password, role });
    res
      .status(201)
      .json({
        user: {
          id: user._id,
          fullname: user.fullname,
          email: user.email,
          role: user.role,
        },
      });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) throw new AppError("User not found", 404);
    user.deletedAt = new Date();
    await user.save();
    res.status(200).json({ message: "User soft-deleted" });
  } catch (err) {
    next(err);
  }
}

//recuperer l'utilisateur connecté
async function getUserProfile(req, res, next) {
  try {
    res.status(200).json(req.user);
  } catch (err) {
    next(err);
  }
}

//mettre à jour le profile de l'utilisateur connecté
async function updateProfile(req, res, next) {
  try {
    if (!req.user) {
      const err = new Error("Unauthenticated user");
      err.status = 401;
      throw err;
    }

    const { oldPassword, newPassword, ...updateData} = req.body;

    if(oldPassword && newPassword){
        //on verifier que l'ancien mot de passe est correct
        const isMatch = await bcrypt.compare(oldPassword, req.user.password);
        if (!isMatch){
            const err = new Error("Current password is incorrect");
            err.status = 400;
            throw err;
        }

        // hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        updateData.password = hashedPassword;
    }

    // Mettre à jour des autres info du profil
    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, { new: true, runValidators: true});
    
    res.status(200).json({
        message : "Profile updated successfully",
        updatedUser});
  } catch (err) {
    next(err);
  }
};

export {
  getAllUsers,
  getUserById,
  createUser,
  deleteUser,
  getUserProfile,
  updateProfile,
};
