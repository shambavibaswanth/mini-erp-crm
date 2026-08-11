import { Request, Response } from "express";
import * as authService from "./auth.service";

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json(result);
}

export async function registerHandler(req: Request, res: Response) {
  const { name, email, password, role } = req.body;
  const user = await authService.register(name, email, password, role);
  res.status(201).json({ user });
}

export async function meHandler(req: Request, res: Response) {
  const user = await authService.getProfile(req.user!.sub);
  res.status(200).json({ user });
}
