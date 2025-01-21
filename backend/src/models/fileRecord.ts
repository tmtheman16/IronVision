const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    s3Key: {
      type: String,
      required: true,
    },
    s3Url: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Uploaded", "Analyzed", "Processing"],
      default: "processing",
    },
  },
  {
    timestamps: true,
  }
);

const FileRecord = new mongoose.model("FileRecord", fileSchema);

export default FileRecord;
