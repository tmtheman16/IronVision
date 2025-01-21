// routes/upload.js

import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import fileManagementController from "./fileManagement.controller";
import expressAsyncHandler from "express-async-handler";
import { verifyUser } from "../../middleware/verfyUser";
import { CustomRequest } from "../auth/auth.controller";

const fileManagement = express.Router();

// Configure Multer (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // Limit files to 50MB
});

fileManagement.get(
  "/statics",
  expressAsyncHandler(verifyUser),
  expressAsyncHandler(async (req: CustomRequest, res, next) => {
    try {
      await fileManagementController.getFileRecordCounts(req, res);
    } catch (error) {
      next(error);
    }
  })
);
// Single-file upload endpoint
fileManagement.post(
  "/upload",
  expressAsyncHandler(verifyUser),
  [upload.single("file")],
  expressAsyncHandler(async (req: CustomRequest, res, next) => {
    try {
      await fileManagementController.singleFileUpload(req, res);
    } catch (error) {
      next(error);
    }
  })
);

fileManagement.post(
  "/analyze",
  expressAsyncHandler(verifyUser),
  expressAsyncHandler(async (req: CustomRequest, res, next) => {
    try {
      await fileManagementController.analyzeFile(req, res);
    } catch (error) {
      next(error);
    }
  })
);

fileManagement.get(
  "/get-file-records",
  expressAsyncHandler(verifyUser),
  expressAsyncHandler(async (req: CustomRequest, res, next) => {
    try {
      await fileManagementController.getFileRecords(req, res);
    } catch (error) {
      next(error);
    }
  })
);

fileManagement.get(
  "/reports",
  expressAsyncHandler(verifyUser),
  expressAsyncHandler(async (req: CustomRequest, res, next) => {
    try {
      await fileManagementController.getReports(req, res);
    } catch (error) {
      next(error);
    }
  })
);
fileManagement.get(
  "/get-file-analysis-records",
  expressAsyncHandler(verifyUser),
  expressAsyncHandler(async (req: CustomRequest, res, next) => {
    try {
      await fileManagementController.getAnalyzedFileRecords(req, res);
    } catch (error) {
      next(error);
    }
  })
);

fileManagement.post(
  "/analyze-file",
  expressAsyncHandler(verifyUser),
  expressAsyncHandler(async (req: CustomRequest, res, next) => {
    try {
      await fileManagementController.viewAnalyzeFile(req, res);
    } catch (error) {
      next(error);
    }
  })
);

fileManagement.post(
  "/generate-report",
  expressAsyncHandler(verifyUser),
  expressAsyncHandler(async (req: CustomRequest, res, next) => {
    try {
      await fileManagementController.generateReport(req, res);
    } catch (error) {
      next(error);
    }
  })
);

fileManagement.post(
  "/download-report",
  expressAsyncHandler(verifyUser),
  expressAsyncHandler(async (req: CustomRequest, res, next) => {
    try {
      await fileManagementController.downloadReport(req, res);
    } catch (error) {
      next(error);
    }
  })
);

export default fileManagement;
