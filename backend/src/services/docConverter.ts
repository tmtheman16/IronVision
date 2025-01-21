// docxConverter.ts

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} from "docx";

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
 * Converts a JSON object to a DOCX buffer.
 * @param reportData - The JSON data to convert.
 * @returns A promise that resolves to a Buffer containing the DOCX.
 */
export async function convertJsonToDOCX(
  reportData: ReportJSON
): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: "Compliance Report",
            heading: "Heading1",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }), // Empty paragraph for spacing

          // Report Metadata
          new Paragraph({
            children: [
              new TextRun({ text: `Report ID: `, bold: true }),
              new TextRun(reportData.report_id),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Processed At: `, bold: true }),
              new TextRun(new Date(reportData.processed_at).toLocaleString()),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Status: `, bold: true }),
              new TextRun(reportData.status),
            ],
          }),
          new Paragraph({ text: "" }),

          // Summary
          new Paragraph({
            text: "Summary",
            heading: "Heading2",
          }),
          new Paragraph(reportData.summary),
          new Paragraph({ text: "" }),

          // Details Table
          new Paragraph({
            text: "Details",
            heading: "Heading2",
          }),
          createDetailsTable(reportData.details),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * Creates a table for the details section.
 * @param details - Array of control details.
 * @returns A Table object.
 */
function createDetailsTable(details: ReportDetails[]): Table {
  const headerRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ text: "Control" })],
      }),
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ text: "Status" })],
      }),
    ],
  });

  const dataRows = details.map(
    (detail) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph(detail.control)],
          }),
          new TableCell({
            children: [new Paragraph(detail.status)],
          }),
        ],
      })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: "single", size: 1, color: "000000" },
      bottom: { style: "single", size: 1, color: "000000" },
      left: { style: "single", size: 1, color: "000000" },
      right: { style: "single", size: 1, color: "000000" },
      insideHorizontal: { style: "single", size: 1, color: "000000" },
      insideVertical: { style: "single", size: 1, color: "000000" },
    },
  });
}
