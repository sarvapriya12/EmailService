import { z } from "zod";

// 1. Define the validation schema
export const userInputSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long." })
    .max(20, { message: "Username cannot exceed 20 characters." })
    .trim(),
    
  email: z
    .string()
    .email({ message: "Please provide a valid email address." })
    .toLowerCase()
    .trim(),
    
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
    .regex(/[0-9]/, { message: "Password must contain at least one number." }),
    
  age: z
    .number()
    .min(18, { message: "You must be at least 18 years old." })
    .max(120)
    .optional(), // Fields are required by default in Zod unless marked optional
});

// 2. Infer the TypeScript type automatically from the schema
export type UserInput = z.infer<typeof userInputSchema>;