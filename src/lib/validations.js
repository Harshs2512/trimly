import { z } from "zod";

export const userSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["user", "barber", "admin"]).optional(),
});

export const barberSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    shopName: z.string().min(2, "Shop name must be at least 2 characters"),
    address: z.string().min(5, "Address must be at least 5 characters"),
    services: z.array(
        z.object({
            name: z.string().min(2, "Service name is required"),
            price: z.number().min(0, "Price must be a positive number"),
            duration: z.number().min(1, "Duration must be at least 1 minute"),
        })
    ).optional(),
    workingHours: z.object({
        open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    }).optional(),
    waitingTime: z.number().default(0),
});

export const bookingSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    barberId: z.string().min(1, "Barber ID is required"),
    service: z.string().min(1, "Service is required"),
    timeSlot: z.string().datetime({ offset: true }, "Invalid date/time format"), // Expecting ISO string
    status: z.enum(["pending", "confirmed", "completed", "cancelled"]).default("pending"),
});
