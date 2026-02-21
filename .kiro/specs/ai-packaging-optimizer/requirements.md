# Requirements Document: AI Packaging Optimizer

## Introduction

The AI Packaging Optimizer is a production-grade B2B SaaS platform that addresses the volumetric weight inefficiency problem in logistics operations. The system targets D2C brands, Shopify sellers, small-to-mid ecommerce warehouses, and 3PL operators handling 100-500+ orders per day. By analyzing real shipment data and applying intelligent box selection algorithms, the platform demonstrates realistic cost savings in the 5-15% range through optimal packaging decisions.

The platform operates in three distinct modes: free simulation for lead generation, one-time optimization audits, and monthly SaaS subscriptions with API integration for live optimization. The system uses a predefined box catalog, applies realistic packaging constraints including buffer padding, and calculates both volumetric and billable weights according to carrier standards.

## Glossary

- **System**: The AI Packaging Optimizer platform
- **Packing_Engine**: Core optimization component that selects optimal boxes
- **Box_Catalog**: Predefined collection of available box sizes with dimensions and weight limits
- **Volumetric_Weight**: Calculated weight based on package dimensions (L × W × H / divisor)
- **Billable_Weight**: The greater of actual weight or volumetric weight, used for shipping cost calculation
- **Buffer_Padding**: Additional space added to item dimensions for packing materials (typically 0-5 cm)
- **Baseline_Simulation**: Representation of manual oversized packing for comparison
- **Simulation_Mode**: Free tier operation where users upload CSV files for analysis
- **Live_Optimization**: Real-time API-based box recommendation for active orders
- **Space_Utilization**: Percentage of box volume occupied by items
- **Subscription_Tier**: User access level (FREE, BASIC, PRO, ENTERPRISE)
- **Monthly_Quota**: Maximum number of orders a user can process per billing period
- **API_Key**: Authentication credential for programmatic access
- **Order**: Collection of items to be packed together
- **Item**: Individual product with dimensions, weight, and quantity

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As a platform user, I want secure authentication and role-based access control, so that my data and operations are protected.

#### Acceptance Criteria

1. WHEN a user registers with valid email and password, THE System SHALL create a new user account with hashed password
2. WHEN a user logs in with correct credentials, THE System SHALL generate JWT access and refresh tokens
3. WHEN a user provides an invalid password, THE System SHALL reject authentication and log the attempt
4. THE System SHALL hash all passwords using bcrypt with cost factor 12
5. THE System SHALL expire access tokens after 15 minutes
6. THE System SHALL expire refresh tokens after 7 days
7. WHEN a user requests token refresh with valid refresh token, THE System SHALL issue new access token
8. THE System SHALL assign role-based permissions (ADMIN, CUSTOMER, TRIAL)
9. WHEN a user generates an API key, THE System SHALL create a unique key and associate it with the user account
10. WHEN an API request includes a valid API key, THE System SHALL authenticate the request and identify the user

### Requirement 2: Box Catalog Management

**User Story:** As a system administrator, I want to manage the box catalog, so that the system can select from available packaging options.

#### Acceptance Criteria

1. WHEN an administrator adds a new box with valid dimensions and weight, THE System SHALL persist the box to the catalog
2. THE System SHALL validate that box length, width, and height are positive numbers
3. THE System SHALL validate that max weight is a positive number
4. THE System SHALL calculate box volume as length × width × height
5. WHEN an administrator updates box properties, THE System SHALL persist the changes and update the timestamp
6. WHEN an administrator deactivates a box, THE System SHALL mark it inactive without deletion
7. THE System SHALL exclude inactive boxes from optimization queries
8. WHEN querying suitable boxes for given dimensions and weight, THE System SHALL return only boxes that can accommodate both constraints
9. THE System SHALL sort suitable boxes by volume in ascending order
10. THE System SHALL track usage statistics for each box including usage count and average utilization

### Requirement 3: Core Packing Optimization

**User Story:** As a logistics operator, I want the system to select optimal boxes for my orders, so that I minimize shipping costs while ensuring items fit safely.

#### Acceptance Criteria

1. WHEN an order is submitted for optimization, THE Packing_Engine SHALL expand items by quantity
2. THE Packing_Engine SHALL sort expanded items by volume in descending order
3. THE Packing_Engine SHALL calculate total dimensions assuming vertical stacking strategy
4. THE Packing_Engine SHALL add buffer padding to all three dimensions (2 × padding per dimension)
5. WHEN calculating total dimensions, THE Packing_Engine SHALL use maximum length and width across all items
6. WHEN calculating total dimensions, THE Packing_Engine SHALL sum all item heights
7. THE Packing_Engine SHALL query the Box_Catalog for boxes that fit the total dimensions and weight
8. WHEN multiple suitable boxes exist, THE Packing_Engine SHALL select the box with smallest volume
9. WHEN no suitable box exists, THE Packing_Engine SHALL return invalid result with rejection reason
10. THE Packing_Engine SHALL calculate volumetric weight as (box length × box width × box height) / volumetric divisor
11. THE Packing_Engine SHALL calculate billable weight as the maximum of actual weight and volumetric weight
12. THE Packing_Engine SHALL calculate shipping cost as billable weight × shipping rate per kg
13. THE Packing_Engine SHALL calculate space utilization as (items volume / box volume) × 100
14. THE Packing_Engine SHALL validate that space utilization does not exceed 100 percent
15. THE Packing_Engine SHALL validate that total weight does not exceed selected box max weight

### Requirement 4: Volumetric and Billable Weight Calculation

**User Story:** As a logistics operator, I want accurate weight calculations following carrier standards, so that cost estimates are realistic.

#### Acceptance Criteria

1. WHEN calculating volumetric weight, THE System SHALL use the formula (L × W × H) / volumetric_divisor
2. THE System SHALL support configurable volumetric divisor (typically 4000-6000)
3. WHEN calculating billable weight, THE System SHALL return the maximum of actual weight and volumetric weight
4. THE System SHALL ensure billable weight is greater than or equal to actual weight
5. THE System SHALL ensure billable weight is greater than or equal to volumetric weight
6. THE System SHALL validate that volumetric divisor is a positive number
7. THE System SHALL validate that all dimensions used in calculations are positive

### Requirement 5: Baseline Simulation for Comparison

**User Story:** As a sales prospect, I want to see how my current manual packing compares to optimized packing, so that I understand potential savings.

#### Acceptance Criteria

1. WHEN simulating baseline packing for an order, THE System SHALL select a box larger than the optimized box
2. THE System SHALL use "next larger box" strategy for baseline selection
3. WHEN the optimized box is already the largest available, THE System SHALL use the same box for baseline
4. THE System SHALL calculate baseline volumetric weight using the larger box dimensions
5. THE System SHALL calculate baseline billable weight as maximum of actual weight and baseline volumetric weight
6. THE System SHALL calculate baseline shipping cost using baseline billable weight
7. THE System SHALL ensure baseline shipping cost is greater than or equal to optimized shipping cost
8. THE System SHALL represent realistic manual oversized packing behavior

### Requirement 6: CSV Upload and Parsing

**User Story:** As a user in simulation mode, I want to upload my order data via CSV, so that the system can analyze my shipping costs.

#### Acceptance Criteria

1. WHEN a user uploads a file, THE System SHALL validate that the file is CSV format
2. THE System SHALL validate that the CSV contains required columns: order_id, item_length, item_width, item_height, item_weight, quantity
3. WHEN required columns are missing, THE System SHALL reject the upload with descriptive error message
4. THE System SHALL parse each data row and extract item properties
5. THE System SHALL validate that item dimensions are positive numbers
6. THE System SHALL validate that item weight is non-negative
7. THE System SHALL validate that quantity is a positive integer
8. WHEN a row contains invalid data, THE System SHALL skip the row and log the error
9. THE System SHALL group items by order_id into orders
10. THE System SHALL calculate total weight for each order as sum of (item weight × quantity)
11. THE System SHALL create a simulation job with PENDING status
12. THE System SHALL persist all valid orders to the database
13. WHEN more than 10 percent of rows are invalid, THE System SHALL generate an anomaly warning
14. THE System SHALL limit CSV file size to 50 MB maximum

### Requirement 7: Simulation Processing

**User Story:** As a user in simulation mode, I want the system to process my uploaded orders and show savings potential, so that I can make informed purchasing decisions.

#### Acceptance Criteria

1. WHEN simulation processing begins, THE System SHALL update job status to PROCESSING
2. THE System SHALL process each order through the Packing_Engine for optimization
3. THE System SHALL process each successfully optimized order through baseline simulation
4. WHEN an order fails optimization, THE System SHALL increment failed order count and continue processing
5. THE System SHALL calculate total optimized cost as sum of all optimized shipping costs
6. THE System SHALL calculate total baseline cost as sum of all baseline shipping costs
7. THE System SHALL calculate total savings as baseline cost minus optimized cost
8. THE System SHALL calculate savings percentage as (total savings / baseline cost) × 100
9. THE System SHALL calculate average space utilization across all optimized results
10. WHEN savings percentage exceeds 25 percent, THE System SHALL add anomaly warning
11. THE System SHALL calculate per-order savings as total savings divided by successful order count
12. THE System SHALL calculate monthly savings projection based on order volume
13. THE System SHALL calculate annual savings as monthly savings × 12
14. THE System SHALL generate recommendations based on optimization results
15. WHEN processing completes successfully, THE System SHALL update job status to COMPLETED
16. WHEN processing fails, THE System SHALL update job status to FAILED and log error details
17. THE System SHALL enforce 5-minute timeout for simulation processing

### Requirement 8: PDF Report Generation

**User Story:** As a user in simulation mode, I want to download a professional PDF report, so that I can share results with stakeholders.

#### Acceptance Criteria

1. WHEN a user requests a report for completed simulation, THE System SHALL generate a PDF document
2. THE System SHALL include total orders processed in the report
3. THE System SHALL include baseline cost, optimized cost, and total savings in the report
4. THE System SHALL include savings percentage in the report
5. THE System SHALL include monthly and annual savings projections in the report
6. THE System SHALL include average space utilization metrics in the report
7. THE System SHALL include box usage distribution charts in the report
8. THE System SHALL include cost comparison visualizations in the report
9. THE System SHALL include recommendations and anomaly warnings in the report
10. THE System SHALL generate a unique download URL for the report
11. THE System SHALL set report URL expiration time
12. WHEN report URL expires, THE System SHALL return error on access attempt

### Requirement 9: Live Optimization API

**User Story:** As an integrated customer, I want to call an API for real-time box recommendations, so that my warehouse system can optimize packing automatically.

#### Acceptance Criteria

1. WHEN an API request is received, THE System SHALL validate the API key
2. WHEN API key is invalid, THE System SHALL return HTTP 401 Unauthorized
3. WHEN API key is valid, THE System SHALL identify the associated user
4. THE System SHALL validate that the user has an active subscription
5. THE System SHALL check the user's monthly quota before processing
6. WHEN quota is exceeded for non-enterprise tier, THE System SHALL return HTTP 429 Too Many Requests
7. WHEN quota is available, THE System SHALL process the order through the Packing_Engine
8. THE System SHALL return the selected box with dimensions and properties
9. THE System SHALL return billable weight and estimated shipping cost
10. THE System SHALL return space utilization percentage
11. THE System SHALL increment the user's usage counter after successful optimization
12. THE System SHALL store the optimization record in the database
13. THE System SHALL enforce rate limiting of 100 requests per minute per user
14. THE System SHALL log all API calls for audit purposes

### Requirement 10: Subscription Management

**User Story:** As a customer, I want to manage my subscription tier, so that I can access features appropriate to my business needs.

#### Acceptance Criteria

1. WHEN a user subscribes to a tier, THE System SHALL create a subscription record with tier, quota, and pricing
2. THE System SHALL set subscription status to ACTIVE
3. THE System SHALL set renewal date based on billing period
4. THE System SHALL support subscription tiers: FREE, BASIC, PRO, ENTERPRISE
5. WHEN a user upgrades subscription, THE System SHALL update tier and quota immediately
6. WHEN a user downgrades subscription, THE System SHALL apply changes at next renewal date
7. WHEN a user cancels subscription, THE System SHALL set status to CANCELLED and maintain access until renewal date
8. THE System SHALL track current usage against monthly quota
9. THE System SHALL reset usage counter at the start of each billing period
10. WHEN usage exceeds quota for non-enterprise tier, THE System SHALL prevent further processing
11. WHERE subscription tier is ENTERPRISE, THE System SHALL provide unlimited monthly quota
12. THE System SHALL calculate overage charges for enterprise tier based on usage
13. THE System SHALL support auto-renewal configuration
14. THE System SHALL generate invoices for each billing period

### Requirement 11: Usage Tracking and Quota Enforcement

**User Story:** As a platform operator, I want to track usage and enforce quotas, so that the business model is sustainable and fair.

#### Acceptance Criteria

1. WHEN a user processes orders, THE System SHALL increment usage counter by order count
2. THE System SHALL store usage records with timestamp and order count
3. THE System SHALL calculate cumulative usage for current billing period
4. WHEN checking quota, THE System SHALL compare current usage plus requested orders against monthly quota
5. THE System SHALL return quota status including monthly quota, current usage, remaining quota, and percentage used
6. WHEN quota would be exceeded, THE System SHALL set isExceeded flag to true
7. WHERE subscription tier is ENTERPRISE, THE System SHALL never set isExceeded flag
8. THE System SHALL provide usage history for specified date ranges
9. THE System SHALL support querying usage by day, week, or month
10. THE System SHALL persist all usage records for billing and analytics

### Requirement 12: Analytics Dashboard KPIs

**User Story:** As a customer, I want to view comprehensive analytics about my packaging optimization, so that I can track ROI and identify improvement opportunities.

#### Acceptance Criteria

1. WHEN a user requests dashboard KPIs, THE System SHALL calculate total orders processed in date range
2. THE System SHALL calculate total manual shipping cost (baseline)
3. THE System SHALL calculate total optimized shipping cost
4. THE System SHALL calculate total savings and savings percentage
5. THE System SHALL calculate average volumetric weight reduction
6. THE System SHALL calculate average space utilization
7. THE System SHALL identify most used box size by usage count
8. THE System SHALL identify most inefficient box size by wasted volume
9. THE System SHALL calculate monthly savings projection based on current period data
10. THE System SHALL calculate annual savings projection as monthly × 12
11. THE System SHALL support date range filtering for all KPI calculations
12. THE System SHALL return KPIs within 500 milliseconds for typical datasets

### Requirement 13: Cost Trend Analysis

**User Story:** As a customer, I want to see cost trends over time, so that I can understand how optimization impacts my shipping expenses.

#### Acceptance Criteria

1. WHEN a user requests cost trend data, THE System SHALL aggregate costs by specified time granularity
2. THE System SHALL support daily, weekly, and monthly granularity
3. THE System SHALL calculate manual cost for each time period
4. THE System SHALL calculate optimized cost for each time period
5. THE System SHALL calculate savings for each time period
6. THE System SHALL determine overall trend direction (increasing, decreasing, stable)
7. THE System SHALL return data points with timestamps and cost values
8. THE System SHALL support date range filtering
9. THE System SHALL handle periods with no data gracefully

### Requirement 14: Box Usage Distribution Analysis

**User Story:** As a customer, I want to see which boxes are used most frequently, so that I can optimize my box inventory.

#### Acceptance Criteria

1. WHEN a user requests box usage distribution, THE System SHALL aggregate usage by box ID
2. THE System SHALL calculate usage count for each box
3. THE System SHALL calculate percentage of total usage for each box
4. THE System SHALL calculate average utilization for each box
5. THE System SHALL sort results by usage count descending
6. THE System SHALL support date range filtering
7. THE System SHALL include box name and dimensions in results

### Requirement 15: Space Waste Analysis

**User Story:** As a customer, I want to identify packaging inefficiencies, so that I can improve my box selection strategy.

#### Acceptance Criteria

1. WHEN a user requests space waste heatmap, THE System SHALL aggregate wasted volume by box and time period
2. THE System SHALL calculate waste percentage for each box-period combination
3. THE System SHALL include order count for each cell
4. THE System SHALL identify maximum and minimum waste values
5. THE System SHALL support date range filtering
6. THE System SHALL return data in matrix format suitable for heatmap visualization

### Requirement 16: Weight Distribution Analysis

**User Story:** As a customer, I want to understand weight distributions in my orders, so that I can identify volumetric weight optimization opportunities.

#### Acceptance Criteria

1. WHEN a user requests weight distribution, THE System SHALL create buckets for actual weight
2. THE System SHALL create buckets for volumetric weight
3. THE System SHALL create buckets for billable weight
4. THE System SHALL count orders in each bucket
5. THE System SHALL calculate percentage for each bucket
6. THE System SHALL use appropriate bucket ranges based on data distribution
7. THE System SHALL support date range filtering

### Requirement 17: Demand Forecasting

**User Story:** As a customer, I want to forecast future packaging demand, so that I can plan inventory and budget.

#### Acceptance Criteria

1. WHEN a user requests demand forecast, THE System SHALL analyze historical order patterns
2. THE System SHALL generate predictions for specified number of future months
3. THE System SHALL predict order volume for each month
4. THE System SHALL predict shipping costs for each month
5. THE System SHALL predict savings for each month
6. THE System SHALL calculate confidence level for predictions
7. THE System SHALL document forecasting methodology used
8. THE System SHALL require minimum historical data for reliable forecasting

### Requirement 18: Batch Order Processing

**User Story:** As a customer, I want to optimize multiple orders in a single request, so that I can process efficiently.

#### Acceptance Criteria

1. WHEN a batch of orders is submitted, THE System SHALL process each order independently
2. THE System SHALL track successful and failed packing attempts
3. THE System SHALL calculate total cost across all successful packings
4. THE System SHALL calculate average utilization across all results
5. THE System SHALL return batch result with individual order results
6. THE System SHALL continue processing remaining orders when one fails
7. THE System SHALL include failure reasons for rejected orders
8. THE System SHALL enforce quota based on total order count in batch

### Requirement 19: Configuration Management

**User Story:** As a customer, I want to configure optimization parameters, so that the system matches my operational requirements.

#### Acceptance Criteria

1. WHEN a user creates configuration, THE System SHALL persist buffer padding setting
2. THE System SHALL persist volumetric divisor setting
3. THE System SHALL persist shipping rate per kg setting
4. THE System SHALL persist optional max weight override
5. THE System SHALL persist baseline box selection strategy
6. THE System SHALL validate that buffer padding is non-negative
7. THE System SHALL validate that volumetric divisor is positive
8. THE System SHALL validate that shipping rate is positive
9. WHEN a user updates configuration, THE System SHALL persist changes with timestamp
10. THE System SHALL apply user configuration to all optimization requests
11. THE System SHALL support per-user configuration isolation

### Requirement 20: Error Handling and Validation

**User Story:** As a user, I want clear error messages when operations fail, so that I can correct issues and retry.

#### Acceptance Criteria

1. WHEN CSV upload has invalid format, THE System SHALL return HTTP 400 with detailed error message
2. WHEN CSV is missing required columns, THE System SHALL list all missing columns in error response
3. WHEN no suitable box is found for an order, THE System SHALL return rejection reason specifying constraint violation
4. WHEN quota is exceeded, THE System SHALL return HTTP 429 with quota status details
5. WHEN API key is invalid, THE System SHALL return HTTP 401 with generic error message
6. WHEN database connection fails, THE System SHALL return HTTP 503 and implement retry logic
7. WHEN simulation processing times out, THE System SHALL update job status to FAILED and notify user
8. WHEN box dimensions are invalid, THE System SHALL return validation errors for each invalid field
9. WHEN concurrent subscription modifications occur, THE System SHALL return HTTP 409 and use optimistic locking
10. THE System SHALL log all errors with sufficient context for debugging
11. THE System SHALL provide user-friendly error messages without exposing internal details

### Requirement 21: Security and Data Protection

**User Story:** As a platform user, I want my data protected and secure, so that I can trust the platform with sensitive business information.

#### Acceptance Criteria

1. THE System SHALL encrypt all passwords using bcrypt with cost factor 12
2. THE System SHALL use TLS 1.3 for all API communications
3. THE System SHALL validate and sanitize all user inputs to prevent injection attacks
4. THE System SHALL implement CSRF protection for web forms
5. THE System SHALL validate uploaded file type, size, and content
6. THE System SHALL limit file uploads to 50 MB maximum
7. THE System SHALL scan uploaded files for malicious content
8. THE System SHALL use parameterized queries to prevent SQL injection
9. THE System SHALL encrypt sensitive data at rest using AES-256
10. THE System SHALL implement rate limiting of 100 requests per minute per user
11. THE System SHALL rotate API keys according to 90-day policy
12. THE System SHALL audit log all API calls with user ID and timestamp
13. THE System SHALL implement IP whitelisting for enterprise customers
14. THE System SHALL delete uploaded CSV files after processing completes
15. THE System SHALL implement data retention policies (90 days for free tier)

### Requirement 22: Performance and Scalability

**User Story:** As a platform operator, I want the system to perform efficiently at scale, so that we can serve growing customer base.

#### Acceptance Criteria

1. THE System SHALL process single order optimization in less than 100 milliseconds
2. THE System SHALL process batch of 1000 orders in less than 30 seconds
3. THE System SHALL return API responses in less than 200 milliseconds
4. THE System SHALL return analytics queries in less than 500 milliseconds
5. THE System SHALL return dashboard KPIs in less than 1 second
6. THE System SHALL support concurrent simulation processing
7. THE System SHALL implement job queue for large CSV file processing
8. THE System SHALL use database connection pooling
9. THE System SHALL cache box catalog queries
10. THE System SHALL index database tables on user_id, order_id, and simulation_id
11. THE System SHALL implement response compression for API responses
12. THE System SHALL stream large CSV files instead of loading entirely into memory
13. THE System SHALL implement pagination for large result sets

### Requirement 23: Monitoring and Observability

**User Story:** As a platform operator, I want comprehensive monitoring and logging, so that I can maintain system health and troubleshoot issues.

#### Acceptance Criteria

1. THE System SHALL log all authentication attempts with outcome
2. THE System SHALL log all API requests with user ID, endpoint, and response time
3. THE System SHALL log all errors with stack traces and context
4. THE System SHALL log all quota violations with user ID and requested amount
5. THE System SHALL log all CSV parsing errors with row numbers
6. THE System SHALL collect metrics on API response times
7. THE System SHALL collect metrics on optimization processing times
8. THE System SHALL collect metrics on database query performance
9. THE System SHALL alert on error rate thresholds
10. THE System SHALL alert on API response time degradation
11. THE System SHALL alert on database connection failures
12. THE System SHALL provide health check endpoint for monitoring systems

### Requirement 24: Data Consistency and Integrity

**User Story:** As a platform operator, I want data consistency across all operations, so that analytics and billing are accurate.

#### Acceptance Criteria

1. WHEN creating simulation job, THE System SHALL use database transactions to ensure atomicity
2. WHEN updating subscription, THE System SHALL use optimistic locking to prevent concurrent modification conflicts
3. WHEN incrementing usage, THE System SHALL use atomic operations to prevent race conditions
4. THE System SHALL validate foreign key relationships before persisting data
5. THE System SHALL enforce unique constraints on email addresses and API keys
6. THE System SHALL maintain referential integrity between orders and simulation jobs
7. THE System SHALL maintain referential integrity between users and subscriptions
8. WHEN transaction fails, THE System SHALL rollback all changes
9. THE System SHALL validate data types and constraints at database level
10. THE System SHALL implement database backups with encryption

### Requirement 25: API Documentation and Developer Experience

**User Story:** As an API consumer, I want comprehensive documentation and clear error messages, so that I can integrate successfully.

#### Acceptance Criteria

1. THE System SHALL provide OpenAPI specification for all API endpoints
2. THE System SHALL document all request parameters with types and constraints
3. THE System SHALL document all response schemas with examples
4. THE System SHALL document all error codes and their meanings
5. THE System SHALL provide code examples in multiple languages
6. THE System SHALL provide interactive API documentation
7. THE System SHALL version API endpoints to support backward compatibility
8. THE System SHALL return consistent error response format across all endpoints
9. THE System SHALL include request ID in all API responses for tracing
10. THE System SHALL provide webhook documentation for asynchronous notifications

## Constraints and Assumptions

### Technical Constraints

1. The system assumes vertical stacking strategy for calculating total dimensions
2. Box catalog must contain at least one active box for optimization to succeed
3. CSV files are limited to 50 MB maximum size
4. Simulation processing has 5-minute timeout limit
5. API rate limiting is set at 100 requests per minute per user
6. Database queries must complete within connection timeout limits
7. JWT access tokens expire after 15 minutes
8. PDF report URLs expire after configured time period

### Business Constraints

1. Free tier users can only access simulation mode, not live API
2. Non-enterprise tiers have fixed monthly quotas that cannot be exceeded
3. Savings percentage exceeding 25% triggers anomaly warnings
4. Data retention for free tier is limited to 90 days
5. API key rotation policy requires renewal every 90 days
6. Subscription changes take effect immediately for upgrades, at renewal for downgrades
7. Minimum historical data required for reliable demand forecasting

### Operational Assumptions

1. Users provide accurate item dimensions and weights in CSV uploads
2. Box catalog is maintained and kept current by administrators
3. Volumetric divisor values reflect actual carrier policies (typically 4000-6000)
4. Shipping rates per kg are configured to match actual carrier rates
5. Buffer padding values (0-5 cm) are appropriate for packing materials used
6. Baseline simulation using "next larger box" represents realistic manual packing behavior
7. Orders contain items that can be packed together (no special handling requirements)
8. All dimensions are in centimeters and weights are in kilograms
9. Items can be oriented in any direction for optimal packing
10. Multiple items in an order can be stacked vertically

### Security Assumptions

1. Users maintain confidentiality of their API keys
2. TLS/SSL certificates are properly configured and maintained
3. Database credentials are securely stored and rotated regularly
4. File upload scanning service is operational and up-to-date
5. Rate limiting infrastructure is properly configured
6. Monitoring and alerting systems are actively monitored

### Scalability Assumptions

1. Database can be scaled horizontally with read replicas
2. Application servers can be scaled horizontally behind load balancer
3. Job queue system can handle concurrent processing
4. File storage system has sufficient capacity for CSV uploads
5. CDN is configured for static asset delivery
6. Caching layer is properly configured and maintained
