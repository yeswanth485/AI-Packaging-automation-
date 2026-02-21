-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CUSTOMER', 'TRIAL');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "apiKey" TEXT,
    "apiKeyCreatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "monthlyQuota" INTEGER NOT NULL,
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Box" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "maxWeight" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Box_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalOrders" INTEGER NOT NULL,
    "processedOrders" INTEGER NOT NULL DEFAULT 0,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SimulationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "optimizedTotalCost" DOUBLE PRECISION NOT NULL,
    "baselineTotalCost" DOUBLE PRECISION NOT NULL,
    "totalSavings" DOUBLE PRECISION NOT NULL,
    "savingsPercentage" DOUBLE PRECISION NOT NULL,
    "averageUtilization" DOUBLE PRECISION NOT NULL,
    "monthlySavings" DOUBLE PRECISION NOT NULL,
    "annualSavings" DOUBLE PRECISION NOT NULL,
    "reportUrl" TEXT,
    "reportExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "totalWeight" DOUBLE PRECISION NOT NULL,
    "selectedBoxId" TEXT,
    "volumetricWeight" DOUBLE PRECISION,
    "billableWeight" DOUBLE PRECISION,
    "shippingCost" DOUBLE PRECISION,
    "spaceUtilization" DOUBLE PRECISION,
    "wastedVolume" DOUBLE PRECISION,
    "isOptimized" BOOLEAN NOT NULL DEFAULT false,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bufferPadding" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "volumetricDivisor" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "shippingRatePerKg" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "maxWeightOverride" DOUBLE PRECISION,
    "baselineBoxSelectionStrategy" TEXT NOT NULL DEFAULT 'next_larger',
    "enableForecast" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "cumulativeUsage" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalOrders" INTEGER NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "overageCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKey_key" ON "User"("apiKey");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_apiKey_idx" ON "User"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Box_isActive_idx" ON "Box"("isActive");

-- CreateIndex
CREATE INDEX "SimulationJob_userId_idx" ON "SimulationJob"("userId");

-- CreateIndex
CREATE INDEX "SimulationJob_status_idx" ON "SimulationJob"("status");

-- CreateIndex
CREATE INDEX "Simulation_jobId_idx" ON "Simulation"("jobId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_jobId_idx" ON "Order"("jobId");

-- CreateIndex
CREATE INDEX "Order_orderId_idx" ON "Order"("orderId");

-- CreateIndex
CREATE INDEX "Item_orderId_idx" ON "Item"("orderId");

-- CreateIndex
CREATE INDEX "Configuration_userId_idx" ON "Configuration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_userId_key" ON "Configuration"("userId");

-- CreateIndex
CREATE INDEX "UsageRecord_userId_idx" ON "UsageRecord"("userId");

-- CreateIndex
CREATE INDEX "UsageRecord_timestamp_idx" ON "UsageRecord"("timestamp");

-- CreateIndex
CREATE INDEX "Invoice_subscriptionId_idx" ON "Invoice"("subscriptionId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationJob" ADD CONSTRAINT "SimulationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "SimulationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "SimulationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_selectedBoxId_fkey" FOREIGN KEY ("selectedBoxId") REFERENCES "Box"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
