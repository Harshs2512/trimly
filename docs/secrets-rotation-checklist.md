# Secrets Rotation & Incident Remediation Checklist

**Incident Reference:** `TRIMLY-SEC-INC-001`  
**Classification:** Critical (Committed Secrets in Git History via `trimly.zip`)  
**Target:** Production Credentials Cleanup  

---

## 1. Credentials That Must Be Rotated

The following live credentials were discovered inside `trimly.zip` in git history commits `ad51f6d` and `26d7908`. Because an AI coding assistant cannot access your cloud provider consoles or databases, **you must execute this rotation yourself**:

| # | Secret Name | Associated Service | Rotation Steps |
| :- | :--- | :--- | :--- |
| **1** | `MONGODB_URI` | MongoDB Atlas / Cloud Database | 1. Go to **Atlas Dashboard → Database Access**.<br>2. Create a new user with readWrite permissions and a strong 32+ char random password.<br>3. Update your live deployment environment variables (`MONGODB_URI`) with the new connection string.<br>4. Delete the old user from Database Access.<br>5. In **Network Access**, ensure IP whitelist is restricted to your production servers (no `0.0.0.0/0` if possible). |
| **2** | `NEXTAUTH_SECRET` | Web Session Cookies | 1. Generate a new 256-bit secret in your terminal:<br>`openssl rand -base64 32`<br>2. Update `NEXTAUTH_SECRET` in your hosting dashboard (Vercel / AWS).<br>*(Note: Existing web users will need to re-login upon rotation).* |
| **3** | `GOOGLE_CLIENT_SECRET` | Google Cloud Console OAuth | 1. Go to **Google Cloud Console → APIs & Services → Credentials**.<br>2. Select the Web Client ID.<br>3. Delete the old client secret and generate a new secret.<br>4. Update `GOOGLE_CLIENT_SECRET` in production.<br>5. Create separate client IDs for Android (`SHA-1` fingerprint) and iOS (Bundle ID). |
| **4** | `SMTP_PASS` | SMTP Provider (Gmail / SendGrid / Brevo) | 1. Log in to your email provider.<br>2. Revoke the existing App Password or API Key.<br>3. Generate a new App Password or API Key.<br>4. Update `SMTP_PASS` in production. |
| **5** | `JWT_SECRET` | Legacy Web Configuration | **Delete entirely.** Verified unused in codebase; NextAuth uses `NEXTAUTH_SECRET` and the mobile API uses `MOBILE_JWT_SECRET`. |

---

## 2. Git History Scrubbing Run-Book

To completely purge `trimly.zip` from your remote GitHub repository history:

```bash
# 1. Install git-filter-repo (Python required)
pip install git-filter-repo

# 2. Run git-filter-repo to scrub trimly.zip from all commits
git filter-repo --invert-paths --path trimly.zip --force

# 3. Force push the rewritten history to your remote repository
git push origin --force --all
git push origin --force --tags
```

---

## 3. Preventive Controls Installed in Codebase

- `.gitignore` updated to ignore `*.zip` and `*.tar.gz`.
- `.gitleaks.toml` created for automated secret scanning.
- `.github/workflows/ci.yml` added with Gitleaks and `npm audit`.
- `src/lib/env.js` created to fail fast on weak or missing keys in production.
