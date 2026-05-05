import mongoose from "mongoose";
import User from "./User.js";

const doctorSchema = new mongoose.Schema({
  specialization: {
    type: String,
    default: "",
  },
  title: {
    type: String, // e.g. "Professor", "Assistant Professor"
    default: "Doctor",
  },
  officeLocation: {
    type: String,
    default: "",
  },
  teachingSubjects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    },
  ],
});

// Create and export the Doctor discriminator
const Doctor = User.discriminator("doctor", doctorSchema);
export default Doctor;
