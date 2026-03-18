import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  wallet: string;
}

const rawSecret = process.env.JWT_SECRET;

if (!rawSecret) {
  throw new Error("JWT_SECRET is required");
}

const SECRET: string = rawSecret;

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, SECRET);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof (decoded as { userId?: unknown }).userId !== "string" ||
    typeof (decoded as { wallet?: unknown }).wallet !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  return decoded as JwtPayload;
}
