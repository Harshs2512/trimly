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
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  role: z.enum(["user", "barber"]).optional(),
  phone: z.string().trim().optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  phone: z.string().trim().regex(/^(\+?[1-9]\d{7,14}|\d{10})$/, "Invalid phone number format").optional().or(z.literal("")),
}).refine((data) => data.name !== undefined || data.phone !== undefined, {
  message: "At least one field must be provided to update",
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters").max(128),
});

export const sendOtpSchema = z.object({
  phone: z.string().trim().regex(/^(\+?[1-9]\d{7,14}|\d{10})$/, "Please enter a valid phone number"),
  email: z.string().trim().email("Please enter a valid email address").optional().or(z.literal("")),
});

export const verifyOtpSchema = z.object({
  phone: z.string().trim().regex(/^(\+?[1-9]\d{7,14}|\d{10})$/, "Please enter a valid phone number"),
  code: z.string().trim().length(6, "OTP must be exactly 6 digits"),
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Please enter a valid email address").optional().or(z.literal("")),
  deviceId: z.string().trim().max(100).optional(),
  platform: z.string().trim().max(20).optional(),
  appVersion: z.string().trim().max(20).optional(),
});

export const workPhotoSchema = z.object({
  id: z.string().max(100).optional(),
  url: z.string().max(3_000_000, "Image data exceeds size limit"),
  caption: z.string().trim().max(100).optional().default(""),
  category: z.string().trim().max(50).optional().default("Haircut"),
  createdAt: z.string().optional(),
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
  idType: z.enum(["aadhaar", "pan", "driving_license", "voter_id", "trade_license"]).optional(),
  idNumber: z.string().trim().max(50).optional().default(""),
  idDocumentImage: z.string().max(3_000_000).optional().default(""),
  shopExteriorImage: z.string().max(3_000_000).optional().default(""),
  shopInteriorImage: z.string().max(3_000_000).optional().default(""),
  workPhotos: z.array(workPhotoSchema).max(16).optional().default([]),
  staffCount: z.number().int().min(1, "Must have at least 1 staff member").max(100).optional().default(1),
  chairsCount: z.number().int().min(1, "Must have at least 1 styling chair").max(50).optional().default(1),
  specialties: z.array(z.string().trim().min(1).max(50)).max(20).optional().default([]),
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
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "declined", "no_show"]).optional(),
  cancelReason: z.string().trim().max(500).optional(),
  timeSlot: z.string().datetime({ offset: true }, "Invalid date/time format").optional(),
}).refine((data) => data.status !== undefined || data.timeSlot !== undefined, {
  message: "Either status or timeSlot must be provided",
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

export const reviewCreateSchema = z.object({
  barberId: z.string().min(1, "Barber ID is required"),
  bookingId: z.string().min(1, "Booking ID is required"),
  rating: z.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  comment: z.string().trim().max(1000, "Comment cannot exceed 1000 characters").optional().default(""),
});

export const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5").optional(),
  comment: z.string().trim().max(1000, "Comment cannot exceed 1000 characters").optional(),
});

export const mobileLoginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(254),
  password: z.string().min(1, "Password is required").max(128),
  deviceId: z.string().trim().max(100).optional(),
  platform: z.enum(["ios", "android", "unknown"]).optional().default("unknown"),
  appVersion: z.string().trim().max(20).optional().default("1.0.0"),
});

export const mobileRefreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
  deviceId: z.string().trim().max(100).optional(),
});

export const mobileDeviceSchema = z.object({
  deviceId: z.string().trim().min(1).max(100),
  pushToken: z.string().trim().min(1).max(500),
  platform: z.enum(["ios", "android"]),
  appVersion: z.string().trim().max(20).optional().default("1.0.0"),
  locale: z.string().trim().max(10).optional().default("en"),
  enabled: z.boolean().optional().default(true),
});

export const mobileSocialLoginSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
  provider: z.enum(["google", "apple"]),
  rawNonce: z.string().optional(),
  fullName: z.string().trim().max(100).optional(),
  deviceId: z.string().trim().max(100).optional(),
  platform: z.enum(["ios", "android", "unknown"]).optional().default("unknown"),
});

export const mediaUploadUrlSchema = z.object({
  purpose: z.enum(["work_photo", "shop_exterior", "shop_interior", "id_document"]),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024, "File size must not exceed 5 MB"),
});

export const mediaCompleteSchema = z.object({
  objectKey: z.string().trim().min(1).max(255),
  purpose: z.enum(["work_photo", "shop_exterior", "shop_interior", "id_document"]),
});

