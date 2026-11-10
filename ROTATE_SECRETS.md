# ⚠️ ROTATE_SECRETS.md — Action Required

> **Why this file exists:** The file `.env.local` was included in a shared zip archive.
> Every secret it contained must be treated as **compromised and rotated immediately**.
> Do this before deploying or sharing the codebase further.

---

## Secrets to Rotate (all were in `.env.local`)

| Variable | Where to rotate | Priority |
|---|---|---|
| `MONGODB_URI` (user + password in the URI) | MongoDB Atlas → Database Access → Edit user → Reset password | 🔴 Critical |
| `NEXTAUTH_SECRET` | Generate new: `openssl rand -base64 32` → update in hosting env | 🔴 Critical |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials → OAuth 2.0 → Regenerate secret | 🔴 Critical |
| `SMTP_PASS` | Your SMTP provider (Gmail App Password / Brevo / Resend) → revoke & regenerate | 🔴 Critical |
| `FAST2SMS_API_KEY` | fast2sms.com → Account → API Key → Regenerate | 🔴 Critical |
| `MOBILE_JWT_SECRET` | Generate new: `openssl rand -base64 32` → update in hosting env | 🔴 Critical |
| `FIELD_ENCRYPTION_KEY` | Generate new 64-char hex: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — **note: rotating this key will make existing encrypted fields unreadable unless you re-encrypt them first** | 🔴 Critical |
| `S3_SECRET_ACCESS_KEY` | AWS IAM → Access keys → Deactivate old → Create new | 🟠 High (if configured) |
| `FIREBASE_PRIVATE_KEY` | Firebase Console → Project Settings → Service accounts → Generate new private key | 🟠 High (if configured) |
| `RESEND_API_KEY` | resend.com → API Keys → Delete old → Create new | 🟡 Medium (if configured) |

---

## Checklist

- [ ] All secrets above have been rotated in their respective services
- [ ] New secrets stored **only** in your hosting provider's secret/env vault (Vercel, Railway, etc.)
- [ ] `.env.local` is listed in `.gitignore` ✅ (already confirmed)
- [ ] Confirm `.env.local` is NOT in git history: `git log --all --full-history -- .env.local`
  - If it appears: `git filter-repo --path .env.local --invert-paths` (requires a force push + all collaborators to re-clone)
- [ ] The `.zip` archive that contained `.env.local` has been permanently deleted from all locations (email, Drive, Slack, etc.)
- [ ] Never zip the project directory again without first excluding secret files

---

## How to verify no secrets are tracked in git

```bash
# Check if .env.local was ever committed
git log --all --full-history -- .env.local

# Check current .gitignore covers env files
grep ".env" .gitignore
```

---

## Generating new secrets

```bash
# NEXTAUTH_SECRET / MOBILE_JWT_SECRET
openssl rand -base64 32

# FIELD_ENCRYPTION_KEY (64 hex chars = 256-bit AES key)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

*Created: 2026-11-10 — Phase 1 security remediation*

