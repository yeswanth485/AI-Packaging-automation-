# Simulation API Routes

This document describes the simulation endpoints for the AI Packaging Optimizer platform.

## Overview

The simulation endpoints allow users to upload CSV files containing order data, process simulations to compare optimized vs. baseline packing, and generate PDF reports showing potential cost savings.

## Authentication

All simulation endpoints require authentication using a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Endpoints

### 1. Upload CSV File

**POST** `/api/simulation/upload`

Upload a CSV file containing order data for simulation.

**Requirements:** 6.1, 6.2, 6.14, 21.5, 21.6

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field containing CSV file
- Max file size: 50 MB

**CSV Format:**
```csv
order_id,item_length,item_width,item_height,item_weight,quantity
order-1,10,8,5,1.5,2
order-1,12,10,6,2.0,1
order-2,15,12,8,3.0,1
```

**Required Columns:**
- `order_id`: Unique identifier for the order
- `item_length`: Item length in cm (positive number)
- `item_width`: Item width in cm (positive number)
- `item_height`: Item height in cm (positive number)
- `item_weight`: Item weight in kg (non-negative number)
- `quantity`: Number of items (positive integer)

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "job": {
      "jobId": "uuid",
      "userId": "uuid",
      "fileName": "orders.csv",
      "totalOrders": 10,
      "status": "PENDING",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file format, missing columns, or file size exceeds limit
- `401 Unauthorized`: Missing or invalid authentication token

---

### 2. Process Simulation

**POST** `/api/simulation/:jobId/process`

Process a simulation job to calculate optimized vs. baseline packing costs.

**Requirements:** 7.1-7.17

**URL Parameters:**
- `jobId`: UUID of the simulation job

**Request Body:**
```json
{
  "bufferPadding": 2,
  "volumetricDivisor": 5000,
  "shippingRatePerKg": 0.5,
  "maxWeightOverride": 25
}
```

**Parameters:**
- `bufferPadding` (optional): Buffer padding in cm (default: 2, min: 0)
- `volumetricDivisor` (optional): Volumetric weight divisor (default: 5000, must be positive)
- `shippingRatePerKg` (optional): Shipping rate per kg (default: 0.5, must be positive)
- `maxWeightOverride` (optional): Maximum weight override in kg (must be positive)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "result": {
      "simulationId": "uuid",
      "jobId": "uuid",
      "optimizedResults": [...],
      "baselineResults": [...],
      "comparison": {
        "totalOrdersProcessed": 10,
        "optimizedTotalCost": 100.50,
        "baselineTotalCost": 120.00,
        "totalSavings": 19.50,
        "savingsPercentage": 16.25,
        "averageUtilizationOptimized": 75.5,
        "averageUtilizationBaseline": 60.2,
        "volumetricWeightReduction": 15.3
      },
      "savings": {
        "perOrderSavings": 1.95,
        "monthlySavings": 585.00,
        "annualSavings": 7020.00,
        "isRealistic": true,
        "confidenceLevel": 0.8
      },
      "recommendations": [
        "Significant savings potential detected..."
      ],
      "anomalyWarnings": []
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Job not in PENDING status or invalid parameters
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User does not own the simulation job
- `404 Not Found`: Simulation job not found

---

### 3. Get Job Status

**GET** `/api/simulation/:jobId/status`

Get the current status of a simulation job.

**Requirements:** 6.11, 7.15, 7.16

**URL Parameters:**
- `jobId`: UUID of the simulation job

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "job": {
      "jobId": "uuid",
      "userId": "uuid",
      "fileName": "orders.csv",
      "totalOrders": 10,
      "status": "PROCESSING",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Job Status Values:**
- `PENDING`: Job created, waiting to be processed
- `PROCESSING`: Job is currently being processed
- `COMPLETED`: Job completed successfully
- `FAILED`: Job processing failed

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User does not own the simulation job
- `404 Not Found`: Simulation job not found

---

### 4. Generate PDF Report

**GET** `/api/simulation/:simulationId/report`

Generate and download a PDF report for a completed simulation.

**Requirements:** 8.1-8.12

**URL Parameters:**
- `simulationId`: UUID of the simulation

**Response (200 OK):**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="simulation-report-{simulationId}.pdf"`
- Body: PDF file stream

**Report Contents:**
- Executive summary
- Key performance indicators (KPIs)
- Total orders processed
- Baseline vs. optimized costs
- Total savings and savings percentage
- Monthly and annual savings projections
- Average space utilization metrics
- Box usage distribution charts
- Cost comparison visualizations
- Recommendations
- Anomaly warnings (if any)

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User does not own the simulation
- `404 Not Found`: Simulation not found
- `500 Internal Server Error`: Report generation failed

---

### 5. Get Simulation History

**GET** `/api/simulation/history`

Get the user's simulation history.

**Requirements:** 6.12, 6.13

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "history": [
      {
        "simulationId": "uuid",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "totalOrders": 10,
        "savingsPercentage": 16.25,
        "totalSavings": 19.50
      },
      {
        "simulationId": "uuid",
        "createdAt": "2024-01-02T00:00:00.000Z",
        "totalOrders": 15,
        "savingsPercentage": 12.50,
        "totalSavings": 25.00
      }
    ]
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token

---

## Error Response Format

All error responses follow this format:

```json
{
  "status": "error",
  "message": "Error description",
  "statusCode": 400
}
```

## File Upload Validation

**File Size Limit:** 50 MB (Requirement 21.6)

**Allowed File Types:** CSV files only (`.csv` extension or `text/csv` MIME type)

**CSV Validation:**
- All required columns must be present
- Item dimensions must be positive numbers
- Item weight must be non-negative
- Quantity must be positive integer
- Invalid rows are skipped with error logging
- Warning generated if >10% of rows are invalid (Requirement 6.13)

## Security Features

**Requirements:** 21.1-21.15

- JWT token authentication required for all endpoints
- File size validation (max 50 MB)
- File type validation (CSV only)
- Input sanitization and validation
- User ownership verification for all operations
- Rate limiting (100 requests per minute per user)
- Uploaded CSV files deleted after processing (Requirement 21.14)

## Performance Considerations

**Requirements:** 22.1-22.13

- Single order optimization: < 100ms
- Batch of 1000 orders: < 30 seconds
- API responses: < 200ms
- Simulation processing timeout: 5 minutes (Requirement 7.17)
- CSV files streamed instead of loaded entirely into memory
- Database connection pooling
- Response compression

## Example Usage

### Complete Workflow

```bash
# 1. Upload CSV file
curl -X POST http://localhost:3000/api/simulation/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@orders.csv"

# Response: { "data": { "job": { "jobId": "abc-123", ... } } }

# 2. Check job status
curl -X GET http://localhost:3000/api/simulation/abc-123/status \
  -H "Authorization: Bearer <token>"

# 3. Process simulation
curl -X POST http://localhost:3000/api/simulation/abc-123/process \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bufferPadding": 2,
    "volumetricDivisor": 5000,
    "shippingRatePerKg": 0.5
  }'

# Response: { "data": { "result": { "simulationId": "xyz-789", ... } } }

# 4. Download PDF report
curl -X GET http://localhost:3000/api/simulation/xyz-789/report \
  -H "Authorization: Bearer <token>" \
  -o report.pdf

# 5. View simulation history
curl -X GET http://localhost:3000/api/simulation/history \
  -H "Authorization: Bearer <token>"
```

## Notes

- Simulations are user-scoped; users can only access their own simulations
- CSV files are automatically deleted after processing for security (Requirement 21.14)
- Report URLs expire after configured time period (Requirement 8.12)
- Free tier users can only access simulation mode (Requirement 25.1)
- Processing uses user configuration if available, otherwise uses request parameters
