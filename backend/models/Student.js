import mongoose from "mongoose";
import User from "./User.js";

const studentSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    default: "",
  },
  semester: {
    type: Number,
    min: 1,
    max: 8,
  },
  gpa: {
    type: Number,
    default: 0,
  },
  enrolledSubjects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    },
  ],
});

// Create and export the Student discriminator
const Student = User.discriminator("student", studentSchema);
export default Student;
