import { z } from "zod";

export const habilitacionSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9_-]{43}$/,
        "El código de habilitación no es válido.",
      ),
  })
  .strict();