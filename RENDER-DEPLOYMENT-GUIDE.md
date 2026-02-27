# RENDER.COM DEPLOYMENT GUIDE - COMPLETE STEP-BY-STEP

## 📋 WHAT YOU NEED BEFORE STARTING

1. ✅ Your GitHub repository: `https://github.com/yeswanth485/AI-Packaging-automation-.git`
2. ✅ Credit card (for verification - you'll be charged $7/month)
3. ✅ 30 minutes of time

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### **STEP 1: Sign Up on Render**

1. Go to: **https://render.com**
2. Click **"Get Started"** (top right)
3. Click **"Sign up with GitHub"**
4. Authorize Render to access your GitHub account
5. You'll be redirected to Render Dashboard

---

### **STEP 2: Create a New Web Service**

1. On Render Dashboard, click **"New +"** button (top right)
2. Select **"Web Service"**
3. You'll see a list of your GitHub repositories

---

### **STEP 3: Connect Your Repository**

1. Find **"AI-Packaging-automation-"** in the list
2. Click **"Connect"** next to it

**If you don't see your repo:**
- Click **"Configure account"**
- Give Render access to the repository
- Come back and click "Connect"

---

### **STEP 4: Configure Your Web Service**

Fill in these settings EXACTLY:

**Name:**
```
ai-packaging-app
```
(or any name you want)

**Region:**
- Choose closest to you:
  - `Oregon (US West)`
  - `Ohio (US East)`
  - `Frankfurt (Europe)`
  - `Singapore (Asia)`

**Branch:**
```
main
```

**Root Directory:**
- Leave BLANK (empty)

**Environment:**
```
Docker
```
(Render will auto-detect your Dockerfile)

**Instance Type:**
```
Starter ($7/month)
```

---

### **STEP 5: Add Environment Variables**

Scroll down to **"Environment Variables"** section.

Click **"Add Environment Variable"** and add these 4 variables:

#### Variable 1: NODE_ENV
```
Key: NODE_ENV
Value: production
```

#### Variable 2: JWT_SECRET
First, generate a random secret. Open PowerShell and run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output, then add:
```
Key: JWT_SECRET
Value: [paste your generated value here]
```

#### Variable 3: SESSION_SECRET
Generate ANOTHER random secret (run the command again):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the NEW output, then add:
```
Key: SESSION_SECRET
Value: [paste your NEW generated value here]
```

#### Variable 4: PORT
```
Key: PORT
Value: 3000
```

---

### **STEP 6: Add PostgreSQL Database**

1. Scroll down to **"Add Database"** section
2. Click **"Add Database"**
3. Select **"PostgreSQL"**
4. Choose plan:
   - **Free** (if available - 90 days retention)
   - **Starter** ($7/month - recommended for production)
5. Click **"Create Database"**

Render will automatically add the `DATABASE_URL` environment variable to your web service!

---

### **STEP 7: Configure Health Check (Optional but Recommended)**

Scroll down to **"Health Check Path"** and enter:
```
/health
```

**Timeout:** 10 seconds
**Interval:** 30 seconds

---

### **STEP 8: Add Payment Method**

1. Scroll to the bottom
2. Click **"Add Payment Method"**
3. Enter your credit card details
4. Confirm

**Cost:** $7/month for Starter plan (or $14/month if you add database)

---

### **STEP 9: Deploy!**

1. Scroll to the very bottom
2. Click **"Create Web Service"**

Render will now:
- Clone your repository
- Detect your Dockerfile
- Build your Docker image (5-10 minutes)
- Deploy your app
- Give you a live URL

---

### **STEP 10: Monitor Deployment**

You'll see the build logs in real-time. Wait for:

```
==> Build successful!
==> Deploying...
==> Your service is live at https://ai-packaging-app.onrender.com
```

---

### **STEP 11: Access Your App**

Once deployment completes, you'll see your URL at the top:

```
https://ai-packaging-app.onrender.com
```

Click it to open your live app!

---

## ✅ VERIFICATION CHECKLIST

After deployment, verify:

1. ✅ App URL opens in browser
2. ✅ Health check works: `https://your-app.onrender.com/health`
3. ✅ Login page loads
4. ✅ Can register a new user
5. ✅ Can login

---

## 🔧 TROUBLESHOOTING

### If deployment fails:

1. **Check build logs** - Click on "Logs" tab to see errors
2. **Verify Dockerfile** - Make sure it's in the root of your repo
3. **Check environment variables** - Make sure all 5 are set correctly
4. **Database connection** - Verify DATABASE_URL is automatically added

### Common issues:

**Issue: "Dockerfile cannot be empty"**
- Solution: Make sure Dockerfile is in the root directory of your repo

**Issue: "Health check failed"**
- Solution: Make sure your app starts on port 3000 and responds to `/health`

**Issue: "Database connection failed"**
- Solution: Check that DATABASE_URL environment variable exists

---

## 💰 PRICING

**What you'll pay:**

- **Web Service (Starter)**: $7/month
- **PostgreSQL (Starter)**: $7/month
- **Total**: $14/month

**Free tier option:**
- Some regions offer free tier for 90 days
- After 90 days, you'll need to upgrade to paid plan

---

## 📊 WHAT YOU GET

With Render Starter plan:

- ✅ 512MB RAM
- ✅ 0.5 CPU
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Automatic deployments from GitHub
- ✅ 24/7 uptime
- ✅ Health checks
- ✅ Environment variables
- ✅ Build logs
- ✅ Metrics and monitoring

---

## 🎯 SUMMARY

1. Go to https://render.com
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your repo: `AI-Packaging-automation-`
5. Configure:
   - Name: `ai-packaging-app`
   - Environment: `Docker`
   - Instance: `Starter ($7/month)`
6. Add 4 environment variables (generate JWT_SECRET and SESSION_SECRET)
7. Add PostgreSQL database
8. Set health check path: `/health`
9. Add payment method
10. Click "Create Web Service"
11. Wait 5-10 minutes
12. Your app is live!

---

## 🔗 YOUR LIVE URL

After deployment, your app will be accessible at:

```
https://ai-packaging-app.onrender.com
```

(or whatever name you chose)

---

## 📝 NOTES

- First deployment takes 5-10 minutes
- Subsequent deployments are faster (2-3 minutes)
- Render auto-deploys when you push to GitHub
- You can pause/delete the service anytime
- Billing is monthly, prorated

---

**Ready to deploy? Follow the steps above and your app will be live in 30 minutes!**

Date: February 27, 2026
