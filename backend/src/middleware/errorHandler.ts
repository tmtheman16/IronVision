// src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from "express";

interface ErrorWithStatus extends Error {
  status?: number;
}

const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    messageCode: false,
    message: err.message || "Server Error",
  });
};

export default errorHandler;
