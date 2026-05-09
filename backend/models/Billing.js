import mongoose from "mongoose";

const billingSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    academicYear: {
      type: String,
      required: true, // e.g., "2025/2026"
    },
    semester: {
      type: String,
      enum: ["الخريف", "الربيع", "الصيف", "سنوي"],
      required: true,
    },
    type: {
      type: String,
      enum: ["رسوم قيد واتحاد", "مصاريف الترم", "أخرى"],
      required: true,
    },
    title: {
      type: String, // e.g., "مصاريف ترم الخريف 2025"
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    dueDate: {
      type: Date,
    },
    transactions: [
      {
        amount: Number,
        date: { type: Date, default: Date.now },
        receiptNumber: String,
        notes: String,
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // Admin who recorded it
        },
      },
    ],
  },
  { timestamps: true }
);

// Auto-update status when paidAmount changes
billingSchema.pre("save", function (next) {
  if (this.paidAmount >= this.amount) {
    this.status = "paid";
    this.paidAmount = this.amount; // Prevent overpayment in status logic
  } else if (this.paidAmount > 0) {
    this.status = "partial";
  } else {
    this.status = "unpaid";
  }
  next();
});

export default mongoose.model("Billing", billingSchema);
