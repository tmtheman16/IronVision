import e, { Request, Response, NextFunction } from "express";
import { IUserDetails, User } from "../../models/users";
import { compare } from "bcryptjs";
import { generateToken } from "../utils/authUtils";
import { verify } from "jsonwebtoken";

export interface CustomRequest extends Request {
  user?: { email: string; role: string; _id: string };
}
class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          messageCode: false,
          message: "Email and password are required",
        });
        return;
      }

      const user = await User.findOne({ email }).select(
        "_id email password  firstName lastName role"
      );
      if (!user) {
        res.status(401).json({
          messageCode: false,
          message: "Invalid email or password",
        });
        return;
      }

      const isPasswordValid = await compare(password, user.password);

      if (!isPasswordValid) {
        res.status(401).json({
          messageCode: false,
          message: "Invalid email or password",
        });
        return;
      }

      const token = generateToken(user as IUserDetails);
      const {
        email: userEmail,
        role,
        firstName,
        lastName,
      } = user as {
        email: string;
        role: string;
        firstName: string;
        lastName: string;
      };
      res.cookie("__IRONVISION__TK", token, {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "lax" : "none",
        secure: process.env.NODE_ENV !== "production",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      });

      res.json({
        messageCode: false,
        message: "Logged in successfully",
        data: { email: userEmail, role, firstName, lastName },
      });
      return;
    } catch (error) {
      console.error("login error", error);
      next(error);
    }
  }
  async authVerify(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies["__IRONVISION__TK"];

      if (!token) {
        res.status(401).json({
          messageCode: false,
          message: "Unauthorized access",
        });
        return;
      }
      verify(
        token,
        process.env.JWT_SECRET_KEY as string,
        async (err: any, decoded: any) => {
          if (err) {
            res.status(401).json({
              messageCode: false,
              message: "Token is invalid or expired",
            });
            return;
          }
          // console.log("decode", decoded);
          if (typeof decoded === "object") {
            // verify token data
            const { email } = decoded;
            const user = await User.findOne({ email }).select(
              "email password  firstName lastName role"
            );
            if (!user) {
              res.status(409).json({
                messageCode: false,
                message: "Unauthorized access",
              });
            }
            const {
              email: userEmail,
              role,
              firstName,
              lastName,
            } = user as {
              email: string;
              role: string;
              firstName: string;
              lastName: string;
            };
            res.status(200).json({
              messageCode: true,
              message: "Token is valid",
              data: { email: userEmail, role, firstName, lastName },
            });
          }
        }
      );
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.cookie("__IRONVISION__TK", "", { maxAge: 0 });
      res.clearCookie("__IRONVISION__TK");
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
