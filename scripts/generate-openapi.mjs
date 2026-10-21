import fs from "node:fs";
import path from "node:path";

const openApiSpec = `openapi: 3.1.0
info:
  title: Trimly Mobile API
  version: 1.0.0
  description: Hardened REST API Gateway for Trimly native mobile clients (iOS & Android).
servers:
  - url: https://api.trimly.app/api/mobile/v1
    description: Production Mobile Gateway
  - url: http://localhost:3000/api/mobile/v1
    description: Local Development Server

paths:
  /config:
    get:
      summary: Get mobile client configuration & feature flags
      operationId: getConfig
      responses:
        '200':
          description: Client configuration and forced update rules
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConfigResponse'

  /healthz:
    get:
      summary: Server liveness probe
      operationId: getHealthz
      responses:
        '200':
          description: Service is alive

  /readyz:
    get:
      summary: Server readiness probe (DB connectivity check)
      operationId: getReadyz
      responses:
        '200':
          description: Database is connected and ready
        '503':
          description: Database connectivity unavailable

  /auth/register:
    post:
      summary: Register a new customer or barber account
      operationId: register
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterRequest'
      responses:
        '201':
          description: Registration initiated (email verification sent)
        '400':
          $ref: '#/components/responses/ErrorResponse'
        '409':
          $ref: '#/components/responses/ErrorResponse'
        '429':
          $ref: '#/components/responses/ErrorResponse'

  /auth/login:
    post:
      summary: Authenticate with email & password to obtain Bearer tokens
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Successful authentication
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthTokenResponse'
        '401':
          $ref: '#/components/responses/ErrorResponse'
        '403':
          $ref: '#/components/responses/ErrorResponse'
        '429':
          $ref: '#/components/responses/ErrorResponse'

  /auth/refresh:
    post:
      summary: Rotate refresh token to obtain a new access and refresh token
      operationId: refreshSession
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [refreshToken]
              properties:
                refreshToken:
                  type: string
                deviceId:
                  type: string
      responses:
        '200':
          description: Tokens rotated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthTokenResponse'
        '401':
          description: Token revoked, expired, or reuse detected
          $ref: '#/components/responses/ErrorResponse'

  /auth/logout:
    post:
      summary: Revoke current session
      operationId: logout
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Current session revoked
        '401':
          $ref: '#/components/responses/ErrorResponse'

  /auth/logout-all:
    post:
      summary: Revoke all mobile sessions for current user
      operationId: logoutAll
      security:
        - BearerAuth: []
      responses:
        '200':
          description: All sessions revoked
        '401':
          $ref: '#/components/responses/ErrorResponse'

  /auth/sessions:
    get:
      summary: List active mobile sessions for current user
      operationId: getSessions
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of active sessions
        '401':
          $ref: '#/components/responses/ErrorResponse'

  /auth/sessions/{id}:
    delete:
      summary: Revoke a specific active session
      operationId: revokeSession
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Session revoked
        '401':
          $ref: '#/components/responses/ErrorResponse'
        '404':
          $ref: '#/components/responses/ErrorResponse'

  /auth/google:
    post:
      summary: Server-verified Google native ID token sign-in
      operationId: googleLogin
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [idToken]
              properties:
                idToken: { type: string }
                deviceId: { type: string }
                platform: { type: string, enum: [ios, android, unknown] }
      responses:
        '200':
          $ref: '#/components/schemas/AuthTokenResponse'
        '401':
          $ref: '#/components/responses/ErrorResponse'

  /auth/apple:
    post:
      summary: Server-verified Apple native identity token sign-in
      operationId: appleLogin
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [idToken]
              properties:
                idToken: { type: string }
                rawNonce: { type: string }
                fullName: { type: string }
                deviceId: { type: string }
                platform: { type: string, enum: [ios, android, unknown] }
      responses:
        '200':
          $ref: '#/components/schemas/AuthTokenResponse'
        '401':
          $ref: '#/components/responses/ErrorResponse'

  /barbers:
    get:
      summary: List, search, filter and geolocate barbers
      operationId: getBarbers
      parameters:
        - name: search
          in: query
          schema: { type: string }
        - name: city
          in: query
          schema: { type: string }
        - name: service
          in: query
          schema: { type: string }
        - name: minRating
          in: query
          schema: { type: number, minimum: 1, maximum: 5 }
        - name: maxPrice
          in: query
          schema: { type: number, minimum: 0 }
        - name: openNow
          in: query
          schema: { type: boolean }
        - name: lat
          in: query
          schema: { type: number }
        - name: lng
          in: query
          schema: { type: number }
        - name: radiusKm
          in: query
          schema: { type: number, minimum: 1, maximum: 100 }
        - name: sort
          in: query
          schema: { type: string, enum: [distance, rating, price, waiting_time, name] }
        - name: cursor
          in: query
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer, minimum: 1, maximum: 50 }
      responses:
        '200':
          description: Paginated list of barbers
        '304':
          description: Not Modified (ETag matched)
        '429':
          $ref: '#/components/responses/ErrorResponse'

  /barbers/{id}:
    get:
      summary: Get barber profile detail
      operationId: getBarberDetail
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Barber details
        '304':
          description: Not Modified
        '404':
          $ref: '#/components/responses/ErrorResponse'

  /barbers/{id}/availability:
    get:
      summary: Get available appointment time slots
      operationId: getBarberAvailability
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
        - name: date
          in: query
          required: true
          schema: { type: string, format: date }
        - name: serviceId
          in: query
          schema: { type: string }
      responses:
        '200':
          description: Available slots for date
        '404':
          $ref: '#/components/responses/ErrorResponse'

  /barber/profile:
    get:
      summary: Get barber self profile (barber role)
      operationId: getBarberSelfProfile
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Barber self profile
    put:
      summary: Update barber profile, services, and working hours
      operationId: updateBarberSelfProfile
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Barber updated

  /bookings:
    get:
      summary: List user or barber bookings with cursor pagination
      operationId: getBookings
      security:
        - BearerAuth: []
      parameters:
        - name: status
          in: query
          schema: { type: string }
        - name: cursor
          in: query
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer }
      responses:
        '200':
          description: Paginated bookings list
    post:
      summary: Create appointment booking with Idempotency-Key support
      operationId: createBooking
      security:
        - BearerAuth: []
      parameters:
        - name: Idempotency-Key
          in: header
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BookingCreateRequest'
      responses:
        '201':
          description: Booking created
        '409':
          description: Conflict (SLOT_TAKEN, USER_CONFLICT)
        '422':
          description: Idempotency key payload mismatch
        '429':
          $ref: '#/components/responses/ErrorResponse'

  /bookings/{id}:
    get:
      summary: Get booking details
      operationId: getBookingDetail
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Booking details
        '404':
          $ref: '#/components/responses/ErrorResponse'
    patch:
      summary: Transition booking status (cancel, reschedule, confirm, decline, complete, no-show)
      operationId: updateBookingStatus
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BookingUpdateRequest'
      responses:
        '200':
          description: Booking status updated
        '400':
          $ref: '#/components/responses/ErrorResponse'
        '409':
          $ref: '#/components/responses/ErrorResponse'

  /reviews:
    get:
      summary: List reviews for a barber with cursor pagination
      operationId: getReviews
      parameters:
        - name: barberId
          in: query
          required: true
          schema: { type: string }
        - name: cursor
          in: query
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer }
      responses:
        '200':
          description: Reviews list
    post:
      summary: Submit a review for a completed appointment
      operationId: createReview
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ReviewCreateRequest'
      responses:
        '201':
          description: Review created
        '409':
          description: Review already submitted for booking
        '429':
          $ref: '#/components/responses/ErrorResponse'

  /notifications:
    get:
      summary: List notifications with unread count
      operationId: getNotifications
      security:
        - BearerAuth: []
      parameters:
        - name: cursor
          in: query
          schema: { type: string }
        - name: limit
          in: query
          schema: { type: integer }
      responses:
        '200':
          description: Notifications list
    patch:
      summary: Mark notifications as read
      operationId: markNotificationsRead
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Notifications marked read

  /media/upload-url:
    post:
      summary: Request presigned upload URL with role & quota gating
      operationId: getUploadUrl
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MediaUploadUrlRequest'
      responses:
        '200':
          description: Presigned upload URL generated
        '403':
          description: Role insufficient for purpose (e.g. ID doc requires barber/admin)
        '429':
          $ref: '#/components/responses/ErrorResponse'

  /media/upload:
    put:
      summary: Direct file upload with magic-byte type sniffing and EXIF/GPS stripping
      operationId: uploadMediaDirect
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Media uploaded, sanitized, and stored

  /media/complete:
    post:
      summary: Finalize media reference after successful upload
      operationId: completeMediaUpload
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Media marked ready

  /media/private/{key}:
    get:
      summary: Read protected document (admin only or short-lived signed URL with audit log)
      operationId: getPrivateMedia
      security:
        - BearerAuth: []
      parameters:
        - name: key
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Encrypted media served
        '403':
          $ref: '#/components/responses/ErrorResponse'

  /devices:
    post:
      summary: Register or refresh device push token (FCM / APNs)
      operationId: registerDevice
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DeviceRegisterRequest'
      responses:
        '200':
          description: Device push token registered
        '429':
          $ref: '#/components/responses/ErrorResponse'

  /devices/{id}:
    delete:
      summary: Unregister device push token on logout
      operationId: unregisterDevice
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Device unregistered

  /notification-preferences:
    get:
      summary: Get user push notification preferences
      operationId: getNotificationPreferences
      security:
        - BearerAuth: []
      responses:
        '200':
          description: User notification preferences
    put:
      summary: Update notification preferences
      operationId: updateNotificationPreferences
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Preferences updated

  /jobs/reminders:
    post:
      summary: Trigger appointment reminder push fan-out (24h and 1h before appointment)
      operationId: runReminderJob
      parameters:
        - name: x-job-secret
          in: header
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Reminders evaluated and queued
        '401':
          description: Invalid job secret

  /favorites:
    get:
      summary: List user favorite barbers
      operationId: getFavorites
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of favorite barbers

  /favorites/{barberId}:
    post:
      summary: Add barber to favorites
      operationId: addFavorite
      security:
        - BearerAuth: []
      parameters:
        - name: barberId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Barber added to favorites
    delete:
      summary: Remove barber from favorites
      operationId: removeFavorite
      security:
        - BearerAuth: []
      parameters:
        - name: barberId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Barber removed from favorites

  /users/profile:
    get:
      summary: Get current authenticated user profile
      operationId: getUserProfile
      security:
        - BearerAuth: []
      responses:
        '200':
          description: User profile
    patch:
      summary: Update profile name and phone
      operationId: updateUserProfile
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Profile updated

  /account:
    delete:
      summary: Permanently delete account with re-authentication and booking cancellation
      operationId: deleteAccount
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [password]
              properties:
                password: { type: string }
      responses:
        '200':
          description: Account deleted, active bookings cancelled, PII anonymized
        '403':
          description: Last admin cannot be deleted

  /account/export:
    get:
      summary: Export personal data (DPDP / GDPR compliance)
      operationId: exportAccountData
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Personal data export JSON archive

  /account/consents:
    get:
      summary: List recorded user privacy consents
      operationId: getConsents
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of consents
    post:
      summary: Record policy agreement and consent version
      operationId: recordConsent
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Consent recorded

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    ConfigResponse:
      type: object
      properties:
        data:
          type: object
          properties:
            minSupportedAppVersion:
              type: object
              properties:
                ios: { type: string }
                android: { type: string }
            latestVersion:
              type: object
              properties:
                ios: { type: string }
                android: { type: string }
            maintenance: { type: boolean }
            featureFlags: { type: object }
            legalUrls: { type: object }

  responses:
    ErrorResponse:
      description: Error envelope response
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'
`;

export function generateOpenApiSpec() {
  const targetDir = path.resolve(process.cwd(), "docs/openapi");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetFile = path.join(targetDir, "mobile-v1.yaml");
  fs.writeFileSync(targetFile, openApiSpec, "utf8");
  console.log(`OpenAPI 3.1 specification written to ${targetFile}`);
  return targetFile;
}

if (process.argv[1]?.endsWith("generate-openapi.mjs")) {
  generateOpenApiSpec();
}
