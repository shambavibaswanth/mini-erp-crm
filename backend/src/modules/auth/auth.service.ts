import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { signToken } from "../../utils/jwt";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

// Only an Admin should be able to create new user accounts (see auth.routes.ts).
export async function register(name: string, email: string, password: string, role: Role) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict("A user with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
