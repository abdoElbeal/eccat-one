import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    yearLevel: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 1,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    role: {
      type: String,
      enum: ["student", "doctor", "admin", "ta"],
      required: true,
    },

    // Authentication credentials
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+\@.+\..+/, "Please fill a valid email address"],
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // Link back to the registration code
    registrationCode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RegisterCode",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    verifyCode: {
      type: String,
    },
    verifyCodeExpiresAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
    },
    profileImage: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    discriminatorKey: "role",
  },
);

// ✅ Virtual fullName
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.model("User", userSchema);
