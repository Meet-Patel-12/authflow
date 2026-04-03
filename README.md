# 🔐 AuthFlow - Complete Authentication & Authorization Platform

**AuthFlow** is a modern, enterprise-grade authentication and authorization platform you can self-host. It provides OAuth2/OIDC, JWT tokens, MFA, webhooks, API keys, and complete user management out of the box.

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

---

## 🎯 Overview

AuthFlow is a **complete authentication solution** for modern applications. Instead of building auth from scratch, integrate AuthFlow into your app and get:

- ✅ User registration & login
- ✅ OAuth2 & OpenID Connect (OIDC)
- ✅ Multi-factor authentication (MFA/TOTP)
- ✅ JWT token management
- ✅ API key generation
- ✅ Organization & team management
- ✅ Webhooks for events
- ✅ Audit logs
- ✅ Admin dashboard
- ✅ Email verification

### Use Cases

- **SaaS Platforms** - User management for your application
- **Multiple Apps** - Single auth provider for multiple services
- **Enterprise** - Team, organization, and permission management
- **Microservices** - Centralized auth for service-to-service calls

---

## ✨ Features

### 🔐 Authentication Methods

| Method             | Type         | Use Case                        |
| ------------------ | ------------ | ------------------------------- |
| **Email/Password** | Native       | Standard username/password auth |
| **OAuth2**         | Provider     | Connect Google, GitHub, etc.    |
| **OIDC**           | Provider     | Enterprise SSO support          |
| **MFA (TOTP)**     | 2-Factor     | Security-conscious users        |
| **API Keys**       | Programmatic | Service-to-service calls        |

### 👥 User Management

- User registration with email verification
- Profile management
- Password reset & change
- Account deactivation & deletion
- Session management & device tracking
- Login history & audit logs

### 🏢 Organization Features

- Create & manage organizations
- Invite team members
- Role-based access control (RBAC)
- Team & permission management
- Organization settings

### 🔑 Credentials & Security

- Access tokens (short-lived, 15m default)
- Refresh tokens (long-lived, 7d default)
- API key generation with permissions
- Token blacklisting on logout
- Automatic credential rotation

### 📊 Developer Features

- REST API for all operations
- Webhook events for integration
- SDK libraries (JavaScript, Node.js, React)
- API analytics & usage tracking
- Developer integration guide

### 📈 Admin Features

- User management dashboard
- Organization oversight
- Audit log viewer
- System analytics
- Application settings

---

## 🛠️ Tech Stack

### Backend

- **Runtime:** Node.js 18+
- **Framework:** Express.js 5
- **Language:** TypeScript 5.9
- **Database:** MongoDB 4.4+
- **Cache:** Redis 6+ (optional)
- **Email:** SMTP / Nodemailer
- **Storage:** AWS S3 (for file uploads)
- **Auth:** Passport.js, jsonwebtoken
- **Password:** bcryptjs
- **Jobs:** BullMQ (webhook queue)

### Frontend

- **Framework:** React 19
- **Language:** TypeScript 5.9
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS 3
- **State:** Redux Toolkit
- **Forms:** React Hook Form
- **Validation:** Zod
- **HTTP:** Axios
- **Icons:** Lucide React

### Infrastructure

- **Frontend Hosting:** Vercel (recommended)
- **Backend:** Self-hosted (pm2, Docker, K8s)
- **Database:** MongoDB Atlas or self-hosted
- **Cache:** Redis Cloud or self-hosted

---

## 📦 Prerequisites

Before you begin, ensure you have:

### Required

- **Node.js** 18+ ([Download](https://nodejs.org))
- **npm** 9+ or **yarn** (comes with Node.js)
- **Git** ([Download](https://git-scm.com))

### Optional (Recommended)

- **Docker** & **Docker Compose** ([Download](https://docker.com))
- **MongoDB** 4.4+ (local or cloud)
- **Redis** 6+ (for production)
- **Code Editor:** VS Code ([Download](https://code.visualstudio.com))

### API Keys (Optional for full features)

- **MongoDB Atlas Account** - [Free tier available](https://www.mongodb.com/cloud/atlas)
- **AWS S3 Account** - For file storage (optional)
- **SMTP Email Service** - Gmail or SendGrid (for email features)
- **OAuth Providers** - Google & GitHub (optional)

---

## 🚀 Quick Start

Get AuthFlow running in 5 minutes:

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/authflow.git
cd AuthFlow
```

### 2️⃣ Install Dependencies

**Backend:**

```bash
cd backend
npm install
```

**Frontend:**

```bash
cd frontend
npm install
```

### 3️⃣ Setup Environment Variables

**Backend (.env)**

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Server
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-random-secret-key-min-32-chars

# Database
MONGODB_URI=mongodb://localhost:27017/authflow

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# JWT
JWT_SECRET=your-jwt-secret-key

# Frontend URL
FRONTEND_URL=http://localhost:5173

# AWS S3 (optional)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET=authflow-uploads
```

**Frontend (.env.local)**

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
VITE_CLIENT_ID=your-client-id-will-generate-after-first-run
VITE_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_AUTHFLOW_BASE_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3001
```

### 4️⃣ Start the Backend

```bash
cd backend
npm run dev
```

**Expected output:**

```
✓ Server running on http://localhost:3000
✓ Database connected to MongoDB
```

### 5️⃣ Start the Frontend

**In a new terminal:**

```bash
cd frontend
npm run dev
```

**Expected output:**

```
✓ Local:     http://localhost:5173
✓ Ready for development
```

### 6️⃣ Access the Application

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000
- **API Docs:** http://localhost:3000/docs

---

## 📁 Project Structure

```
AuthFlow/
├── backend/                          # Node.js/Express API
│   ├── src/
│   │   ├── app.ts                   # Express setup
│   │   ├── server.ts                # Server entry
│   │   ├── config/                  # Configuration files
│   │   │   ├── database.ts          # MongoDB connection
│   │   │   ├── passport.ts          # OAuth strategies
│   │   │   ├── redis.ts             # Redis setup
│   │   │   └── email.ts             # Email configuration
│   │   ├── controllers/             # Route handlers
│   │   │   ├── auth.controller.ts   # Auth endpoints
│   │   │   ├── oauth2.controller.ts # OAuth2 flow
│   │   │   ├── mfa.controller.ts    # MFA operations
│   │   │   └── ...
│   │   ├── routes/                  # API routes
│   │   ├── models/                  # MongoDB schemas
│   │   ├── services/                # Business logic
│   │   │   ├── auth.service.ts      # Auth logic
│   │   │   ├── email.service.ts     # Email sending
│   │   │   └── ...
│   │   ├── middlewares/             # Express middleware
│   │   │   ├── auth.middleware.ts   # Token verification
│   │   │   ├── rbac.middleware.ts   # Permission checks
│   │   │   └── ...
│   │   ├── repositories/            # Database queries
│   │   ├── utils/                   # Helper functions
│   │   │   └── jwt.ts               # Token generation
│   │   └── types/                   # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                         # Environment variables
│
├── frontend/                         # React application
│   ├── src/
│   │   ├── main.tsx                 # Entry point
│   │   ├── app/                     # App setup
│   │   │   ├── store.ts             # Redux store
│   │   │   ├── apiClient.ts         # Axios instance
│   │   │   └── hooks.ts             # Custom hooks
│   │   ├── features/                # Feature modules
│   │   │   ├── auth/                # Authentication
│   │   │   ├── applications/        # Apps management
│   │   │   ├── organizations/       # Orgs management
│   │   │   ├── apiKeys/            # API key management
│   │   │   ├── webhooks/           # Webhooks
│   │   │   ├── developers/         # Dev integration
│   │   │   └── ...
│   │   ├── components/              # Reusable components
│   │   ├── shared/                  # Shared utilities
│   │   └── index.css                # Global styles
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.local
│
├── packages/                         # SDK libraries
│   ├── authflow-js/                # JavaScript SDK
│   ├── authflow-node/              # Node.js SDK
│   └── authflow-react/             # React SDK
│
└── README.md                         # This file
```

---

## ⚙️ Configuration

### Environment Variables

#### Backend Configuration

| Variable         | Required | Default       | Description                   |
| ---------------- | -------- | ------------- | ----------------------------- |
| `NODE_ENV`       | Yes      | `development` | `development` or `production` |
| `PORT`           | No       | `3000`        | Server port                   |
| `MONGODB_URI`    | Yes      | -             | MongoDB connection string     |
| `REDIS_URL`      | No       | -             | Redis connection (optional)   |
| `JWT_SECRET`     | Yes      | -             | Secret for JWT signing        |
| `SESSION_SECRET` | Yes      | -             | Secret for sessions           |
| `FRONTEND_URL`   | Yes      | -             | Frontend URL for CORS         |
| `SMTP_HOST`      | No       | -             | Email server host             |
| `SMTP_PORT`      | No       | `587`         | Email server port             |
| `SMTP_USER`      | No       | -             | Email account                 |
| `SMTP_PASSWORD`  | No       | -             | Email password                |

#### Frontend Configuration

| Variable                 | Required | Default | Description        |
| ------------------------ | -------- | ------- | ------------------ |
| `VITE_AUTHFLOW_BASE_URL` | Yes      | -       | Backend API URL    |
| `VITE_CLIENT_ID`         | No       | -       | OAuth client ID    |
| `VITE_REDIRECT_URI`      | No       | -       | OAuth redirect URL |

### Token Configuration

Default token expiration (can be changed per application):

```typescript
// Access Token
expiresIn: 15 * 60; // 15 minutes

// Refresh Token
expiresIn: 7 * 24 * 60 * 60; // 7 days

// Email Verification Token
expiresIn: 24 * 60 * 60; // 24 hours

// Password Reset Token
expiresIn: 1 * 60 * 60; // 1 hour
```

---

## 🏃 Running Locally

### Using npm/yarn

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### Using Docker Compose (Recommended)

```bash
# Start all services (backend, frontend, mongodb, redis)
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down
```

### First Time Setup

1. **Create Initial Admin User**
   - Go to http://localhost:5173
   - Click "Sign Up"
   - Create your account
   - Verify email (check console in dev mode)

2. **Create First Application**
   - Login to dashboard
   - Go to "Applications"
   - Click "Create Application"
   - Get your Client ID

3. **Generate API Key**
   - Go to "API Keys"
   - Click "Create Key"
   - Copy and save the key (shown only once)

4. **Start Integration**
   - Go to "Developer Integration"
   - Select your application
   - Follow code examples

---

## 📚 API Documentation

### Authentication Endpoints

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "organizationName": "My Company"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

#### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{refreshToken}"
}
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "refreshToken": "{refreshToken}"
}
```

### SDK Endpoints

#### Register User (SDK)

```http
POST /api/sdk/auth/register
Content-Type: application/json

{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

#### Verify Token (SDK)

```http
GET /api/sdk/token/verify
Authorization: Bearer {userToken}
X-Client-Id: your_client_id
```

### Full API Documentation

Visit http://localhost:3000/docs for complete API reference with all endpoints.

---

## 🚢 Deployment

### Deploy Backend

#### Option 1: Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-authflow-app

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Deploy
git push heroku main
```

#### Option 2: Docker

```bash
# Build image
docker build -t authflow-backend ./backend

# Run container
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://... \
  -e JWT_SECRET=... \
  authflow-backend
```

#### Option 3: Self-hosted with PM2

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start npm --name "authflow-api" -- start

# Monitor
pm2 monit

# Save config
pm2 save
pm2 startup
```

### Deploy Frontend

#### Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel
```

#### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd frontend
netlify deploy --prod --dir=dist
```

### Environment Variables for Production

Update these in your hosting platform:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/authflow
REDIS_URL=redis://user:pass@host:6379
JWT_SECRET=<strong-random-secret>
SESSION_SECRET=<strong-random-secret>
FRONTEND_URL=https://yourdomain.com
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
```

---

## 👨‍💻 Development

### Project Setup

```bash
# Install dependencies for all packages
npm install

# Install specific workspace
npm install --workspace=backend
npm install --workspace=frontend
npm install --workspace=packages/authflow-react
```

### Running Tests

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check
```

### Git Workflow

```bash
# Feature branch
git checkout -b feature/your-feature

# Commit with message
git commit -m "feat: add your feature"

# Push to remote
git push origin feature/your-feature

# Create Pull Request
# (Go to GitHub and create PR)
```

---

## 🆘 Troubleshooting

### Backend Won't Start

**Error: `EADDRINUSE: address already in use :::3000`**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

**Error: `MONGODB_URI not found`**

```bash
# Set environment variable
export MONGODB_URI=mongodb://localhost:27017/authflow
npm run dev

# Or create .env file
echo "MONGODB_URI=mongodb://localhost:27017/authflow" > .env
```

### Frontend Connection Issues

**Error: `CORS error` or `Cannot connect to API`**

```bash
# Check VITE_AUTHFLOW_BASE_URL in .env.local
VITE_AUTHFLOW_BASE_URL=http://localhost:3000

# Clear browser cache
# Restart both servers
```

**Error: `Module not found`**

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Database Issues

**Error: `connect ECONNREFUSED 127.0.0.1:27017`**

```bash
# Start MongoDB
# macOS with Homebrew
brew services start mongodb-community

# Docker
docker run -d -p 27017:27017 mongo:latest

# Or use MongoDB Atlas cloud
```

### Email Not Sending

**Check SMTP configuration:**

```bash
# Test email settings
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
transporter.verify((err, ok) => {
  if (err) console.error(err);
  else console.log('Email config OK');
});
"
```

---

## 📖 Documentation

- [Backend API Guide](./backend/README.md)
- [Frontend Setup](./frontend/README.md)
- [SDK Documentation](./packages/README.md)
- [Developer Integration Guide](./frontend/src/features/developers)

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Style

- Use TypeScript
- Follow existing patterns
- Write meaningful commit messages
- Add tests for new features

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 💬 Support

- **Documentation:** [Full docs](./docs)
- **Issues:** [GitHub Issues](https://github.com/yourusername/authflow/issues)
- **Email:** support@authflow.local
- **Community:** [Discussions](https://github.com/yourusername/authflow/discussions)

---

## 🎉 Quick Links

- [Create Application](http://localhost:5173/applications)
- [API Documentation](http://localhost:3000/docs)
- [Developer Integration](http://localhost:5173/developers)
- [Admin Dashboard](http://localhost:5173/admin)
- [Security Settings](http://localhost:5173/settings)

---

## 🙏 Acknowledgments

Built with:

- [Express.js](https://expressjs.com) - Backend framework
- [React](https://react.dev) - Frontend framework
- [MongoDB](https://mongodb.com) - Database
- [TypeScript](https://www.typescriptlang.org) - Type safety
- [Tailwind CSS](https://tailwindcss.com) - Styling

---

**Happy Coding! 🚀**

For updates and latest features, keep an eye on the [Changelog](CHANGELOG.md).
