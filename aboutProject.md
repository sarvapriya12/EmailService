# About Project

## Overview

This project is a FastAPI-based AI email support system.
It classifies incoming support emails, extracts structured details, generates a reply, and can send that reply through Gmail.
It also supports Gmail watch setup and a Pub/Sub push endpoint so watched Gmail inbox events can be received and processed.

## What The Project Can Do

- Accept a support email through `POST /process-email`.
- Classify the email into one of these categories: billing, refund, technical_support, complaint, feature_request, or general_inquiry.
- Extract structured fields from the email, including customer name, issue, priority, reference number, and product name.
- Generate a support reply based on the email and the extracted fields.
- Send the generated reply through Gmail using the configured sender account.
- Start Gmail watch registration through `POST /gmail/watch` when the Gmail Pub/Sub topic is configured.
- Receive Gmail Pub/Sub push notifications through `POST /gmail/push`.
- Fetch the latest Gmail message from history after a watch notification arrives.
- Run the fetched email through the same classify -> extract -> generate -> send pipeline.
- Use prompt templates stored in `prompts/` instead of hardcoded prompt strings inside service files.
- Pass the current test suite locally.

## What The Project Cannot Do Yet

- It does not have JWT authentication.
- It does not have user accounts, login, or role-based access control.
- It does not use a database for users, tickets, subscriptions, or Gmail tokens.
- It does not persist processed Gmail history IDs or deduplicate watch notifications.
- It does not have Redis rate limiting.
- It does not use Celery or any background job queue.
- It does not handle multi-user Gmail OAuth.
- It does not have a ticketing system.
- It does not have a Telegram integration.
- It does not have an analytics dashboard.
- It does not include a production deployment config for every cloud provider.

## Current Architecture

```text
FastAPI
  -> routes/email_routes.py
  -> services/email_pipeline_service.py
  -> services/classifier.py
  -> services/extractor.py
  -> services/email_generator.py
  -> services/gmail_service.py
  -> Gmail API

FastAPI
  -> routes/email_routes.py
  -> services/gmail_watch_service.py
  -> schemas/pubsub.py
  -> services/gmail_service.py
  -> Gmail API history/messages
```

### Main Components

- `main.py` creates the FastAPI app and exposes `/` and `/health`.
- `routes/email_routes.py` defines the API endpoints.
- `services/email_pipeline_service.py` runs the full email pipeline.
- `services/classifier.py` classifies the email category.
- `services/extractor.py` extracts structured fields.
- `services/email_generator.py` drafts the reply.
- `services/gmail_service.py` sends Gmail replies and handles Gmail watch/history/message fetch.
- `services/gmail_watch_service.py` parses Pub/Sub watch notifications.
- `services/prompt_loader.py` loads prompt templates from the `prompts/` folder.

## API Endpoints

### `GET /`

- Returns a simple running message.

### `GET /health`

- Returns `{"status": "ok"}` for deployment health checks.

### `POST /process-email`

- Takes an `EmailRequest` payload.
- Runs classification, extraction, reply generation, and Gmail send.
- Returns an `EmailResponse` payload.

### `POST /gmail/watch`

- Starts Gmail watch registration using the configured Gmail Pub/Sub topic.
- Returns the Gmail watch response if the setup succeeds.

### `POST /gmail/push`

- Accepts a Pub/Sub push notification.
- Decodes the Gmail watch notification payload.
- Reads Gmail history for new message IDs.
- Fetches the latest Gmail message.
- Passes the message into the same email pipeline used by `/process-email`.

## Data Schemas

### `schemas/email.py`

#### `EmailRequest`

- `sender_email`: the sender address.
- `subject`: email subject line.
- `body`: email body text.

#### `ExtractedData`

- `customer_name`
- `issue`
- `priority`
- `reference_number`
- `product_name`
- `raw_response`

#### `EmailResponse`

- `category`
- `extracted_data`
- `generated_reply_body`
- `generated_reply_subject`
- `gmail_status`
- `success`

### `schemas/pubsub.py`

#### `PubSubMessage`

- `data`
- `messageId`
- `attributes`

#### `PubSubPushRequest`

- `message`
- `subscription`

## Prompt Files

The project now stores prompt text in the `prompts/` folder.

- `prompts/email_classifier.txt`
- `prompts/email_extractor.txt`
- `prompts/email_generator.txt`

These are loaded through `services/prompt_loader.py`, which uses `string.Template` and keeps the prompt text out of the service files.

## How The Workflow Works

### Manual Email Processing

1. A client calls `POST /process-email`.
2. `EmailPipelineService` creates the classifier, extractor, generator, and Gmail sender.
3. The classifier chooses a category.
4. The extractor pulls structured fields.
5. The generator drafts a reply.
6. Gmail sends the reply.
7. The response contains the category, extracted data, reply subject, reply body, Gmail send status, and success flag.

### Gmail Watch Workflow

1. A Gmail watch is started with `POST /gmail/watch`.
2. Gmail sends Pub/Sub notifications when new messages arrive.
3. The Pub/Sub push request hits `POST /gmail/push`.
4. `GmailWatchService` decodes the notification.
5. `GmailService` fetches the new Gmail message from history.
6. `EmailPipelineService` processes the message.
7. The reply is sent back through Gmail.

## Test Cases

### `tests/test_classifier.py`

- Verifies that classification returns the expected category and prompt contents.
- Verifies the default category when the response does not contain a known category.
- Verifies `_parse_category` handles uppercase category text.
- Verifies `_parse_category` returns `general_inquiry` for an empty response.
- Verifies `_parse_category` returns `general_inquiry` for the known hyphenated feature request case.

### `tests/test_email_pipeline_service.py`

- Verifies the full pipeline processes an email and sends a reply.
- Uses stub router and stub Gmail service objects.

### `tests/test_gmail_service.py`

- Verifies base64url decoding of Gmail message content.
- Verifies message parsing for sender, subject, and plain-text body.
- Verifies Gmail history fetching returns a parsed message.

### `tests/test_gmail_watch_service.py`

- Verifies Pub/Sub message decoding.
- Verifies Gmail watch notification parsing.
- Verifies missing history IDs raise an error.

## Current Strengths

- The prompt text is no longer hardcoded inside the service classes.
- The pipeline is split into reusable services.
- Gmail watch notifications can be parsed and routed into the email pipeline.
- The project has focused tests around classifier behavior, email pipeline flow, Gmail history parsing, and Gmail watch notification parsing.
- The app has a health endpoint for deployment checks.

## What Is Left To Do

- Add authentication and authorization.
- Add a database and persistence layer.
- Store processed Gmail history IDs to avoid duplicate processing.
- Add retries and idempotency for Pub/Sub notifications.
- Add background job processing if email volume increases.
- Add rate limiting.
- Add multi-user Gmail OAuth if the product becomes multi-tenant.
- Add a ticket system and ticket state tracking.
- Add deployment-specific secrets and runtime configuration docs for the chosen host.
- Add more integration tests for full Gmail watch -> fetch -> pipeline behavior.
- Add docs for environment variables and operational setup.

## Notes On Deployment

- The app currently has Docker support.
- The repo also contains Render deployment configuration.
- CI runs the test suite, sanity checks the app, and builds the Docker image.

## Summary

This is now a modular AI email support service with:

- a clean FastAPI API surface,
- prompt files instead of hardcoded prompts,
- a reusable email pipeline,
- Gmail watch registration,
- Pub/Sub notification parsing,
- Gmail history fetch support,
- and tests covering the main working pieces.

The main missing production pieces are authentication, persistence, deduplication, and operational hardening.