import jwt from "jsonwebtoken";

interface User {
  _id: string;
  email: string;
  userName: string;
}

export const setToken = (user: User) => {
  return jwt.sign(
    {
      _id: user._id,
      email: user.email,
      userName: user.userName,
    },
    String(process.env.SECRET_KEY),
    {
      expiresIn: "7d",
    }
  );
};

export const getToken = (token: string) => {
  if (!token) return null;
  return jwt.verify(token, String(process.env.SECRET_KEY));
};
