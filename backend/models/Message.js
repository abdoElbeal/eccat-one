import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        name: String,
        url: String,
        type: { type: String }, // e.g. "image", "file"
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    conversationId: {
      type: String, // Typically "minId-maxId" to group messages between two users
      index: true,
    },
  },
  { timestamps: true }
);

// Pre-save to ensure conversationId is set
messageSchema.pre("save", function (next) {
  if (this.sender && this.recipient) {
    const ids = [this.sender.toString(), this.recipient.toString()].sort();
    this.conversationId = ids.join("-");
  }
  next();
});

export default mongoose.model("Message", messageSchema);
