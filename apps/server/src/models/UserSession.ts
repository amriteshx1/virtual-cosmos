import mongoose from "mongoose";

const userSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "Traveler" },
    avatarColor: { type: String, default: "#6c5ce7" },
    lastPosition: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "user_sessions" },
);

export const UserSession =
  mongoose.models.UserSession ?? mongoose.model("UserSession", userSessionSchema);
