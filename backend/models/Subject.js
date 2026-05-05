import mongoose from "mongoose";

const SubjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "doctor",
      default: null,
    },
    assignedTA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ta",
      default: null,
    },

    semester: {
      type: Number,
      min: 1,
      max: 8,
    },
    yearLevel: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 1,
    },

    academicYear: {
      type: String, // e.g. "2025/2026"
    },

    schedule: {
      days: [
        {
          type: String,
          enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        },
      ],
      startTime: String, // "10:00"
      endTime: String, // "12:00"
      room: String,
    },

    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    thumbnail: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Helpful indexes
// index on code is already created by unique:true above
SubjectSchema.index({ department: 1 });
SubjectSchema.index({ assignedDoctor: 1 });
SubjectSchema.index({ assignedTA: 1 });

export default mongoose.model("Subject", SubjectSchema);
