# User Guide - AI Packaging Optimizer

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Running Simulations](#running-simulations)
4. [Box Catalog Management](#box-catalog-management)
5. [Analytics](#analytics)
6. [Subscription Management](#subscription-management)
7. [API Integration](#api-integration)
8. [Configuration](#configuration)
9. [FAQ](#faq)

## Getting Started

### Creating an Account

1. Navigate to the registration page
2. Enter your email address
3. Create a strong password (minimum 8 characters)
4. Click "Create Account"
5. You'll be automatically logged in and redirected to the dashboard

### First Login

After registration, you'll see the dashboard with initial KPIs showing zero values. To get started:

1. Add boxes to your catalog
2. Upload a CSV file with your order data
3. Run a simulation to see potential savings

## Dashboard Overview

The dashboard provides a quick overview of your packaging optimization metrics:

### Key Performance Indicators (KPIs)

- **Total Orders Processed**: Number of orders analyzed
- **Manual Shipping Cost**: Total cost using baseline (larger) boxes
- **Optimized Shipping Cost**: Total cost using optimized boxes
- **Total Savings**: Amount saved through optimization
- **Savings Percentage**: Percentage reduction in shipping costs
- **Average Space Utilization**: How efficiently boxes are being used
- **Monthly Savings**: Projected monthly savings
- **Annual Savings**: Projected annual savings

### Charts

- **Cost Trend**: Line chart showing manual vs optimized costs over time
- **Box Usage Distribution**: Bar chart showing which boxes are used most frequently

### Date Range Filtering

Use the date picker to filter data for specific time periods:
- Last 7 days
- Last 30 days
- Last 90 days
- Custom range

## Running Simulations

Simulations analyze your historical order data to show potential savings.

### Step 1: Prepare Your CSV File

Your CSV file must include these columns:
- `order_id`: Unique identifier for each order
- `item_length`: Length in cm
- `item_width`: Width in cm
- `item_height`: Height in cm
- `item_weight`: Weight in kg
- `quantity`: Number of items

**Example CSV:**
```csv
order_id,item_length,item_width,item_height,item_weight,quantity
ORD001,10,8,6,2,1
ORD002,15,12,10,5,2
ORD003,8,8,8,3,1
```

### Step 2: Upload CSV File

1. Navigate to the "Simulation" page
2. Click the upload area or drag and drop your CSV file
3. Wait for the upload to complete
4. Review the upload summary (total orders, any warnings)

### Step 3: Process Simulation

1. Click "Process Simulation"
2. Wait for processing to complete (typically 10-30 seconds for 1000 orders)
3. View the results

### Step 4: Review Results

The results page shows:

**Comparison Metrics:**
- Baseline (manual) cost
- Optimized cost
- Total savings
- Savings percentage

**Savings Analysis:**
- Per-order savings
- Monthly projection
- Annual projection
- Confidence level

**Recommendations:**
- Suggested actions based on results
- Anomaly warnings (if any)

**Detailed Results Table:**
- Order-by-order breakdown
- Box recommendations
- Individual savings

### Step 5: Download PDF Report

Click "Download PDF Report" to get a comprehensive report including:
- Executive summary
- Cost comparison charts
- Box usage distribution
- Detailed recommendations
- Order-level details

## Box Catalog Management

The box catalog defines the available packaging options.

### Adding a New Box

1. Navigate to "Box Catalog"
2. Click "Add Box"
3. Enter box details:
   - **Name**: Descriptive name (e.g., "Small Box")
   - **Length**: Length in cm
   - **Width**: Width in cm
   - **Height**: Height in cm
   - **Max Weight**: Maximum weight capacity in kg
   - **Cost**: Box cost in your currency
4. Click "Create"

### Editing a Box

1. Find the box in the catalog table
2. Click the "Edit" button
3. Update the desired fields
4. Click "Save"

### Deactivating a Box

1. Find the box in the catalog table
2. Click the "Deactivate" button
3. Confirm the action

**Note:** Deactivated boxes won't be used in future optimizations but historical data remains intact.

### Box Usage Statistics

View statistics for each box:
- Total times used
- Average space utilization
- Average weight utilization
- Total cost savings attributed to this box

## Analytics

The analytics page provides deep insights into your packaging performance.

### Space Waste Heatmap

Visual representation of wasted space by:
- Box type (rows)
- Time period (columns)
- Color intensity indicates waste percentage

Use this to identify:
- Which boxes are consistently underutilized
- Time periods with high waste
- Opportunities for catalog optimization

### Weight Distribution

Three histograms showing:
- **Actual Weight**: Physical weight of items
- **Volumetric Weight**: Calculated based on dimensions
- **Billable Weight**: The higher of actual or volumetric

Use this to understand:
- Whether you're paying for actual or volumetric weight
- Opportunities to reduce dimensional weight

### Demand Forecasting

Predictive analytics showing:
- Expected order volume for next 3-6 months
- Projected shipping costs
- Projected savings
- Confidence level

Use this for:
- Budget planning
- Capacity planning
- ROI projections

## Subscription Management

### Subscription Tiers

**FREE Tier:**
- 100 orders per month
- Basic analytics
- CSV simulations
- Email support

**BASIC Tier ($29/month):**
- 1,000 orders per month
- Advanced analytics
- API access
- Priority support

**PROFESSIONAL Tier ($99/month):**
- 10,000 orders per month
- All analytics features
- API access with higher limits
- Dedicated support
- Custom reporting

**ENTERPRISE Tier (Custom pricing):**
- Unlimited orders
- White-label options
- Custom integrations
- SLA guarantees
- Account manager

### Upgrading Your Subscription

1. Navigate to "Subscription"
2. Review available plans
3. Click "Upgrade" on desired tier
4. Confirm the change
5. Upgrade takes effect immediately

### Downgrading Your Subscription

1. Navigate to "Subscription"
2. Click "Downgrade" on desired tier
3. Confirm the change
4. Downgrade takes effect at next renewal date

### Monitoring Quota Usage

The subscription page shows:
- Current usage vs quota
- Percentage used (with visual progress bar)
- Remaining quota
- Days until renewal

**Quota Warnings:**
- Yellow warning at 80% usage
- Red alert at 100% usage
- Suggestions to upgrade if approaching limit

## API Integration

For programmatic access to optimization services.

### Generating an API Key

1. Navigate to "API Integration"
2. Click "Generate New Key"
3. Copy the key immediately (shown only once)
4. Store securely

**Security Best Practices:**
- Never commit API keys to version control
- Rotate keys every 90 days
- Use environment variables
- Restrict key permissions if possible

### Using the API

**Example: Optimize a Single Order**

```bash
curl -X POST https://api.packaging-optimizer.com/api/optimize \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD001",
    "items": [
      {"length": 10, "width": 8, "height": 6, "weight": 2, "quantity": 1}
    ]
  }'
```

**Response:**
```json
{
  "orderId": "ORD001",
  "recommendedBox": {
    "name": "Small Box",
    "dimensions": {"length": 12, "width": 10, "height": 8}
  },
  "costs": {
    "shippingCost": 1.25
  },
  "utilization": {
    "spaceUtilization": 62.5
  }
}
```

### API Usage Monitoring

The API Integration page shows:
- Total API calls (daily/weekly/monthly)
- Average response time
- Error rate
- Quota usage specific to API calls

### Code Examples

View code examples in multiple languages:
- JavaScript/TypeScript
- Python
- PHP
- Ruby
- Java
- C#

## Configuration

Customize optimization parameters to match your business needs.

### Buffer Padding

**Default:** 0.1 (10%)

Additional space added to calculated dimensions to account for:
- Packing material
- Item irregularities
- Safety margin

**Recommended Range:** 0.05 - 0.20 (5% - 20%)

### Volumetric Divisor

**Default:** 166

Used to calculate volumetric weight: (L × W × H) / divisor

Common values:
- **166**: DHL, FedEx International
- **139**: UPS
- **200**: Some regional carriers

**Check with your carrier for the correct value.**

### Shipping Rate

**Default:** 0.50 per kg

Cost per kilogram of billable weight.

**Update this to match your actual carrier rates.**

### Max Weight Override

**Default:** None

Optional maximum weight limit across all boxes.

Use this if your carrier has a universal weight limit.

### Baseline Strategy

**Default:** NEXT_LARGER

How baseline (manual) packing is simulated:
- **NEXT_LARGER**: Use the next larger box than optimized
- **LARGEST**: Always use the largest box
- **RANDOM**: Random box selection

**Recommendation:** Keep as NEXT_LARGER for realistic comparisons.

### Saving Configuration

1. Update desired settings
2. Click "Save Configuration"
3. Changes apply to future optimizations immediately
4. Historical data remains unchanged

### Reset to Defaults

Click "Reset to Defaults" to restore all settings to recommended values.

## FAQ

### How accurate are the savings projections?

Savings projections are based on your actual order data and current box catalog. Accuracy depends on:
- Data quality (complete, accurate dimensions)
- Box catalog completeness
- Configuration accuracy (rates, divisor)

Typical accuracy: ±5% for well-configured systems.

### What if I don't have historical order data?

You can:
1. Use sample data to understand the system
2. Start collecting data going forward
3. Manually enter representative orders
4. Use the API for real-time optimization

### Can I use multiple box catalogs?

Currently, one catalog per account. Enterprise plans can have multiple catalogs for different warehouses or regions.

### How often should I run simulations?

Recommended frequency:
- **Weekly**: For active businesses
- **Monthly**: For stable operations
- **After changes**: When adding new boxes or changing carriers

### What file size limits apply?

- **CSV Upload**: 50MB maximum
- **Orders per file**: No hard limit, but 10,000+ may take longer to process
- **API requests**: 100 orders per batch request

### How is my data secured?

- All data encrypted in transit (TLS 1.3)
- Encryption at rest (AES-256)
- Regular security audits
- SOC 2 Type II compliant (Enterprise)
- GDPR compliant

### Can I export my data?

Yes, you can export:
- Simulation results (PDF, CSV)
- Box catalog (CSV)
- Analytics data (CSV)
- API usage logs (CSV)

### What happens if I exceed my quota?

- **Simulations**: Blocked until next renewal or upgrade
- **API calls**: Return 429 error
- **Analytics**: Continue to work with existing data

You'll receive warnings at 80% and 100% usage.

### How do I cancel my subscription?

1. Navigate to Subscription page
2. Click "Cancel Subscription"
3. Confirm cancellation
4. Access continues until end of billing period
5. Data retained for 90 days after cancellation

### Can I get a refund?

- **Monthly plans**: No refunds, cancel anytime
- **Annual plans**: Pro-rated refunds within 30 days
- **Enterprise**: Per contract terms

## Support

### Getting Help

- **Email**: support@packaging-optimizer.com
- **Live Chat**: Available on all pages (Business hours)
- **Documentation**: https://docs.packaging-optimizer.com
- **Status Page**: https://status.packaging-optimizer.com

### Response Times

- **FREE**: 48 hours
- **BASIC**: 24 hours
- **PROFESSIONAL**: 12 hours
- **ENTERPRISE**: 4 hours (SLA guaranteed)

### Feature Requests

Submit feature requests through:
- In-app feedback form
- Email to features@packaging-optimizer.com
- Community forum

We review all requests and prioritize based on user demand.
