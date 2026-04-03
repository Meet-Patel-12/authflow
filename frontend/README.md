# AuthFlow Frontend

The official React + TypeScript frontend dashboard for AuthFlow — a modern authentication and authorization platform. This application provides a complete admin dashboard for managing applications, users, API keys, webhooks, and authentication settings.

## Features

- **Authentication Management** — User registration, login, password reset, email verification
- **Multi-Factor Authentication (MFA)** — TOTP setup, authentication flow
- **OAuth/OIDC Integration** — OAuth provider configuration and callback handling
- **Dashboard** — Overview of authentication metrics, API analytics
- **Organization Management** — Create and manage organizations with members
- **API Keys** — Generate, revoke, and manage API credentials
- **Webhooks** — Configure and manage event webhooks
- **Audit Logs** — Track all system events and user actions
- **SDK Analytics** — Monitor SDK usage and performance metrics
- **Settings** — User profile, security, sessions, device management
- **Universal Login** — Hosted authentication pages (login/signup/verify)

## Technology Stack

- **React 19** — UI framework
- **TypeScript 5.9** — Type safety
- **Vite 7** — Fast build tool and dev server
- **Tailwind CSS 3** — Utility-first styling
- **React Router 7** — Client-side routing
- **Redux Toolkit** — State management
- **React Hook Form** — Form handling with validation
- **Zod** — Schema validation
- **Axios** — HTTP client
- **Recharts** — Data visualization
- **Sonner** — Toast notifications
- **Lucide React** — Icon library
- **ESLint + TypeScript ESLint** — Code linting

## Prerequisites

- Node.js 18+ (with npm or yarn)
- Backend API running at `http://localhost:3000` (or configured via env variables)

## Installation

### 1. Clone the repository

```bash
cd frontend
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure environment variables

Create a `.env.local` file in the `frontend` directory (or use `.env` for defaults):

```env
# API base URL (default: http://localhost:3000)
VITE_API_BASE_URL=http://localhost:3000

# Optional: API timeout in milliseconds (default: 30000)
VITE_API_TIMEOUT=30000

# Optional: Enable debug logging (default: false)
VITE_DEBUG=false
```

## Development

### Start the development server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Build for production

```bash
npm run build
```

This runs TypeScript compilation and Vite build. Output is in the `dist/` directory.

### Lint code

```bash
npm run lint
```

Runs ESLint to check for code quality issues.

### Preview production build

```bash
npm run preview
```

Serves the built files locally to verify the production build works correctly.

## Project Structure

```
frontend/
├── public/                     # Static files
├── src/
│   ├── app/                   # App configuration and utilities
│   │   ├── hooks.ts           # Redux hooks (useAppDispatch, useAppSelector)
│   │   ├── jwtUtils.ts        # JWT token parsing utilities
│   │   ├── ProtectedRoute.tsx # Route protection component
│   │   ├── store.ts           # Redux store configuration
│   │   └── api.ts             # Axios instance and API client
│   ├── components/            # Reusable components
│   │   ├── layouts/           # Layout components (DashboardLayout, etc.)
│   │   ├── buttons/           # Button components
│   │   ├── modals/            # Modal dialogs
│   │   ├── forms/             # Form templates
│   │   └── ...
│   ├── features/              # Feature modules (each with pages, slices, etc.)
│   │   ├── auth/              # Authentication pages and logic
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── organizations/     # Organization management
│   │   ├── apiKeys/           # API key management
│   │   ├── webhooks/          # Webhook configuration
│   │   ├── auditLogs/         # Audit log viewing
│   │   ├── sdkAnalytics/      # SDK analytics
│   │   ├── settings/          # User settings
│   │   ├── mfa/               # Multi-factor authentication
│   │   ├── admin/             # Admin dashboard
│   │   └── ...
│   ├── shared/                # Shared utilities
│   │   ├── types.ts           # Global TypeScript types
│   │   ├── constants.ts       # App constants
│   │   └── ...
│   ├── App.tsx                # Root component and routing
│   ├── main.tsx               # Application entry point
│   └── index.css              # Global styles
├── index.html                 # HTML template
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── eslint.config.js           # ESLint configuration
└── package.json               # Dependencies and scripts
```

## Key Modules

### Authentication (`src/features/auth/`)

Handles user authentication including:

- Login page
- Registration page
- Email verification
- Password reset flow
- OAuth callback handling
- Magic link verification

### Dashboard (`src/features/dashboard/`)

Main dashboard showing:

- Authentication metrics
- Recent activity
- API usage statistics

### Organizations (`src/features/organizations/`)

Manage organizations and team members:

- Create/edit organizations
- Invite members
- View member list
- Manage member roles

### API Keys (`src/features/apiKeys/`)

Generate and manage API credentials:

- Create new API keys
- View key details
- Revoke keys
- Copy keys to clipboard

### Webhooks (`src/features/webhooks/`)

Configure webhook endpoints:

- Create/edit webhooks
- View delivery history
- Retry failed deliveries
- Test webhook payloads

### Universal Login (`src/features/universalLogin/`)

Hosted authentication pages (OAuth-like flow):

- Login page
- Signup page
- Login callback handler
- Email verification page

### Settings (`src/features/settings/`)

User account and security settings:

- Profile information
- Email/password changes
- Session management
- Device management
- MFA setup

### Admin (`src/features/admin/`)

Admin-only features:

- System dashboard
- SDK end-user management

## State Management (Redux)

The application uses Redux Toolkit for global state management. Key slices:

- `authSlice` — Current user and authentication state
- `organizationSlice` — Organization data and membership
- `apiKeySlice` — API key management
- `webhookSlice` — Webhook configuration
- `settingsSlice` — User settings and preferences

Access state and dispatch actions using the provided hooks:

```tsx
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { getCurrentUser, setUserFromToken } from "@/features/auth/authSlice";

function MyComponent() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  // Dispatch actions
  dispatch(getCurrentUser());
}
```

## API Integration

The application communicates with the AuthFlow backend API via Axios. API calls are centralized in:

- `src/app/api.ts` — Axios instance configuration
- `src/features/*/api.ts` — Feature-specific API calls

Example API call:

```ts
// src/features/auth/api.ts
import axios from "@/app/api";

export async function loginUser(email: string, password: string) {
  const response = await axios.post("/auth/login", { email, password });
  return response.data;
}
```

## Routing

The application uses React Router 7 for client-side navigation. Key routes:

- `/` — Home page
- `/login` — Login page
- `/register` — Signup page
- `/callback` — OAuth callback handler
- `/verify-email` — Email verification
- `/forgot-password` — Password reset request
- `/reset-password` — Password reset form
- `/mfa` — MFA login page
- `/dashboard` — Main dashboard (protected)
- `/settings` — User settings (protected)
- `/organizations` — Organization management (protected)
- `/api-keys` — API key management (protected)
- `/webhooks` — Webhook configuration (protected)
- `/audit-logs` — Audit log viewing (protected)
- `/admin` — Admin dashboard (admin only)

### Protected Routes

Use the `ProtectedRoute` component to protect routes that require authentication:

```tsx
import ProtectedRoute from "@/app/ProtectedRoute";
import Dashboard from "@/features/dashboard/pages/Dashboard";

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>;
```

## Forms and Validation

The application uses React Hook Form with Zod for form validation:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}
    </form>
  );
}
```

## Styling

The application uses Tailwind CSS for styling. Global styles are in `src/index.css`.

### Tailwind Configuration

Customization is in `tailwind.config.js`:

```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Custom colors
      },
    },
  },
};
```

## Notifications

Toast notifications are provided by Sonner. Display notifications like:

```tsx
import { toast } from "sonner";

// Success
toast.success("Settings saved!");

// Error
toast.error("Failed to save settings");

// Info
toast.info("Check your email");

// Loading
const id = toast.loading("Saving...");
toast.success("Saved!", { id });
```

## Icons

Icons come from Lucide React. Available icons are at [lucide.dev](https://lucide.dev):

```tsx
import { Mail, Lock, Settings } from "lucide-react";

function Icons() {
  return (
    <>
      <Mail size={24} />
      <Lock size={24} />
      <Settings size={24} />
    </>
  );
}
```

## Authentication Flow

The application supports multiple authentication methods:

### Email/Password Login

1. User enters email and password
2. Backend validates and returns JWT tokens
3. Tokens are stored in localStorage
4. User is redirected to dashboard

### OAuth2/OIDC

1. User clicks "Login with Provider"
2. Redirects to `/UniLogins/authorize` on backend
3. Provider authenticates the user
4. Redirects back to `/callback` with authorization code
5. Frontend exchanges code for tokens
6. User is logged in

### Magic Links

1. User enters email
2. Backend sends magic link email
3. User clicks link with token in URL
4. Frontend verifies token and logs user in

### Multi-Factor Authentication (MFA)

1. User logs in with email/password
2. If MFA is enabled, redirects to MFA setup/verification
3. User completes MFA challenge
4. Full authentication granted

## Environment Variables

Create a `.env.local` file to override defaults:

```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:3000

# API request timeout (milliseconds)
VITE_API_TIMEOUT=30000

# Enable debug logging
VITE_DEBUG=true
```

Access environment variables in code:

```ts
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## Building for Deployment

### Production Build

```bash
npm run build
```

Output is in the `dist/` directory. This is a fully static SPA that can be deployed to any static hosting service.

### Vercel Deployment

The application includes `vercel.json` configuration for Vercel deployments. It's already configured for SPA routing (redirects all routes to `index.html`).

To deploy:

1. Push code to GitHub/GitLab/Bitbucket
2. Connect repository to Vercel
3. Vercel auto-detects Vite and builds
4. Set environment variables in Vercel dashboard (if needed)
5. Deploy

### Other Hosting

For other platforms (Netlify, AWS S3, etc.):

1. Build: `npm run build`
2. Deploy the `dist/` directory
3. Configure SPA routing to redirect all routes to `index.html`

## Code Quality

### Linting

```bash
npm run lint
```

Fixes code style issues:

```bash
npm run lint -- --fix
```

### TypeScript

TypeScript is enforced in the build process. Run type checking:

```bash
npx tsc --noEmit
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Tips

1. **Code Splitting** — Features are lazy-loaded (route-based splitting)
2. **Image Optimization** — Use WebP with fallbacks
3. **Error Boundaries** — Implement error boundaries for better error handling
4. **Memoization** — Use `React.memo()` and `useMemo()` for expensive components
5. **Bundle Analysis** — Check bundle size with `vite-plugin-visualizer`

## Troubleshooting

### "Cannot find module" errors

Make sure all imports use correct paths relative to `src/`. Use TypeScript for better error detection.

### CORS errors

If API requests fail with CORS errors, ensure:

1. Backend API is running
2. Backend is configured to accept requests from frontend origin
3. `VITE_API_BASE_URL` points to the correct backend

### Build fails

1. Clean node_modules and reinstall: `rm -rf node_modules && npm install`
2. Clear build cache: `rm -rf dist/`
3. Check TypeScript errors: `npx tsc --noEmit`

## Contributing

1. Create a feature branch: `git checkout -b feature/feature-name`
2. Make changes and commit: `git commit -m "Add feature"`
3. Push to branch: `git push origin feature/feature-name`
4. Open a Pull Request

### Code Style

- Follow ESLint rules
- Use TypeScript strict mode
- Write meaningful variable/function names
- Add comments for complex logic
- Keep components small and focused

## License

Proprietary — AuthFlow 2024

## Support

For questions or issues, contact the AuthFlow team or check the backend README for API documentation.
