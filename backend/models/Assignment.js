import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  submittedAt:  { type: Date, default: Date.now },
  fileUrl:      { type: String, default: "" },       // path to uploaded PDF
  fileName:     { type: String, default: "" },
  submissionType: { type: String, enum: ["pdf", "paper"], default: "pdf" },
  notes:        { type: String, default: "" },
  grade:        { type: Number, default: null },      // doctor grades after review
  feedback:     { type: String, default: "" },
  status:       { type: String, enum: ["submitted", "late", "graded"], default: "submitted" },
});

const assignmentSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    subject:     { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    doctor:      { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },

    // Assignment type: paper = student hands in physical paper, pdf = upload file
    assignmentType: {
      type: String,
      enum: ["pdf", "paper"],
      default: "pdf",
    },

    dueDate:     { type: Date, required: true },
    maxGrade:    { type: Number, default: 10 },

    // Target: which groups/students
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],

    submissions: [submissionSchema],

    isVisible:   { type: Boolean, default: true },  // doctor can hide/show
  },
  { timestamps: true }
);

assignmentSchema.index({ subject: 1 });
assignmentSchema.index({ doctor: 1 });
assignmentSchema.index({ dueDate: 1 });

export default mongoose.model("Assignment", assignmentSchema);
