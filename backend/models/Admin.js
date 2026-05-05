import mongoose from "mongoose";
import User from "./User.js";

const adminSchema = new mongoose.Schema({
  permissions: {
    type: [String],
    default: ["all"],
  },
});

// Create and export the Admin discriminator
const Admin = User.discriminator("admin", adminSchema);
export default Admin;
