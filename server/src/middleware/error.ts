import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: "Please check the form and try again.",
      issues: err.flatten().fieldErrors,
    });
  }
  console.error(err);
  res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
}