// models/FileReport.js

import { timeStamp } from "console";

const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    report_key: {
      type: String,
      required: true,
    },
    report_url: {
      type: String,
      required: true,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FileRecord",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["JSON", "PDF", "DOCX"],
    },
  },
  {
    timestamps: true,
  }
);

const FileReport = new mongoose.model("FileReport", fileSchema);

export default FileReport;
