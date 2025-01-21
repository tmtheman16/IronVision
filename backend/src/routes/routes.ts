import { Application } from "express";
import userManagementRouter from "../modules/userManagement/UserManagement.routes";
import authRouter from "../modules/auth/auth.routers";
import fileManagement from "../modules/fileManagement/fileManagement.routes";

export const initializeRoutes = (app: Application) => {
  app.use("/user-management", userManagementRouter);
  app.use("/auth", authRouter);
  app.use("/file-management", fileManagement);
};
