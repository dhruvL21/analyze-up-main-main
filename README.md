# AnalyzeUp — AI-Powered Inventory & Business Intelligence Platform

AnalyzeUp is a modern **AI-powered inventory management and business intelligence platform** built to help businesses understand their sales, inventory, suppliers, and operational performance from a single dashboard.

It combines **real-time inventory management, automated data ingestion, AI-powered analysis, business strategy generation, stock predictions, reporting, and external data integrations** into one platform.

🔗 **Live Demo:** https://analyze-up.vercel.app/

---

## 🚀 Features

### 📊 Business Intelligence Dashboard

Get a real-time overview of business performance through interactive dashboards and KPIs.

* Total inventory value
* Total sales
* Revenue trends
* Product performance
* Low-stock products
* Inventory distribution
* Sales and transaction analytics
* Business performance visualizations
* Interactive charts powered by Recharts

---

### 📦 Inventory Management

Manage the complete product catalog from one centralized interface.

* Add new products
* Edit product information
* Delete products
* Track stock levels
* Track selling and purchase prices
* Product categories
* Product images
* Inventory valuation
* Low-stock monitoring
* Stock status tracking

---

### 🧠 AI-Powered Stock Advisor

AnalyzeUp uses AI and sales data to help businesses make better inventory decisions.

The Stock Advisor can analyze:

* Sales velocity
* Current stock levels
* Product demand
* Supplier lead times
* Historical sales patterns
* Reorder requirements

It provides intelligent recommendations such as:

* Which products need to be reordered
* When products are likely to run out
* Recommended reorder quantities
* Which products require immediate attention

---

### 🤖 AI Business Strategy Generator

AnalyzeUp can transform business data into actionable strategic recommendations.

The AI analyzes:

* Sales performance
* Product performance
* Inventory trends
* Revenue patterns
* Stock movement
* Business metrics

It can generate recommendations around:

* Revenue growth
* Product optimization
* Inventory efficiency
* High-performing products
* Underperforming products
* Pricing opportunities
* Business priorities

---

### 📥 AI-Powered Data Import

Businesses can import existing transactional data instead of manually entering every record.

AnalyzeUp supports intelligent data ingestion from external datasets and automatically processes imported information for analysis.

The system can:

* Import business datasets
* Detect relevant columns
* Understand different data structures
* Map imported fields to AnalyzeUp fields
* Validate imported data
* Process transactional records
* Convert raw data into usable business insights

---

### 📄 CSV & Excel Data Mapping

AnalyzeUp includes an intelligent data-mapping workflow for uploaded datasets.

Instead of requiring users to perfectly format their files, the system can identify and map common fields such as:

* Product
* SKU
* Quantity
* Price
* Revenue
* Date
* Customer
* Supplier
* Category

This makes it easier to connect existing business datasets with the AnalyzeUp analytics system.

---

### ☁️ Google Drive Integration

AnalyzeUp can connect with Google Drive to simplify business data ingestion.

Features include:

* Google authentication
* Google Drive connection
* File discovery
* Data import
* Automated synchronization
* Processing of supported business datasets

### 🔄 Google Drive AutoSync

AnalyzeUp can automatically synchronize supported files from Google Drive so that businesses don't have to repeatedly upload updated datasets manually.

This enables a more automated workflow:

```text
Google Drive
     ↓
AutoSync
     ↓
Data Processing
     ↓
Database
     ↓
Analytics
     ↓
AI Insights
```

---

### 🛍️ Shopify Integration

AnalyzeUp integrates with Shopify to bring e-commerce business data into the analytics platform.

This enables businesses to connect their Shopify store with AnalyzeUp and use store data for:

* Sales analysis
* Product analysis
* Inventory monitoring
* Revenue analytics
* Business intelligence
* AI-powered recommendations

The integration allows AnalyzeUp to act as an analytics layer on top of existing e-commerce operations.

---

### 📈 Reporting & Analytics

AnalyzeUp provides detailed reporting for understanding business performance.

Reports cover areas such as:

* Sales
* Transactions
* Inventory
* Products
* Revenue
* Stock movement
* Business performance

Users can visualize important metrics through interactive charts and dashboards and export relevant reports for further analysis.

---

### 🏪 Supplier Management

Maintain supplier information and connect suppliers with inventory operations.

* Add suppliers
* Edit supplier information
* Delete suppliers
* Track supplier relationships
* Associate products with suppliers
* Use supplier lead times for stock recommendations

---

### 🧾 Purchase Order Management

Create and manage purchase orders to keep inventory replenishment organized.

* Create purchase orders
* Select suppliers
* Add products
* Track order quantities
* Monitor order status
* Manage purchasing workflows

---

### 🔐 Authentication & Data Security

AnalyzeUp uses Firebase Authentication to provide secure user authentication.

The application is designed around authenticated business data so users can access their own inventory and analytics environment.

---

## 🏗️ System Architecture

AnalyzeUp follows a modern full-stack architecture built around Next.js and Firebase.

```text
                    ┌──────────────────────┐
                    │       User           │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Next.js Frontend   │
                    │ React + TypeScript   │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
       │  Firebase   │  │  API Routes │  │   Genkit    │
       │ Auth/DB     │  │ Server Side │  │   AI Layer  │
       └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
              │                │                │
              │                │                ▼
              │                │         ┌─────────────┐
              │                │         │ Google AI   │
              │                │         └─────────────┘
              │                │
              │       ┌────────┴─────────┐
              │       │                  │
              ▼       ▼                  ▼
       ┌──────────┐ ┌──────────┐  ┌──────────────┐
       │ Firestore│ │Google    │  │   Shopify    │
       │ Database │ │Drive     │  │ Integration  │
       └──────────┘ └──────────┘  └──────────────┘
```

---

## 🔄 Data Flow

AnalyzeUp can process business data from multiple sources.

```text
CSV / Excel
     │
     ▼
AI Data Mapping
     │
     ▼
Data Validation
     │
     ▼
Firestore
     │
     ├──────────────► Dashboard
     │
     ├──────────────► Reports
     │
     ├──────────────► Inventory Analytics
     │
     └──────────────► AI Analysis
                         │
                         ├──► Stock Advisor
                         │
                         └──► Strategy Generator
```

External integrations can also feed data into the platform:

```text
Google Drive ──┐
               │
Shopify ───────┼──► AnalyzeUp Data Layer
               │
CSV / Excel ───┘
                       │
                       ▼
                Business Intelligence
                       │
              ┌────────┴────────┐
              ▼                 ▼
         Dashboards          AI Insights
```

---

## 🧰 Tech Stack

### Frontend

* **Next.js**
* **React**
* **TypeScript**
* **Tailwind CSS**
* **ShadCN UI**
* **Recharts**
* **Framer Motion**

### Backend

* **Next.js App Router**
* **Next.js Server Actions / API Routes**
* **Firebase**
* **Cloud Firestore**
* **Firebase Authentication**

### AI

* **Google AI**
* **Genkit**
* AI-powered data interpretation
* AI stock recommendations
* AI business strategy generation

### Integrations

* **Google Drive API**
* **Shopify**
* CSV / Excel data processing

### Deployment

* **Vercel**

---

## 🔑 Environment Variables

Create a `.env.local` file in the root directory.

```env
# Google AI
GOOGLE_API_KEY="YOUR_GOOGLE_AI_API_KEY"

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"

# Google Drive OAuth
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
GOOGLE_REDIRECT_URI="YOUR_GOOGLE_REDIRECT_URI"
```

> Keep all API keys and OAuth credentials private. Never commit `.env.local` to GitHub.

---

## 🔐 Google Drive OAuth Configuration

For the deployed application, the Google OAuth callback should point to:

```text
https://analyze-up.vercel.app/api/drive/callback
```

For local development:

```text
http://localhost:9002/api/drive/callback
```

Both callback URLs need to be configured appropriately in the Google Cloud OAuth credentials.

---

## 📋 Prerequisites

Before running AnalyzeUp locally, make sure you have:

* Node.js 20.x or later
* npm
* Firebase project
* Google AI API key
* Google Cloud OAuth credentials if using Google Drive
* Shopify credentials if using the Shopify integration

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd AnalyzeUp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create:

```text
.env.local
```

and add the required credentials.

### 4. Start the development server

```bash
npm run dev
```

The application will run at:

```text
http://localhost:9002
```

---

## 📜 Available Scripts

```bash
npm run dev
```

Starts the development server with hot reload.

```bash
npm run build
```

Creates an optimized production build.

```bash
npm run start
```

Starts the production server after building the application.

```bash
npm run lint
```

Runs ESLint checks.

```bash
npm run typecheck
```

Runs TypeScript type checking.

---

## 🌐 Deployment

AnalyzeUp is deployed using Vercel.

### Production

```text
https://analyze-up.vercel.app/
```

For production deployment:

1. Push changes to the Git repository.
2. Connect the repository to Vercel.
3. Configure production environment variables.
4. Configure Google OAuth production redirect URI.
5. Deploy the application.

---

## 🗂️ Core Modules

```text
AnalyzeUp
│
├── Dashboard
│   ├── KPIs
│   ├── Revenue Analytics
│   ├── Inventory Analytics
│   └── Charts
│
├── Inventory
│   ├── Products
│   ├── Stock Tracking
│   ├── Categories
│   └── Stock Alerts
│
├── Orders
│   └── Purchase Orders
│
├── Suppliers
│   └── Supplier Management
│
├── Data Import
│   ├── CSV
│   ├── Excel
│   ├── AI Mapping
│   └── Validation
│
├── Integrations
│   ├── Google Drive
│   ├── Google Drive AutoSync
│   └── Shopify
│
├── AI
│   ├── Stock Advisor
│   └── Strategy Generator
│
└── Reports
    ├── Sales
    ├── Inventory
    └── Transactions
```

---

## 🎯 What Makes AnalyzeUp Different?

Traditional inventory systems mainly focus on recording stock and transactions.

AnalyzeUp goes further by combining **inventory management + business intelligence + automated data ingestion + AI decision support**.

### Traditional Workflow

```text
Business Data
     ↓
Manual Entry
     ↓
Inventory Software
     ↓
Basic Reports
     ↓
Manual Analysis
```

### AnalyzeUp Workflow

```text
CSV / Excel / Google Drive / Shopify
                 ↓
          Automated Import
                 ↓
            AI Mapping
                 ↓
             Firestore
                 ↓
       Business Intelligence
                 ↓
          AI Analysis
          ↙          ↘
 Stock Advisor   Strategy Generator
```

The goal is to move businesses from simply **seeing what happened** to understanding **what they should do next**.

---

## 🔮 Future Scope

Potential future improvements include:

* Advanced demand forecasting
* Predictive sales analytics
* Automated purchase order generation
* Advanced supplier performance analytics
* More e-commerce integrations
* Multi-location inventory management
* Advanced role-based access control
* Custom business dashboards
* Automated business alerts
* Advanced financial analytics

---

## 👨‍💻 Project

**AnalyzeUp**
AI-Powered Inventory & Business Intelligence Platform

Built with:

**Next.js · React · TypeScript · Firebase · Google AI · Genkit · Shopify · Google Drive · Recharts · ShadCN UI · Tailwind CSS · Vercel**
