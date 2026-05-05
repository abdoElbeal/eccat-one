import mongoose from "mongoose";
import User from "./User.js";

const taSchema = new mongoose.Schema({
  specialization: {
    type: String,
    default: "",
  },
  degree: {
    type: String, // e.g., "Bachelor's", "Master's"
    default: "Bachelor's",
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "doctor",
  },
  teachingSections: [
    {
      type: String, // e.g., "Section 1", "Section 2"
    },
  ],
});

// Create and export the TA (Teaching Assistant) discriminator
const TA = User.discriminator("ta", taSchema);
export default TA;
