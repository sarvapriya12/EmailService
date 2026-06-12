# Frontend-Backend Integration Guide

This document outlines how to build the connection between the React frontend and the FastAPI backend. It provides a comprehensive map of all available API routes, backend services, and connection strategies to ensure seamless communication.

---

## 1. Connection Strategy (Axios Setup)

The backend uses **JWT (JSON Web Tokens)** for authentication. To connect the frontend smoothly, you should configure an **Axios Interceptor**. This ensures that the JWT token is automatically attached to every request, so you don't have to add it manually in every component.

### Example `src/services/api.js`
```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to inject the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global error handling (e.g., auto-logout on 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 2. API Routes Mapping

Here is the complete list of REST API endpoints exposed by the backend, grouped by feature.

### Authentication (`/auth`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Register a new user account. Returns a JWT token. |
| `/auth/login` | POST | Login with email/password. Returns a JWT token. |
| `/auth/me` | GET | Validates token and returns current user info. |

### Gmail OAuth Integration (`/auth/gmail`)
*Crucial for the Onboarding and Settings pages.*
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/gmail/connect` | GET | Returns `oauth_url`. The frontend should `window.location.href = response.oauth_url` to redirect the user to Google. |
| `/auth/gmail/callback` | GET | **Handled by Backend**. Google redirects here. Backend exchanges the code for a token and redirects back to the frontend (`/settings?gmail_connected=true`). |
| `/auth/gmail/status` | GET | Returns `{"connected": true, "email": "..."}`. Use this to update the UI on the Dashboard/Settings. |
| `/auth/gmail/disconnect` | DELETE | Revokes Google access and deletes the stored token. |

### Business Profiles (`/business`)
*Used during Onboarding and in the Settings page.*
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/business/presets` | GET | Lists all available preset business types (e.g., Freelancer, Ecommerce) for the user to choose from. |
| `/business/profile` | GET | Gets the user's active configuration (tone, style, categories). |
| `/business/profile/type` | POST | Selects a business type, applying its default preset. |
| `/business/profile/tone` | PATCH | Customizes the AI response tone (e.g., friendly, professional). |
| `/business/profile/style` | PATCH | Customizes the AI response style (e.g., concise, detailed). |
| `/business/profile/complete-onboarding` | POST | Marks the onboarding flow as complete. |

### Email Processing & Tasks (`/tasks` & `/email`)
*The backend processes emails asynchronously via Celery.*
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/process-email` | POST | Manually processes an email. Returns `{"status": "queued", "task_id": "123..."}`. |
| `/tasks/{task_id}` | GET | Poll this endpoint every 2 seconds to check if the background task is `pending`, `success`, or `failed`. |

### Dashboard & Tickets (`/tickets`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tickets` | GET | Lists all support tickets. |
| `/tickets/{ticket_id}` | GET | Gets details and thread for a specific ticket. |

### Approval Queue (`/queue`)
*For emails waiting for human approval before sending.*
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/queue` | GET | Lists all pending AI replies that need review. |
| `/queue/{queue_id}/approve` | POST | Approves the AI reply and sends the email via Gmail. |
| `/queue/{queue_id}/reject` | POST | Rejects the AI reply and deletes it from the queue. |

### Admin Controls (`/admin`)
*Only accessible to users with `is_admin = true`.*
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/stats` | GET | Returns global system stats (total users, total emails, errors). |
| `/admin/users` | GET | Lists all registered users and their tiers. |
| `/admin/users/{user_id}/upgrade` | POST | Manually upgrades a user's subscription tier. |

---

## 3. Backend Services Overview

Understanding what the backend services do will help you understand the data flow when building the React app.

#### `gmail_oauth_service.py`
* **What it does:** Manages multi-tenant Google logins. It encrypts user Refresh Tokens with AES-256 and stores them in Supabase. It features an in-memory cache to prevent database spam when processing multiple emails rapidly.
* **Frontend impact:** You don't manage Google tokens on the frontend. Just call `/auth/gmail/connect` and the backend does the rest.

#### `business_service.py`
* **What it does:** Merges a user's custom settings with system defaults. If a user sets their tone to "warm", this service ensures the LLM Prompt gets that exact instruction.
* **Frontend impact:** When building the Settings page, hitting the `/business/profile` PATCH routes immediately updates how the AI talks for that specific user.

#### `email_pipeline_service.py`
* **What it does:** The brain of the operation. It runs: `Classify -> Extract Data -> Generate Reply -> Put in Queue (or Send)`. 
* **Frontend impact:** When this pipeline runs successfully, a new ticket appears in the `/tickets` endpoint, or a new item appears in the `/queue` endpoint.

#### `llm_router.py`
* **What it does:** A highly resilient load balancer for AI models. If Groq hits a rate limit, this service instantly switches to Gemini or OpenRouter without crashing.
* **Frontend impact:** Users won't see "AI failed" errors often. If the `/process-email` task fails, it genuinely means all AI providers are down.

#### `database.py`
* **What it does:** Manages connection to Supabase. Uses a global distributed lock (Idempotency Key) to ensure that if Google sends the same webhook 5 times simultaneously, the backend only processes it once.

#### `celery_app.py` & `tasks/email_tasks.py`
* **What it does:** Offloads the heavy AI processing to background workers using Redis.
* **Frontend impact:** The frontend API calls will be lightning fast (under 100ms) because the backend just puts the task in a queue and responds immediately. The frontend must implement a polling mechanism (e.g., `setInterval` calling `/tasks/{id}`) to show a loading spinner until the task completes.

---

## 4. Frontend State Management Recommendations

For a clean architecture in React, it is recommended to use **Zustand** or **React Context** to manage global state:

1. **Auth Store (`useAuthStore`)**:
   * Store the JWT token and the `user` object.
   * Handle login/logout functions.

2. **Settings Store (`useSettingsStore`)**:
   * Store the user's Business Profile (tone, style).
   * Store the Gmail Connection status (`isConnected: boolean`, `email: string`).

3. **Tickets Store (`useTicketStore`)**:
   * Keep track of the Approval Queue counts. (e.g., showing a notification badge like "3 Pending Approvals" in the Navbar).

## 5. Typical Data Flow (Example: OAuth Connection)

1. **User clicks "Connect Gmail"** on React Frontend.
2. React calls `api.get('/auth/gmail/connect')`.
3. Backend returns `{ "oauth_url": "https://accounts.google.com/..." }`.
4. React executes `window.location.href = response.data.oauth_url`.
5. User clicks "Allow" on the Google screen.
6. Google redirects the user to the Backend (`/auth/gmail/callback?code=...`).
7. Backend handles encryption, saves the token, and returns a redirect to the Frontend URL: `http://localhost:5173/settings?gmail_connected=true`.
8. React loads the Settings page, sees the URL parameter, shows a success toast, and fetches the new status via `/auth/gmail/status`.