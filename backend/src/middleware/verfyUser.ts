// verifyUser.ts
import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { IUserDetails, User } from "../models/users";
import { CustomRequest } from "../modules/auth/auth.controller";

// Promisify the verify function
function verifyToken(token: string, secret: string) {
  return new Promise<any>((resolve, reject) => {
    verify(token, secret, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      resolve(decoded);
    });
  });
}

export async function verifyUser(
  req: CustomRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies["__IRONVISION__TK"];

    if (!token) {
      res.status(401).json({
        messageCode: false,
        message: "Unauthorized access",
      });
      return;
    }

    const decoded = await verifyToken(
      token,
      process.env.JWT_SECRET_KEY as string
    );

    if (typeof decoded === "object" && decoded.email) {
      const { email } = decoded;
      const user = await User.findOne({ email }).select(
        "_id email password firstName lastName role"
      );

      if (!user) {
        res.status(409).json({
          messageCode: false,
          message: "Unauthorized access",
        });
        return;
      }

      // Attach the user information to the request object
      req.user = {
        email: user.email,
        role: user.role,
        _id: user ? (user as IUserDetails)?._id?.toString() ?? "" : "",
      };

      // Proceed to the next middleware or route handler
      next();
    } else {
      res.status(401).json({
        messageCode: false,
        message: "Invalid token payload",
      });
      return;
    }
  } catch (error) {
    // Handle specific JWT errors if necessary
    res.status(401).json({
      messageCode: false,
      message: "Token is invalid or expired",
    });
    return;
  }
}
