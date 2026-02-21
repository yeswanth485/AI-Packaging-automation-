# Box Catalog API Endpoints

This document describes the box catalog management endpoints.

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

Admin-only endpoints additionally require the user to have the `ADMIN` role.

## Endpoints

### POST /api/boxes
**Description:** Add a new box to the catalog (admin only)

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "name": "Small Box",
  "length": 30,
  "width": 20,
  "height": 15,
  "maxWeight": 5,
  "isActive": true
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "box": {
      "id": "uuid",
      "name": "Small Box",
      "length": 30,
      "width": 20,
      "height": 15,
      "volume": 9000,
      "maxWeight": 5,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

### PUT /api/boxes/:id
**Description:** Update an existing box (admin only)

**Authentication:** Required (Admin only)

**URL Parameters:**
- `id` (string, UUID): Box ID

**Request Body:**
```json
{
  "name": "Updated Box Name",
  "length": 35,
  "isActive": false
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "box": {
      "id": "uuid",
      "name": "Updated Box Name",
      "length": 35,
      "width": 20,
      "height": 15,
      "volume": 10500,
      "maxWeight": 5,
      "isActive": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-02T00:00:00Z"
    }
  }
}
```

---

### DELETE /api/boxes/:id
**Description:** Deactivate a box (soft delete, admin only)

**Authentication:** Required (Admin only)

**URL Parameters:**
- `id` (string, UUID): Box ID

**Response (200):**
```json
{
  "status": "success",
  "message": "Box deactivated successfully"
}
```

---

### GET /api/boxes/:id
**Description:** Get a single box by ID

**Authentication:** Required

**URL Parameters:**
- `id` (string, UUID): Box ID

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "box": {
      "id": "uuid",
      "name": "Small Box",
      "length": 30,
      "width": 20,
      "height": 15,
      "volume": 9000,
      "maxWeight": 5,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

### GET /api/boxes
**Description:** Get all boxes with optional filtering

**Authentication:** Required

**Query Parameters:**
- `activeOnly` (boolean, optional): Filter to only active boxes (default: false)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "boxes": [
      {
        "id": "uuid",
        "name": "Small Box",
        "length": 30,
        "width": 20,
        "height": 15,
        "volume": 9000,
        "maxWeight": 5,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "count": 1
  }
}
```

---

### GET /api/boxes/suitable
**Description:** Query suitable boxes for given dimensions and weight

**Authentication:** Required

**Query Parameters:**
- `length` (number, required): Required length in cm
- `width` (number, required): Required width in cm
- `height` (number, required): Required height in cm
- `weight` (number, required): Required weight in kg

**Example:**
```
GET /api/boxes/suitable?length=25&width=15&height=10&weight=3
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "boxes": [
      {
        "id": "uuid",
        "name": "Small Box",
        "length": 30,
        "width": 20,
        "height": 15,
        "volume": 9000,
        "maxWeight": 5,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "count": 1
  }
}
```

---

### GET /api/boxes/stats
**Description:** Get usage statistics for boxes within a date range

**Authentication:** Required

**Query Parameters:**
- `startDate` (string, ISO 8601, required): Start date
- `endDate` (string, ISO 8601, required): End date (must be after start date)

**Example:**
```
GET /api/boxes/stats?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "stats": [
      {
        "boxId": "uuid",
        "boxName": "Small Box",
        "usageCount": 10,
        "averageUtilization": 75.5,
        "totalVolume": 90000,
        "wastedVolume": 22050
      }
    ],
    "count": 1
  }
}
```

## Error Responses

### 400 Bad Request
Validation error or invalid input:
```json
{
  "status": "error",
  "message": "Length must be a positive number"
}
```

### 401 Unauthorized
Missing or invalid authentication:
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

### 403 Forbidden
Insufficient permissions:
```json
{
  "status": "error",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
Resource not found:
```json
{
  "status": "error",
  "message": "Box not found"
}
```

## Implementation Notes

- All box dimensions are in centimeters (cm)
- All weights are in kilograms (kg)
- Volume is automatically calculated as length × width × height
- Boxes are soft-deleted (marked inactive) rather than permanently removed
- The `findSuitableBoxes` method considers all possible orientations when checking dimension fit
- Results are sorted by volume in ascending order (smallest first)
