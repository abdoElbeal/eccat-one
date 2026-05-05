import mongoose from "mongoose";

const gradeSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    // All scores stored as raw numbers; maxes are 20/30/50 = 100 total
    activities: { type: Number, default: 0, min: 0, max: 20 }, // out of 20
    midTerm:    { type: Number, default: 0, min: 0, max: 30 }, // out of 30
    final:      { type: Number, default: 0, min: 0, max: 50 }, // out of 50
    total:      { type: Number, default: 0, min: 0, max: 100 },
    maxTotal:   { type: Number, default: 100 },
    letterGrade: { type: String, default: "F" },
    status: {
      type: String,
      enum: ["passed", "failed", "incomplete"],
      default: "failed",
    },
    semester:     { type: String }, // e.g. "fall2024"
    academicYear: { type: String }, // e.g. "2025/2026"
  },
  { timestamps: true }
);

// Auto-compute total, letterGrade, status before every save
gradeSchema.pre("save", function () {
  this.total = Math.round(this.activities + this.midTerm + this.final);
  const pct = (this.total / this.maxTotal) * 100;

  if      (pct >= 97) this.letterGrade = "A+";
  else if (pct >= 93) this.letterGrade = "A";
  else if (pct >= 90) this.letterGrade = "A-";
  else if (pct >= 87) this.letterGrade = "B+";
  else if (pct >= 83) this.letterGrade = "B";
  else if (pct >= 80) this.letterGrade = "B-";
  else if (pct >= 77) this.letterGrade = "C+";
  else if (pct >= 73) this.letterGrade = "C";
  else if (pct >= 70) this.letterGrade = "C-";
  else if (pct >= 67) this.letterGrade = "D+";
  else if (pct >= 60) this.letterGrade = "D";
  else                this.letterGrade = "F";

  this.status = pct >= 60 ? "passed" : "failed";
});

export default mongoose.model("Grade", gradeSchema);
