const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    content: { type: String, default: "" },
    // ✅ Image/file support
    messageType: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },
    imageUrl: { type: String, default: "" },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
