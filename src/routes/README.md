# API Routes Documentation

## Authentication Endpoints

Base URL: `/api/auth`

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "customer" // Optional: "admin", "customer", "trial" (default: "customer")
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "role": "customer",
      "subscriptionTier": "free",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid email format or password too short
- `409 Conflict`: Email already registered

---

### POST /api/auth/login

Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials

**Notes:**
- Access token expires in 15 minutes (900 seconds)
- Refresh token expires in 7 days

---

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing refresh token
- `401 Unauthorized`: Invalid or expired refresh token

---

### POST /api/auth/logout

Logout authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: User not found

---

### POST /api/auth/api-key

Generate API key for authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "apiKey": {
      "key": "pk_1234567890abcdef...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: User not found

**Notes:**
- API keys are prefixed with `pk_`
- Each user can have one active API key
- Generating a new API key replaces the previous one

---

## Authentication Middleware

### `authenticate`

Middleware to protect routes requiring JWT authentication.

**Usage:**
```typescript
import { authenticate } from '../middleware/auth'

router.get('/protected', authenticate, (req, res) => {
  // req.user is available here
  res.json({ user: req.user })
})
```

**Headers Required:**
```
Authorization: Bearer <access_token>
```

---

### `authenticateAPIKey`

Middleware to protect routes requiring API key authentication.

**Usage:**
```typescript
import { authenticateAPIKey } from '../middleware/auth'

router.post('/optimize', authenticateAPIKey, (req, res) => {
  // req.user is available here
  res.json({ user: req.user })
})
```

**Headers Required:**
```
X-API-Key: pk_1234567890abcdef...
```

---

### `requireRole`

Middleware to check user role permissions.

**Usage:**
```typescript
import { authenticate, requireRole } from '../middleware/auth'

router.post('/admin-only', authenticate, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin access granted' })
})
```

**Available Roles:**
- `admin`: Full system access
- `customer`: Standard customer access
- `trial`: Limited trial access

---

## Validation Middleware

All endpoints use Joi validation for request validation. Invalid requests return:

```json
{
  "status": "error",
  "message": "Validation error message"
}
```

**Validation Rules:**

- **Email**: Must be valid email format
- **Password**: Minimum 8 characters
- **Role**: Must be one of: admin, customer, trial

---

## Error Handling

All errors follow a consistent format:

```json
{
  "status": "error",
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate email)
- `500 Internal Server Error`: Unexpected server error

---

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt with cost factor 12
2. **JWT Tokens**: Secure token-based authentication with expiration
3. **API Keys**: Unique keys for programmatic access
4. **Input Validation**: All inputs are validated and sanitized
5. **Error Messages**: Generic error messages to prevent information leakage
6. **HTTPS Required**: All API calls should use HTTPS in production
