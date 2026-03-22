import { User, IUser } from "../models/user.model";

export const findUserByEmail = async (email: string, withPassword = false) => {
  const q = User.findOne({ email });
  return withPassword ? q.select("+password") : q;
};

export const findUserById = async (id: string, withPassword = false) => {
  const q = User.findById(id);
  return withPassword ? q.select("+password") : q;
};

export const findActiveUserById = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user || !user.isActive) return null;
  return user;
};

export const createUser = async (data: Partial<IUser>) => {
  return User.create(data);
};

export const saveUser = async (user: IUser) => {
  return user.save();
};
