// index.ts

import express, { Application } from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import multer from "multer";
import cors from "cors";
import connectDB from "./src/config/db";
// import userRoutes from "./src/routes/userRoutes";
import errorHandler from "./src/middleware/errorHandler";
import { initializeRoutes } from "./src/routes/routes";
import corsOptions from "./src/config/corsOptions";

dotenv.config();

// Connect to MongoDB
connectDB()
  .then(() => {
    const app: Application = express();

    // Middleware
    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Multer setup for file uploads
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, "uploads/"); // Ensure this directory exists
      },
      filename: function (req, file, cb) {
        // Use the original name; you might want to change this in production
        cb(null, Date.now() + "-" + file.originalname);
      },
    });
    const upload = multer({ storage });

    // Example route for file upload
    app.post("/api/upload", upload.single("file"), (req, res) => {
      res.status(200).json({ success: true, file: req.file });
    });
    app.get("/", (req, res) => {
      res.status(200).json({ message: "application is running" });
    });
    // Routes
    // app.use("/api/users", userRoutes);

    // Serve static files (e.g., uploaded files)
    // app.use("/uploads", express.static(path.join(__dirname, "uploads")));

    // Error Handling Middleware
    app.use(errorHandler);

    // Create HTTP server
    const PORT = process.env.PORT || 5000;
    // const server = http.createServer(app);
    // server.close();
    initializeRoutes(app);
    // Initialize Socket.io
    // initializeSocket(server);

    // Start Server
    app.listen(parseInt(PORT as string, 10), "0.0.0.0", () => {
      console.log(`Backend server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error);
  });
