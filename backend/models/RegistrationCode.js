import mongoose from "mongoose";

const registerCodeSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    nationalId: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{14}$/, "National ID must be 14 digits"],
    },

    age: {
      type: Number,
      min: 15,
      max: 100,
    },

    address: {
      type: String,
      trim: true,
    },

    highSchoolName: {
      type: String,
      trim: true,
    },

    role: {
      type: String,
      enum: ["student", "doctor", "ta"],
      required: true,
    },
    yearLevel: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 1,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    // 👇 Final stored code (eccat-XXXXXXXX)
    code: {
      type: String,
      required: true,
      unique: true,
      match: [/^eccat-\d{8}$/, "Code must be in format eccat-XXXXXXXX"],
    },

    isUsed: {
      type: Boolean,
      default: false,
    },

    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    expiresAt: {
      type: Date,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

registerCodeSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

registerCodeSchema.virtual("status").get(function () {
  if (this.isUsed) return "used";
  if (this.expiresAt && this.expiresAt < Date.now()) return "expired";
  return "valid";
});

// ✅ Auto-generate code before saving
registerCodeSchema.pre("validate", async function () {
  if (this.code) return;

  let code;
  let exists = true;

  while (exists) {
    const random = Math.floor(10000000 + Math.random() * 90000000); // 8 digits
    code = `eccat-${random}`;
    exists = await mongoose.models.RegisterCode.findOne({ code });
  }

  this.code = code;
});

export default mongoose.model("RegisterCode", registerCodeSchema);
