import { z } from "zod";


function validateWorkingHours(workingHours) {
  if (!workingHours?.open || !workingHours?.close) return true;
  const toMinutes = (value) => {
    const [hours, minutes] = String(value).split(":").map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
  };
  const open = toMinutes(workingHours.open);
  const close = toMinutes(workingHours.close);
  return open !== null && close !== null && open < close;
}

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

const serviceSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  name: z.string().trim().min(2, "Service name must be at least 2 characters").max(80),
  price: z.number().positive("Price must be greater than zero").max(1_000_000),
  duration: z.number().int().min(5, "Duration must be at least 5 minutes").max(480, "Duration cannot exceed 8 hours"),
});

const workingHoursSchema = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)"),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)"),
}).refine(validateWorkingHours, {
  message: "Closing time must be later than opening time",
  path: ["close"],
});

export const userSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  role: z.enum(["user", "barber"]).optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
});

export const barberSchema = z.object({
  shopName: z.string().trim().min(2, "Shop name must be at least 2 characters").max(120),
  address: z.string().trim().min(5, "Address must be at least 5 characters").max(300),
  description: z.string().trim().max(1000).optional().default(""),
  services: z.array(serviceSchema).max(100).optional().default([]),
  workingHours: workingHoursSchema.optional().default({ open: "09:00", close: "17:00" }),
  closedDays: z.array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])).max(7).optional().default([]),
  timezone: z.string().trim().min(1).max(100).refine(isValidTimeZone, "Invalid IANA timezone").optional().default("Asia/Kolkata"),
  leadTimeMinutes: z.number().int().min(0).max(1440).optional().default(30),
  bookingHorizonDays: z.number().int().min(1).max(365).optional().default(90),
  slotIntervalMinutes: z.number().int().min(5).max(120).optional().default(30),
});

export const barberUpdateSchema = barberSchema.partial();

export const bookingCreateSchema = z.object({
  barberId: z.string().min(1, "Barber ID is required"),
  serviceId: z.string().min(1).max(100).optional(),
  service: z.string().trim().min(1, "Service is required").max(100).optional(),
  timeSlot: z.string().datetime({ offset: true }, "Invalid date/time format"),
}).refine((data) => data.serviceId || data.service, {
  message: "Service is required",
  path: ["service"],
});

export const bookingUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "declined", "no_show"]),
  cancelReason: z.string().trim().max(500).optional(),
  timeSlot: z.string().datetime({ offset: true }, "Invalid date/time format").optional(),
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(["user", "barber", "admin"]).optional(),
  active: z.boolean().optional(),
}).refine((data) => data.role !== undefined || data.active !== undefined, {
  message: "No valid update fields supplied",
});

export const adminBarberUpdateSchema = z.object({
  verificationStatus: z.enum(["pending", "verified", "rejected"]),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(254),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(254),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(254),
  token: z.string().min(32).max(256),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(254),
  token: z.string().min(32).max(256),
});
