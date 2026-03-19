# Admin Module - API Documentation for Frontend Agent

This document outlines the endpoints required to build and integrate the Ticky Super-Admin Dashboard.

**Base URL**: `/api/v1/admin`
**Authentication**: All protected routes require `Authorization: Bearer <token>` where the token belongs to a user with `role: 'admin'`.

---

## 1. Authentication

### Admin Login

`POST /login`
Handles high-privilege access.

- **Payload**: `{ "email": "hellovicdevman@gmail.com", "password": "..." }`
- **Success (200)**: `{ "ok": true, "token": "...", "user": { "role": "admin", ... } }`
- **Default Credentials**: `hellovicdevman@gmail.com` / `123456`.

### Admin Forgot Password

`POST /forgot-password`
Initiates OTP flow for the root admin email.

- **Payload**: `{ "email": "hellovicdevman@gmail.com" }`

### Admin Reset Password

`POST /reset-password`
Resets the password using the OTP.

- **Payload**: `{ "email": "...", "otp": "...", "newPassword": "..." }`

---

## 2. Dashboard & Analytics

### System Overview

`GET /dashboard`
Returns a birds-eye view of the system status and health.

- **Stats**: Total users, total AI games, total PvP games, active chats.
- **Traffic**: Route hits and average latency for the last 24h.
- **AI Analytics**: Global breakdown of AI games by difficulty and outcome.

---

## 3. User Management

### List & Filter Users

`GET /users`
Paginated and filterable list of all system users.

- **Queries**:
  - `page`: (Number) Default 1.
  - `search`: (String) Search by username or email.
  - `difficulty`: (Optional) "easy", "medium", "hard". Filters users who played in this mode.
  - `result`: (Optional) "win", "loss", "draw". Filters users by game outcome.
- **Example**: `GET /users?difficulty=hard&result=win` (Users who have beaten AI on Hard).

### Delete User

`DELETE /users/:userId`
Permanently remove a user account and associated data.

---

## 4. System Monitoring (Automatic)

The backend now automatically tracks **every request** to the `/api/v1` namespace. This data is aggregated in the `/dashboard` endpoint under the `traffic` key.

- **Metrics tracked**: Path, Method, Status Code, Duration (ms), and User ID (if authenticated).

---

## Integration Tips

1. **Persistent Header**: Ensure the admin token is stored securely (session-only or highly secure cookie) as it grants destructive permissions (Delete User).
2. **Traffic Graphs**: Use the `traffic` data from `/dashboard` to plot hits-per-route and performance bottlenecks.
3. **AI Performance**: Use the `aiStats` to highlight how challenging the current AI settings are for the player base.
