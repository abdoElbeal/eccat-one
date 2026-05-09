import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    title:      { type: String, required: true, trim: true },
    subject:    { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    doctor:     { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },

    // Type: quiz (short ~15min), midterm, final, lab, oral
    type: {
      type: String,
      enum: ["quiz", "midterm", "final", "lab", "oral"],
      default: "quiz",
    },

    date:       { type: Date, required: true },
    time:       { type: String, required: true },          // "10:00"
    duration:   { type: Number, default: 60 },             // minutes
    location:   { type: String, default: "" },
    totalMarks: { type: Number, default: 20 },
    notes:      { type: String, default: "" },

    // Which groups this exam applies to
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],

    isVisible:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

examSchema.index({ subject: 1 });
examSchema.index({ doctor: 1 });
examSchema.index({ date: 1 });

export default mongoose.model("Exam", examSchema);
