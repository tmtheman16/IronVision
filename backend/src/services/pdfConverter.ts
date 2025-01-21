// pdfConverter.ts

import PDFDocument from "pdfkit";
import { Readable } from "stream";

/**
 * Interface representing the JSON model.
 */
interface ReportDetails {
  control: string;
  status: string;
}

interface ReportJSON {
  report_id: string;
  file_key: string;
  s3_url: string;
  processed_at: string;
  status: string;
  summary: string;
  details: ReportDetails[];
}

/**
 * Converts a JSON object to a PDF buffer.
 * @param reportData - The JSON data to convert.
 * @returns A promise that resolves to a Buffer containing the PDF.
 */
export async function convertJsonToPDF(
  reportData: ReportJSON
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });

      const buffers: Uint8Array[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Title
      doc.fontSize(20).text("Compliance Report", { align: "center" });
      doc.moveDown();

      // Report Metadata
      doc.fontSize(12).text(`Report ID: ${reportData.report_id}`);
      doc.text(
        `Processed At: ${new Date(reportData.processed_at).toLocaleString()}`
      );
      doc.text(`Status: ${reportData.status}`);
      doc.moveDown();

      // Summary
      doc.fontSize(14).text("Summary", { underline: true });
      doc.fontSize(12).text(reportData.summary);
      doc.moveDown();

      // Details Table
      doc.fontSize(14).text("Details", { underline: true });
      doc.moveDown(0.5);

      // Table Header
      const tableTop = doc.y;
      const itemX = 50;
      const controlX = 50;
      const statusX = 300;

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Control", controlX, tableTop);
      doc.font("Helvetica-Bold").text("Status", statusX, tableTop);
      doc.moveDown();

      // Table Rows
      reportData.details.forEach((detail, index) => {
        const y = tableTop + 25 + index * 20;
        doc.text(detail.control, controlX, y);
        doc.text(detail.status, statusX, y);
      });

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
