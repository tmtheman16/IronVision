import { Request, Response } from "express";
import FileRecord from "../../models/fileRecord";
import { CustomRequest } from "../auth/auth.controller";
import mongoose from "mongoose";
import { execFile } from "child_process";
import path from "path";
import FileReport from "../../models/reportModel";
import {
  fetchFileFromS3,
  fetchJsonFromS3,
  uploadFileToS3,
} from "../../services/s3Services";
import { convertJsonToPDF } from "../../services/pdfConverter";
import { uuid } from "uuidv4";
import { convertJsonToDOCX } from "../../services/docConverter";

const escapeRegex = (text: string) =>
  text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
export class FileManagementController {
  async singleFileUpload(req: CustomRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      console.log("user", user);

      // Check if user exists
      if (!user) {
        res.status(403).json({
          messageCode: false,
          message: "User not found",
        });
        return;
      }

      // Check if file was provided
      if (!req.file) {
        res.status(400).json({
          messageCode: false,
          message: "No file uploaded",
        });
        return;
      }

      // Upload file to S3 using the separate function
      const uploadResult = await uploadFileToS3({
        fileBuffer: req.file.buffer,
        originalName: req.file.originalname,
        folderName: "uploads", // Optional: specify folder name
      });

      // Create a record in MongoDB
      const newRecord = new FileRecord({
        filename: req.file.originalname,
        s3Key: uploadResult.key,
        s3Url: uploadResult.url,
        fileType: req.file.mimetype,
        status: "Uploaded",
        userId: new mongoose.Types.ObjectId(user._id),
      });
      await newRecord.save();

      // Respond with success
      res.status(200).json({
        messageCode: true,
        message: "File uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading:", error);
      res.status(500).json({
        messageCode: false,
        message: error.message || "Server error",
      });
    } finally {
      // If needed, perform any cleanup here
      return;
    }
  }

  async analyzeFile(req: CustomRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { fileId } = req.body;

      // 1. Check if user exists
      if (!user) {
        res.status(403).json({
          messageCode: false,
          message: "User not found",
        });
        return;
      }

      // 2. Lookup the file record by ID
      const result = await FileRecord.findById(fileId);
      if (!result) {
        res.status(404).json({
          messageCode: false,
          message: "File not found",
        });
        return;
      }

      const { s3Key } = result;

      // 3. Build paths to the Python script and interpreter
      const pythonScriptPath = path.join(
        __dirname,
        "../../../scripts",
        "code.py"
      );
      const pythonInterpreter = path.join(
        __dirname,
        "../../../venv",
        "bin",
        "python"
      );

      // 4. Prepare arguments and define a helper to run the script
      const args = [pythonScriptPath, s3Key as string];

      function runScript(): Promise<string> {
        return new Promise((resolve, reject) => {
          execFile(pythonInterpreter, args, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error executing script: ${error.message}`);
              return reject(error);
            }
            // Just log stderr as a warning, do not reject
            if (stderr) {
              console.warn(`Script stderr: ${stderr}`);
            }
            console.log(`Script output: ${stdout}`);
            resolve(stdout);
          });
        });
      }

      // 5. Execute the script and parse the output
      const scriptOutput = await runScript();
      let parsedOutput;
      try {
        parsedOutput = JSON.parse(scriptOutput);
      } catch (err) {
        console.error("Error parsing JSON from script:", err);
        throw new Error("Invalid JSON returned by Python script");
      }

      const { report_key, report_url } = parsedOutput;

      // 6. Save a new FileReport
      const newRecord = new FileReport({
        report_key,
        report_url,
        fileId,
        type: "JSON",
      });
      const report = await newRecord.save();

      // 7. If report is successfully saved, update status and respond
      if (report) {
        await FileRecord.findByIdAndUpdate(fileId, { status: "Analyzed" });
        res.status(200).json({
          messageCode: true,
          message: "File analyzed successfully",
        });
        return;
      }

      // If we got here without returning, something unexpected happened:
      res.status(500).json({
        messageCode: false,
        message: "Server error while saving the report",
      });
    } catch (error: any) {
      console.error("Error analyzing file:", error);
      res.status(500).json({
        messageCode: false,
        message: error.message || "Server error",
      });
    } finally {
      // Optional cleanup logic here
      return Promise.resolve();
    }
  }

  async getFileRecords(req: CustomRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      // Check if user exists
      if (!user) {
        res.status(403).json({
          messageCode: false,
          message: "User not found",
        });
        return;
      }
      const fileRecords = await FileRecord.find({ userId: user._id })
        .select("_id filename status createdAt")
        .sort({ createdAt: -1 });
      res.status(200).json({
        messageCode: true,
        message: "File records retrieved successfully",
        data: fileRecords,
      });
    } catch (error: any) {
      console.error("Error getting file records:", error);
      res.status(500).json({
        messageCode: false,
        message: error.message || "Server error",
      });
    }
  }
  async getReports(req: CustomRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { search = "", orderby = "", formate = "" } = req.query; // Default to empty string if not provided

      if (!user) {
        res.status(403).json({
          messageCode: false,
          message: "User not found",
        });
        return;
      }

      const filenameRegex = new RegExp(escapeRegex(search as string), "i");

      const fileReports = await FileReport.aggregate([
        {
          $lookup: {
            from: "filerecords",
            localField: "fileId",
            foreignField: "_id",
            as: "fileRecord",
          },
        },
        { $unwind: "$fileRecord" },
        {
          $match: {
            "fileRecord.userId": new mongoose.Types.ObjectId(user._id),
            "fileRecord.filename": { $regex: filenameRegex },
            ...(formate ? { type: formate } : {}),
          },
        },
        {
          $sort: { createdAt: orderby === "ASC" ? 1 : -1 },
        },
        {
          $project: {
            _id: 1,
            createdAt: 1,
            type: 1,
            filename: "$fileRecord.filename",
          },
        },
      ]);

      res.status(200).json({
        messageCode: true,
        message: "File reports retrieved successfully",
        data: fileReports,
      });
    } catch (error: any) {
      console.error("Error getting file reports:", error);
      res.status(500).json({
        messageCode: false,
        message: error.message || "Server error",
      });
    }
  }
  async getAnalyzedFileRecords(
    req: CustomRequest,
    res: Response
  ): Promise<void> {
    try {
      const user = req.user;
      // Check if user exists
      if (!user) {
        res.status(403).json({
          messageCode: false,
          message: "User not found",
        });
        return;
      }
      const fileRecords = await FileRecord.find({ userId: user._id })
        .where("status", "Analyzed")
        .select("_id filename status createdAt")
        .sort({ createdAt: -1 });
      res.status(200).json({
        messageCode: true,
        message: "File records retrieved successfully",
        data: fileRecords,
      });
    } catch (error: any) {
      console.error("Error getting file records:", error);
      res.status(500).json({
        messageCode: false,
        message: error.message || "Server error",
      });
    }
  }
  async viewAnalyzeFile(req: Request, res: Response) {
    try {
      const { fileId } = req.body;

      if (!fileId) {
        return res.status(400).json({ message: "Missing fileId." });
      }

      const fileRecord = await FileReport.findOne({ fileId }).select(
        "_id report_key"
      );
      if (!fileRecord) {
        return res.status(404).json({ message: "File record not found." });
      }

      if (!fileRecord.report_key) {
        return res
          .status(500)
          .json({ message: "Report key not found in record." });
      }

      const jsonData = await fetchJsonFromS3(fileRecord.report_key);

      res.status(200).json(jsonData);
    } catch (error: any) {
      console.error("Error in viewAnalyzeFile:", error);
      res.status(500).json({
        message: error.message || "Server error",
      });
    }
  }

  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, reportType } = req.body;

      // Validate input
      if (!fileId || !reportType) {
        res.status(400).json({ message: "Missing fileId or reportType." });
        return;
      }

      // Validate reportType
      const validReportTypes = ["PDF", "DOCX", "JSON"];
      if (!validReportTypes.includes(reportType)) {
        res.status(400).json({
          message: `Invalid reportType. Must be one of: ${validReportTypes.join(
            ", "
          )}.`,
        });
        return;
      }

      // Check if the report already exists
      const existingReport = await FileReport.findOne({
        fileId,
        type: reportType,
      }).select("_id report_key report_url");

      if (existingReport) {
        // Report exists, fetch it from S3 and send to client
        const reportBuffer = await fetchFileFromS3({
          key: existingReport.report_key,
        });

        if (!reportBuffer) {
          res.status(404).json({ message: "Report file not found in S3." });
          return;
        }

        // Set appropriate headers based on reportType
        if (reportType === "PDF") {
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=report_${fileId}.pdf`
          );
        } else if (reportType === "DOCX") {
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          );
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=report_${fileId}.docx`
          );
        }

        res.send(reportBuffer);
        return;
      }

      // Report does not exist, generate it
      // Fetch the JSON report record
      const jsonRecord = await FileReport.findOne({
        fileId,
        type: "JSON",
      }).select("_id report_key");

      if (!jsonRecord || !jsonRecord.report_key) {
        res.status(404).json({ message: "JSON file record not found." });
        return;
      }

      // Fetch JSON data from S3
      const jsonBuffer = await fetchJsonFromS3(jsonRecord.report_key);

      if (!jsonBuffer) {
        res.status(404).json({ message: "JSON data not found in S3." });
        return;
      }

      // Parse JSON data
      const jsonData = jsonBuffer;
      // Convert JSON to desired report type
      let reportBuffer: Buffer;
      let fileName: string;

      if (reportType === "PDF") {
        reportBuffer = await convertJsonToPDF(jsonData);
        fileName = `${uuid()}.pdf`;
      } else {
        // DOCX
        reportBuffer = await convertJsonToDOCX(jsonData);
        fileName = `${uuid()}.docx`;
      }

      // Upload the generated report to S3
      const uploadResult = await uploadFileToS3({
        fileBuffer: reportBuffer,
        originalName: fileName,
        folderName: "report",
      });

      if (!uploadResult) {
        res.status(500).json({ message: "Failed to upload the report to S3." });
        return;
      }

      // Save the new report record in MongoDB
      const newReport = new FileReport({
        fileId,
        type: reportType,
        report_key: uploadResult.key,
        report_url: uploadResult.url,
      });

      await newReport.save();

      // Set appropriate headers and send the file to the client
      if (reportType === "PDF") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=report_${fileId}.pdf`
        );
      } else if (reportType === "DOCX") {
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=report_${fileId}.docx`
        );
      }

      res.send(reportBuffer);
    } catch (error: any) {
      console.error("Error generating report:", error);
      res.status(500).json({
        message: error.message || "Server error",
      });
    }
  }
  async downloadReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.body;

      // Check if the report already exists
      const existingReport = await FileReport.findOne({
        _id: new mongoose.Types.ObjectId(reportId),
      }).select("_id report_key report_url type");

      if (existingReport) {
        // Report exists, fetch it from S3 and send to client
        const reportBuffer = await fetchFileFromS3({
          key: existingReport.report_key,
        });

        if (!reportBuffer) {
          res.status(404).json({ message: "Report file not found in S3." });
          return;
        }

        // Set appropriate headers based on reportType
        if (existingReport.type === "PDF") {
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=report_${reportId}.pdf`
          );
        } else if (existingReport.type === "DOCX") {
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          );
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=report_${reportId}.docx`
          );
        }

        res.send(reportBuffer);
        return;
      } else {
        res.status(404).json({
          messageCode: false,
          message: "Report not found",
        });
      }
    } catch (error: any) {
      console.error("Error generating report:", error);
      res.status(500).json({
        message: error.message || "Server error",
      });
    }
  }

  getFileRecordCounts = async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        res.status(404).json({
          messageCode: false,
          message: "User not found",
        });
        return;
      }
      const result = await FileRecord.aggregate([
        {
          $match: { userId: new mongoose.Types.ObjectId(user._id) },
        },
        {
          $group: {
            _id: "$status", // Group by 'status'
            count: { $sum: 1 }, // Count the number of occurrences
          },
        },
      ]);

      const counts = result.reduce((acc: any, curr: any) => {
        acc[curr._id] = curr.count; // Populate an object with counts for each status
        return acc;
      }, {});

      // Ensure all possible statuses are included
      const countData = {
        uploaded: counts.Uploaded || 0,
        analyzed: counts.Analyzed || 0,
      };
      res.status(200).json({
        messageCode: true,
        message: "File record counts retrieved successfully",
        data: countData,
      });
      return countData;
    } catch (err: any) {
      res.status(500).json({
        messageCode: false,
        message: err.message || "Server error",
      });
      console.error("Error counting file records:", err);
    }
  };

  // Call the function
}

export default new FileManagementController();
