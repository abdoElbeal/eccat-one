import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    date: { type: Date, required: true, default: Date.now },
    
    // Status of the session
    isActive: { type: Boolean, default: true },
    
    // The current active QR token (refreshes frequently)
    currentQrToken: { type: String },
    tokenExpiresAt: { type: Date },

    records: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["present", "absent", "late"], default: "absent" },
        markedAt: { type: Date },
        method: { type: String, enum: ["qr", "manual"], default: "manual" },
      }
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Attendance", attendanceSchema);
