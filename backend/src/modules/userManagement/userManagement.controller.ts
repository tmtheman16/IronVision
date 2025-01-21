// src/controllers/UserManagementController.ts
import { Request, Response, NextFunction } from "express";
import { IUserDetails, User } from "../../models/users";
import { hashPassword } from "../../utils/HassedPasword";
import { UserManagementRepository } from "./userManagement.repository";

class UserManagementController {
  registerUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("I got this respone");
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        res.status(400).json({
          messageCode: false,
          message: "Email and password are required",
        });
        return; // Exit the function after sending response
      }

      const user = await User.findOne({ email });

      if (user) {
        res.status(409).json({
          messageCode: false,
          message: "Email already exists",
        });
        return; // Exit the function after sending response
      }

      const hashedPassword = await hashPassword(password);

      const userPayload: IUserDetails = {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      };

      const result = await UserManagementRepository.registerUser(userPayload);
      if (result) {
        res.status(200).json({
          messageCode: true,
          message: "User registered successfully",
        });
        return; // Exit the function after sending response
      } else {
        // Handle unexpected scenario where result is falsy
        res.status(500).json({
          messageCode: false,
          message: "Failed to register user",
        });
        return;
      }
    } catch (error) {
      // Optionally, pass the error to Express's error handler
      next(error);
    }
  };
}

const userManagementController = new UserManagementController();
export default userManagementController;
