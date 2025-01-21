import { Router } from "express";

import expressAsyncHandler from "express-async-handler";
import authController from "./auth.controller";

const authRouter = Router();

authRouter.post("/login", expressAsyncHandler(authController.login));
authRouter.get("/verify", expressAsyncHandler(authController.authVerify));
authRouter.post("/logout", expressAsyncHandler(authController.logout));

export default authRouter;
