import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    courseName: { type: String, required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String, default: "امتحان" }, // e.g. "نصفي", "نهائي"
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  },
  { timestamps: true }
);

export default mongoose.model("Exam", examSchema);
