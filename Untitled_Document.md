# AI Email Support System

## Project Overview

This project is an AI-powered email support system that:

1. Receives customer emails.
2. Classifies the email category.
3. Extracts important information from the email.
4. Generates a professional support response.
5. Sends the response through Gmail.
6. Uses multiple LLM providers with automatic fallback.

---

# Architecture

```text
React Frontend
        ↓
FastAPI Backend
        ↓
LangChain Services
        ↓
LLM Router
(OpenRouter → Groq → Gemini)
        ↓
Email Processing
        ↓
Gmail API
```

---

# Multi-Model Strategy

## Primary Provider

```text
OpenRouter
```

## First Fallback

```text
Groq
```

## Second Fallback

```text
Gemini
```

Fallback is triggered when:

* API rate limits occur
* Provider is unavailable
* Empty response is returned
* Timeout occurs
* Any model exception occurs

---

# Backend Structure

```text
backend/
│
├── app/
│   │
│   ├── main.py
│   │
│   ├── api/
│   │   └── routes.py
│   │
│   ├── services/
│   │   ├── llm_router.py
│   │   ├── classifier.py
│   │   ├── extractor.py
│   │   ├── email_generator.py
│   │   └── gmail_service.py
│   │
│   ├── schemas/
│   │   └── email.py
│   │
│   ├── prompts/
│   │   ├── classify_prompt.py
│   │   ├── extract_prompt.py
│   │   └── response_prompt.py
│   │
│   └── config.py
│
├── .env
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

# File Explanations

---

## main.py

### Purpose

Application entry point.

Creates the FastAPI application and registers API routes.

### Responsibilities

* Create FastAPI instance
* Register routes
* Start application

### Pseudo Flow

```text
Create FastAPI app
        ↓
Register routes
        ↓
Start server
```

---

## api/routes.py

### Purpose

Receives requests from the React frontend.

### Responsibilities

* Accept incoming emails
* Validate requests
* Call processing services
* Return responses

### Pseudo Flow

```text
Receive email
        ↓
Classify
        ↓
Extract
        ↓
Generate response
        ↓
Return result
```

---

## services/llm_router.py

### Purpose

Central AI routing layer.

Handles model selection, fallback, and load balancing.

### Responsibilities

* OpenRouter requests
* Groq requests
* Gemini requests
* Fallback logic
* Provider health monitoring

### Pseudo Flow

```text
Try OpenRouter
        ↓
Failure?
        ↓ Yes
Try Groq
        ↓
Failure?
        ↓ Yes
Try Gemini
        ↓
Return response
```

---

## services/classifier.py

### Purpose

Categorizes incoming emails.

### Example Categories

```text
Billing
Refund
Technical Support
Complaint
Feature Request
General Inquiry
```

### Responsibilities

* Analyze email content
* Determine category

### Pseudo Flow

```text
Email text
        ↓
LLM
        ↓
Category
```

---

## services/extractor.py

### Purpose

Extracts structured information.

### Example Fields

```text
Customer Name
Issue
Priority
Order Number
Product Name
```

### Responsibilities

* Structured extraction
* Pydantic validation

### Pseudo Flow

```text
Email text
        ↓
LLM Extraction
        ↓
Pydantic Validation
        ↓
Structured Data
```

---

## services/email_generator.py

### Purpose

Creates support responses.

### Responsibilities

* Generate professional replies
* Use extracted data
* Use company tone

### Pseudo Flow

```text
Category
+
Extracted Data
        ↓
LLM
        ↓
Generated Email
```

---

## services/gmail_service.py

### Purpose

Communicates with Gmail API.

### Responsibilities

* Authenticate Gmail
* Create message
* Send email

### Pseudo Flow

```text
Generated Response
        ↓
Gmail API
        ↓
Customer
```

---

## schemas/email.py

### Purpose

Defines data models.

### Responsibilities

* Request validation
* Response validation
* Structured outputs

### Example Models

```text
EmailRequest

EmailResponse

ExtractedProperties
```

---

## prompts/classify_prompt.py

### Purpose

Stores classification prompt.

### Responsibilities

* Category instructions
* Classification rules

### Example

```text
Classify customer emails into:

Billing
Refund
Technical Support
Complaint
```

---

## prompts/extract_prompt.py

### Purpose

Stores extraction prompt.

### Responsibilities

* Extraction instructions
* JSON formatting rules

### Example

```text
Extract:

customer_name
issue
priority
order_id
```

---

## prompts/response_prompt.py

### Purpose

Stores email generation prompt.

### Responsibilities

* Writing guidelines
* Tone control
* Response format

### Example

```text
You are a professional support agent.

Write a concise and professional reply.
```

---

## config.py

### Purpose

Central configuration manager.

### Responsibilities

* Load environment variables
* Store settings
* Provide configuration access

### Example

```text
OPENROUTER_API_KEY

GROQ_API_KEY

GOOGLE_API_KEY

GMAIL_CLIENT_ID

GMAIL_CLIENT_SECRET
```

---

# Environment Variables

```env
OPENROUTER_API_KEY=

GROQ_API_KEY=

GOOGLE_API_KEY=

GMAIL_CLIENT_ID=

GMAIL_CLIENT_SECRET=

GMAIL_REFRESH_TOKEN=

GMAIL_SENDER_EMAIL=

HOST=0.0.0.0

PORT=8000

DEBUG=True
```

---

# Request Lifecycle

```text
Customer Email
        ↓
React Frontend
        ↓
FastAPI Route
        ↓
Classifier
        ↓
Extractor
        ↓
Email Generator
        ↓
LLM Router
(OpenRouter → Groq → Gemini)
        ↓
Generated Response
        ↓
Gmail Service
        ↓
Customer Receives Email
```

---

# Future Enhancements

* Redis caching
* Background workers (Celery)
* RabbitMQ queue
* Conversation memory
* Ticket management system
* Human approval workflow
* Analytics dashboard
* Admin panel
* Customer sentiment analysis
* Retrieval-Augmented Generation (RAG)
* Vector database integration
* Monitoring and logging

---

# Technology Stack

## Frontend

* React
* Axios
* Tailwind CSS

## Backend

* FastAPI
* LangChain
* Pydantic
* Python

## AI Providers

* OpenRouter
* Groq
* Gemini

## Email

* Gmail API

## Deployment

* Docker
* Azure / AWS / GCP (optional)

## Authentication

* OAuth 2.0

```
```
