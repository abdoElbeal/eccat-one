import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String, // e.g. "Create Schedule", "Add Student", "Generate Code"
      required: true,
    },
    details: {
      type: String, // e.g. "Added Group A into the schedule"
    },
    type: {
      type: String,
      enum: ["blue", "purple", "gray", "red", "green"],
      default: "blue",
    }
  },
  { timestamps: true }
);

export default mongoose.model("Activity", activitySchema);
