import jwt from "jsonwebtoken";
import { IUserDetails } from "../../models/users";

export const generateToken = (user: IUserDetails) => {
  const accessToken = jwt.sign(
    { _id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET_KEY as string,
    {
      expiresIn: process.env.JWT_EXPIRE as string,
    }
  );
  return accessToken;
};
