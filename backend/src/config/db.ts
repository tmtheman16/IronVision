// src/config/db.ts

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/default-db";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, { dbName: process.env.DB_NAME });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
