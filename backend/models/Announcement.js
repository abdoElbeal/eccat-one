import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, trim: true },
    source: { type: String, default: "إدارة الكلية", trim: true },

    // Who sees it
    targetAudience: {
      type: String,
      enum: ["all", "students", "doctors", "ta", "staff", "group"],  // staff = doctors + ta
      default: "all",
    },

    // Optional: specific group or department
    targetGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    targetDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },

    // Priority affects display color
    priority: {
      type: String,
      enum: ["normal", "important", "urgent"],
      default: "normal",
    },

    // Category
    type: {
      type: String,
      enum: ["general", "academic", "exam", "holiday", "warning"],
      default: "general",
    },

    // Pinned to top
    isPinned: { type: Boolean, default: false },

    // Soft-delete (archive instead of real delete)
    isActive: { type: Boolean, default: true },

    // Who created it
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);
