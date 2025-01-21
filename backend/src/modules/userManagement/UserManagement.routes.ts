import { Router } from "express";
import userManagementController from "./userManagement.controller";
import expressAsyncHandler from "express-async-handler";

const userManagementRouter = Router();

userManagementRouter.post(
  "/register",
  expressAsyncHandler(userManagementController.registerUser)
);

export default userManagementRouter;
