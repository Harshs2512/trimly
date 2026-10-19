# Trimly Mobile API — Push Notification Payload Specification

## Security & Privacy Ground Rules

To ensure compliance with MASVS-STORAGE and privacy regulations (GDPR/DPDP), **push notification payloads sent across Apple Push Notification service (APNs) and Firebase Cloud Messaging (FCM) NEVER contain sensitive personal data**.

- **No full names**: Never include customer or barber full names.
- **No contact details**: Never include email addresses or phone numbers.
- **No physical addresses**: Never include shop addresses or directions in push payloads.
- **Opaque IDs only**: Payloads contain only an opaque `bookingId`, a notification `type`, and a generic message.
- Full details must be fetched over the authenticated TLS connection after the app launches.

---

## Standard Push Notification Structure

```json
{
  "notification": {
    "title": "Trimly Appointment Update",
    "body": "Your appointment status has changed."
  },
  "data": {
    "type": "booking_confirmed",
    "bookingId": "654c2a1e8f3b2a0012345678",
    "click_action": "FLUTTER_NOTIFICATION_CLICK"
  }
}
```

---

## Event Types & Payloads

### 1. `booking_created`
Sent to barber when a customer submits a new booking.
```json
{
  "notification": {
    "title": "New Booking Request",
    "body": "You have a new appointment booking request."
  },
  "data": {
    "type": "booking_created",
    "bookingId": "654c2a1e8f3b2a0012345678"
  }
}
```

### 2. `booking_confirmed`
Sent to customer when barber confirms the appointment.
```json
{
  "notification": {
    "title": "Appointment Confirmed",
    "body": "Your appointment has been confirmed by your barber."
  },
  "data": {
    "type": "booking_confirmed",
    "bookingId": "654c2a1e8f3b2a0012345678"
  }
}
```

### 3. `booking_declined`
Sent to customer if barber declines the appointment.
```json
{
  "notification": {
    "title": "Appointment Declined",
    "body": "Your appointment request could not be accepted."
  },
  "data": {
    "type": "booking_declined",
    "bookingId": "654c2a1e8f3b2a0012345678"
  }
}
```

### 4. `booking_cancelled`
Sent to barber when customer cancels, or customer when barber cancels.
```json
{
  "notification": {
    "title": "Appointment Cancelled",
    "body": "An appointment has been cancelled."
  },
  "data": {
    "type": "booking_cancelled",
    "bookingId": "654c2a1e8f3b2a0012345678"
  }
}
```

### 5. `booking_rescheduled`
Sent when appointment date/time is adjusted.
```json
{
  "notification": {
    "title": "Appointment Rescheduled",
    "body": "An appointment time has been rescheduled."
  },
  "data": {
    "type": "booking_rescheduled",
    "bookingId": "654c2a1e8f3b2a0012345678"
  }
}
```

### 6. `booking_completed`
Sent to customer upon service completion, inviting them to rate the experience.
```json
{
  "notification": {
    "title": "Appointment Completed",
    "body": "Your service is complete! Tap to rate your experience."
  },
  "data": {
    "type": "booking_completed",
    "bookingId": "654c2a1e8f3b2a0012345678"
  }
}
```

### 7. `booking_reminder_24h` / `booking_reminder_1h`
Automated appointment reminders dispatched via scheduled job.
```json
{
  "notification": {
    "title": "Upcoming Appointment Reminder",
    "body": "You have an appointment coming up tomorrow."
  },
  "data": {
    "type": "booking_reminder_24h",
    "bookingId": "654c2a1e8f3b2a0012345678"
  }
}
```

---

## Token Lifecycle Management

- Push tokens are registered via `POST /api/mobile/v1/devices`.
- Stale or invalid tokens returning `messaging/registration-token-not-registered` or `UNREGISTERED` from FCM/APNs are automatically purged from the `devices` collection.
- When a user logs out (`POST /api/mobile/v1/auth/logout`), the device push token bound to that session is immediately deleted.
