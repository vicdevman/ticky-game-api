# Admin API Technical Reference (Expanded JSON Spec)

Detailed technical guide for the Admin Dashboard integration.

**Base URL**: `/api/v1/admin`

---

## 1. Dashboard & Real-Time Stats

### **Get System Dashboard**

Returns high-level stats and real-time counts.

- **Endpoint**: `GET /api/v1/admin/dashboard`
- **Response**:

```json
{
  "ok": true,
  "stats": {
    "total_users": 1500,
    "total_ai_games": 3200,
    "total_pvp_games": 850,
    "total_matches_played": 4050,
    "total_active_chats": 120,
    "online_users_count": 45,
    "active_games_count": 8
  },
  "traffic": [...],
  "aiStats": [...]
}
```

---

## 2. Real-Time Monitoring

### **List Online Users**

Returns detailed profiles of users currently connected.

- **Endpoint**: `GET /api/v1/admin/online-users`
- **Response**:

```json
{
  "ok": true,
  "users": [
    {
      "id": "uuid",
      "username": "victor",
      "email": "vic@example.com",
      "xp": 2500,
      "total_games": 142,
      "created_at": "2026-01-01T...",
      "last_seen_at": "2026-03-19T...",
      "role": "user"
    }
  ]
}
```

### **List Active Games**

Returns in-progress games and their participants.

- **Endpoint**: `GET /api/v1/admin/active-games`
- **Response**:

```json
{
  "ok": true,
  "games": [
    {
      "id": "game-code",
      "type": "classic",
      "currentPlayer": "X",
      "xScore": 1,
      "oScore": 0,
      "time": 2650,
      "isPublic": true,
      "participants": [
        {
          "userId": "uuid-1",
          "character": "X",
          "connected": true,
          "joinedAt": 1710812345678
        },
        {
          "userId": "uuid-2",
          "character": "O",
          "connected": true,
          "joinedAt": 1710812345688
        }
      ]
    }
  ]
}
```

---

## 3. User Management

### **Paginated User List**

Enhanced with `total_games` and `created_at`.

- **Endpoint**: `GET /api/v1/admin/users?page=1&search=...`
- **Response**:

```json
{
  "ok": true,
  "users": [
    {
      "id": "uuid",
      "username": "...",
      "email": "...",
      "xp": 500,
      "total_games": 20,
      "role": "user",
      "created_at": "...",
      "last_seen_at": "..."
    }
  ]
}
```
