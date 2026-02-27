# 🎯 HOW TO USE YOUR APPLICATION

**Your app is running at:** http://localhost:3000

---

## 📱 STEP-BY-STEP GUIDE

### STEP 1: Open the Application

1. Open your web browser (Chrome, Firefox, Edge, etc.)
2. Go to: **http://localhost:3000**
3. You'll be automatically redirected to the login page

---

### STEP 2: Register a New Account

Since this is your first time, you need to create an account:

1. On the login page, click **"create a new account"** link
2. Or go directly to: **http://localhost:3000/register/**
3. Fill in the registration form:
   - **Email:** Enter your email (e.g., yourname@example.com)
   - **Password:** Enter a password (minimum 8 characters)
4. Click **"Register"** button
5. You'll be automatically logged in and redirected to the dashboard

---

### STEP 3: Login (For Returning Users)

If you already have an account:

1. Go to: **http://localhost:3000/login/**
2. Enter your credentials:
   - **Email:** test@example.com
   - **Password:** testpass123
3. Click **"Sign in"** button
4. You'll be redirected to the dashboard

---

### STEP 4: Explore the Dashboard

After logging in, you'll see the main dashboard with:

- **Total Simulations:** Number of simulations run
- **Total Savings:** Cost savings achieved
- **Average Utilization:** Box space utilization
- **Active Boxes:** Number of boxes in catalog

---

## 🎨 AVAILABLE FEATURES

### 1. Dashboard (http://localhost:3000/dashboard/)
- View key performance indicators (KPIs)
- See cost trends and savings
- Monitor box usage statistics
- Quick access to all features

### 2. Simulation (http://localhost:3000/simulation/)
- Upload CSV files with order data
- Run packaging optimization simulations
- View simulation results
- Download detailed reports
- Compare optimized vs baseline costs

### 3. Box Catalog (http://localhost:3000/boxes/)
- View all available box sizes
- Add new box dimensions
- Edit existing boxes
- Delete unused boxes
- See box usage statistics

### 4. Analytics (http://localhost:3000/analytics/)
- View detailed cost trends
- Analyze box usage patterns
- Track savings over time
- Export analytics data

### 5. Configuration (http://localhost:3000/config/)
- Set buffer padding
- Configure volumetric divisor
- Adjust shipping rates
- Customize optimization parameters

### 6. Subscription (http://localhost:3000/subscription/)
- View current subscription tier
- Check quota usage
- Upgrade/downgrade plan
- View billing history

### 7. API Integration (http://localhost:3000/api-integration/)
- Generate API keys
- View API documentation
- Test API endpoints
- Manage integrations

### 8. Admin Panel (http://localhost:3000/admin/)
- User management (admin only)
- System settings
- View all simulations
- Monitor system health

---

## 🔐 TEST ACCOUNTS

### Account 1 (Already Created)
- **Email:** test@example.com
- **Password:** testpass123
- **Role:** CUSTOMER
- **Tier:** FREE

### Account 2 (Your Email)
- **Email:** r.yeswanth8673@gmail.com
- **Password:** (whatever you set during registration)
- **Role:** CUSTOMER
- **Tier:** FREE

---

## 📊 HOW TO RUN A SIMULATION

### Step 1: Prepare Your CSV File

Create a CSV file with this format:

```csv
order_id,item_id,length,width,height,weight,quantity
ORD001,ITEM001,10,8,5,2,1
ORD001,ITEM002,15,10,8,3,2
ORD002,ITEM003,20,15,10,5,1
```

### Step 2: Upload and Process

1. Go to **Simulation** page
2. Click **"Upload CSV"** button
3. Select your CSV file
4. Wait for upload to complete
5. Click **"Process Simulation"**
6. View results showing:
   - Optimized total cost
   - Baseline total cost
   - Total savings
   - Savings percentage
   - Average utilization

### Step 3: Download Report

1. Click **"Download Report"** button
2. Get a PDF with detailed analysis
3. Share with your team

---

## 📦 HOW TO MANAGE BOXES

### Add a New Box

1. Go to **Box Catalog** page
2. Click **"Add New Box"** button
3. Fill in box details:
   - **Name:** e.g., "Small Box"
   - **Length:** in cm
   - **Width:** in cm
   - **Height:** in cm
   - **Max Weight:** in kg
4. Click **"Save"**

### Edit a Box

1. Find the box in the list
2. Click **"Edit"** button
3. Update the details
4. Click **"Save Changes"**

### Delete a Box

1. Find the box in the list
2. Click **"Delete"** button
3. Confirm deletion

---

## ⚙️ HOW TO CONFIGURE SETTINGS

1. Go to **Configuration** page
2. Adjust settings:
   - **Buffer Padding:** Extra space around items (default: 2 cm)
   - **Volumetric Divisor:** For volumetric weight calculation (default: 5000)
   - **Shipping Rate:** Cost per kg (default: $0.50)
3. Click **"Save Configuration"**

---

## 🔌 HOW TO USE THE API

### Generate API Key

1. Go to **API Integration** page
2. Click **"Generate API Key"**
3. Copy your API key (starts with `pk_`)
4. Use it in your applications

### Make API Calls

```bash
# Example: Get boxes
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/boxes

# Example: Create simulation
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@orders.csv" \
  http://localhost:3000/api/simulation/upload
```

---

## 🚪 HOW TO LOGOUT

1. Click your email in the top right corner
2. Click **"Logout"**
3. You'll be redirected to the login page

---

## 🔄 NAVIGATION FLOW

```
Login Page → Dashboard → All Features
     ↓
Register Page → Auto Login → Dashboard
```

### After Login, You Can Access:
- Dashboard (home page)
- Simulation (run optimizations)
- Boxes (manage catalog)
- Analytics (view reports)
- Config (adjust settings)
- Subscription (manage plan)
- API Integration (get API keys)
- Admin (if you're an admin)

---

## ✅ WHAT WORKS

- ✅ User registration with email validation
- ✅ User login with JWT authentication
- ✅ Automatic redirect to dashboard after login
- ✅ Protected routes (must be logged in)
- ✅ Sidebar navigation between pages
- ✅ Professional UI with loading states
- ✅ Error handling with toast notifications
- ✅ Database storage (PostgreSQL)
- ✅ All API endpoints functional
- ✅ CSV upload and processing
- ✅ Box catalog management
- ✅ Analytics and reporting
- ✅ Configuration management

---

## 🐛 TROUBLESHOOTING

### Issue: Login doesn't redirect to dashboard

**Solution:**
1. Clear your browser cache
2. Clear localStorage: Open browser console (F12) and run:
   ```javascript
   localStorage.clear()
   ```
3. Refresh the page
4. Try logging in again

### Issue: "Network Error" when logging in

**Solution:**
1. Check if the server is running: http://localhost:3000/health
2. If not running, restart it:
   ```powershell
   npm start
   ```

### Issue: Can't see any data

**Solution:**
1. Make sure you're logged in
2. Check if database is running:
   ```powershell
   docker ps
   ```
3. If not running:
   ```powershell
   docker-compose up -d
   ```

---

## 📞 QUICK LINKS

- **Home:** http://localhost:3000/
- **Login:** http://localhost:3000/login/
- **Register:** http://localhost:3000/register/
- **Dashboard:** http://localhost:3000/dashboard/
- **Simulation:** http://localhost:3000/simulation/
- **Boxes:** http://localhost:3000/boxes/
- **Analytics:** http://localhost:3000/analytics/
- **Config:** http://localhost:3000/config/
- **Subscription:** http://localhost:3000/subscription/
- **API Integration:** http://localhost:3000/api-integration/
- **Admin:** http://localhost:3000/admin/
- **Health Check:** http://localhost:3000/health

---

## 🎉 YOU'RE ALL SET!

Your application is fully functional with:
- ✅ Professional frontend UI
- ✅ Complete backend API
- ✅ PostgreSQL database
- ✅ User authentication
- ✅ All features working

**Start using it now at:** http://localhost:3000

---

**Generated:** February 27, 2026  
**Status:** LIVE AND READY TO USE ✅
