## Table `processed_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `gmail_message_id` | `text` |  Unique |
| `processed_at` | `timestamptz` |  Nullable |
| `sender_email` | `text` |  Nullable |
| `subject` | `text` |  Nullable |
| `status` | `text` |  Nullable |

## Table `subscriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `tier` | `text` |  |
| `emails_used` | `int4` |  Nullable |
| `emails_limit` | `int4` |  Nullable |
| `period_start` | `timestamptz` |  Nullable |
| `period_end` | `timestamptz` |  Nullable |
| `status` | `text` |  Nullable |

## Table `gmail_watch_state`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `last_history_id` | `text` |  |
| `updated_at` | `timestamptz` |  Nullable |
| `user_id` | `text` |  Nullable Unique |

## Table `tickets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `sender_email` | `text` |  |
| `subject` | `text` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `category` | `text` |  Nullable |
| `resolution` | `text` |  Nullable |

## Table `ticket_messages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `ticket_id` | `uuid` |  |
| `direction` | `text` |  |
| `body` | `text` |  |
| `gmail_message_id` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `email_filters`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `type` | `text` |  |
| `pattern` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `approval_queue`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `ticket_id` | `uuid` |  Nullable |
| `sender_email` | `text` |  |
| `reply_subject` | `text` |  |
| `original_reply_body` | `text` |  |
| `edited_reply_body` | `text` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `acted_at` | `timestamptz` |  Nullable |

## Table `user_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `review_mode` | `bool` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `enable_history_cleanup` | `bool` |  Nullable |
| `is_admin` | `bool` |  Nullable |

## Table `processed_emails`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `user_id` | `text` |  Nullable |
| `message_id` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `business_profile_presets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `type_key` | `text` |  Unique |
| `name` | `text` |  |
| `categories` | `jsonb` |  |
| `extraction_fields` | `jsonb` |  |
| `default_tone` | `text` |  |
| `default_style` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `user_business_profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `preset_type_key` | `text` |  Nullable |
| `tone_override` | `text` |  Nullable |
| `style_override` | `text` |  Nullable |
| `categories_override` | `jsonb` |  Nullable |
| `onboarding_complete` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `gmail_oauth_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `refresh_token` | `text` |  |
| `access_token` | `text` |  Nullable |
| `sender_email` | `text` |  Nullable |
| `token_expiry` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

