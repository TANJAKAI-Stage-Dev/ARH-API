import jwt from "jsonwebtoken";

export const generateToken = (userId: string ,role: string,avatarUrl:string) => {
    return jwt.sign({userId,role,avatarUrl}, process.env.JWT_SECRET as string, {
        expiresIn: '1d',
    })
}