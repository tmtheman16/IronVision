import { IUserDetails, User } from "../../models/users";

export class UserManagementRepository {
  static async registerUser(userDetails: IUserDetails): Promise<any> {
    try {
      const newUser = new User({ ...userDetails, role: "user" });
      return await newUser.save({ validateBeforeSave: true });
    } catch (error) {
      throw error;
    }
  }
}

export default new UserManagementRepository();
