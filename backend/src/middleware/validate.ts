import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import { ApiError } from "../utils/apiError";

// Validates req.body / req.query / req.params against a zod schema shaped like:
// z.object({ body: z.object({...}), query: z.object({...}), params: z.object({...}) })
// Only the keys present in the schema are checked.
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body) req.body = parsed.body;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw ApiError.badRequest(
          "Validation failed",
          err.errors.map((e) => ({ path: e.path.join("."), message: e.message }))
        );
      }
      throw err;
    }
  };
}
