# Payment Orchestration API

A NestJS service that initiates payments, handles provider webhooks, tracks transactions, and exposes Prometheus metrics. It supports both a fast “mock mode” for local dev and a full stack with Postgres/Redis/Grafana/Prometheus.

---

## Features
- Initiate payments with optional provider preference (`PAYSTACK`, `FLUTTERWAVE`)
- Webhook handling with signature verification and idempotency
- Transaction persistence (Postgres) and mock storage for DB-less dev
- API key protection via `x-api-key`
- Prometheus metrics for request rate/latency and webhook outcomes
- Grafana dashboard auto-provisioned (datasource + starter dashboard)

## Architecture
- Nest modules: `PaymentsModule`, `TransactionsModule`, `ProvidersModule`, `WebhooksModule`, `MetricsModule`
- Providers: `PaystackService`, `FlutterwaveService`
- Transactions: `TransactionEntity` (TypeORM), `TransactionsService`, plus mock service for DB-less mode
- Security: `ApiKeyGuard` validates the `x-api-key` header against configured values
- Metrics: global interceptor instruments HTTP requests; `/metrics` endpoint surfaces Prometheus metrics

---

## Quick Start (Mock Mode)
Run the API without DB/Redis.

```powershell
$env:DB_MOCK="true"
$env:PORT="3001"
$env:API_KEY_HEADER="x-api-key"
$env:API_KEY_VALUES="test_key_123,another_key_456"
# Optional: accept signed Flutterwave webhooks
$env:FLW_SECRET_HASH="test_secret_hash_123"

npm run start:dev
```

- API: `http://localhost:3001`
- Metrics: `http://localhost:3001/metrics`

---

## Environment Variables

Core
- `PORT` default `3000`
- `API_KEY_HEADER` default `x-api-key`
- `API_KEY_VALUES` comma-separated, e.g. `test_key_123,another_key_456`
- `DB_MOCK` `true|false` (mock mode skips DB)

Database
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`

Redis
- `REDIS_HOST`, `REDIS_PORT`

Providers
- `PAYSTACK_SECRET_KEY` (real Paystack initiation)
- `FLUTTERWAVE_SECRET_KEY` (real Flutterwave initiation)
- `FLW_SECRET_HASH` (accept signed Flutterwave webhooks)

Rate limiting and metrics
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`
- `PROMETHEUS_PORT` optional if exposing metrics separately (default shares app port)

---

## Run With Docker (Postgres/Redis)
Start infra:

```powershell
docker compose up -d postgres redis
```

Run API on host pointing to Docker services:

```powershell
$env:DB_MOCK="false"
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="password"
$env:DB_NAME="payment_orchestration"
$env:REDIS_HOST="localhost"
$env:REDIS_PORT="6379"

npm run start:dev
```

Notes
- If you run the API inside Docker later, use `DB_HOST="postgres"` and `REDIS_HOST="redis"` (Docker service names).

---

## Observability Stack
Start monitoring:

```powershell
docker compose up -d prometheus grafana
```

- Prometheus scrapes `http://host.docker.internal:3001/metrics` every 5s (Windows/macOS Docker Desktop)
- Grafana UI: `http://localhost:3002` (login `admin` / `admin`)
- Prometheus UI: `http://localhost:9090`

Auto-provisioned (via `monitoring/grafana/provisioning` and `monitoring/grafana/dashboards`):
- Datasource: Prometheus at `http://prometheus:9090`
- Dashboard: “Payment API Observability” (request rate, webhook outcomes, P95 latency)

If you change API port, update `monitoring/prometheus.yml` target accordingly.

---

## API Endpoints

### POST `/payments/initiate`
Initiate a payment.

Body (`InitiatePaymentDto`):
```json
{
  "amount": 2500,
  "currency": "NGN",
  "customer": { "email": "obs@test.com" },
  "provider_preference": "FLUTTERWAVE", // optional
  "metadata": { "orderId": "ORD-123" } // optional
}
```

Response:
```json
{
  "provider": "PAYSTACK" | "FLUTTERWAVE",
  "reference": "TX-REF-123",
  "checkout_url": "https://..." // if provider requires redirect
}
```

Headers: `x-api-key: <one-of-API_KEY_VALUES>`

### GET `/transactions/:reference`
Fetch transaction details by reference.

### POST `/webhooks/payment`
Accepts provider webhook payloads, verifies signatures, updates transaction status.
Idempotent: duplicates are detected and counted.

### GET `/metrics`
Prometheus metrics including:
- `api_requests_total`
- `api_request_duration_seconds_bucket/sum/count`
- `webhook_events_total{provider,outcome}`
- Node.js process metrics

---

## Webhook Signatures

Flutterwave
- Header: `Verif-Hash` must equal `FLW_SECRET_HASH`
- Example: `Verif-Hash: test_secret_hash_123`

Paystack
- Header: `x-paystack-signature` equals HMAC SHA512 of raw request body with `PAYSTACK_SECRET_KEY`
- Signature = `hex(sha512_hmac(secret, rawBody))`

---

## Generate Sample Traffic (PowerShell)

Signed Flutterwave success + duplicate (requires `FLW_SECRET_HASH` as set above):

```powershell
$apiKey = "test_key_123"
$base = "http://localhost:3001"
$headers = @{ "x-api-key" = $apiKey; "Verif-Hash" = "test_secret_hash_123" }

# Initiate a payment
$initPayload = @{ amount = 2500; currency = "NGN"; customer = @{ email = "obs@test.com" }; provider_preference = "FLUTTERWAVE" } | ConvertTo-Json -Depth 5
$init = Invoke-RestMethod -Method Post -Uri "$base/payments/initiate" -Headers @{ "x-api-key" = $apiKey } -ContentType "application/json" -Body $initPayload
$txRef = $init.reference

# Send success webhook
$webhook = @{ status = "successful"; tx_ref = $txRef; id = 1001 } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri "$base/webhooks/payment" -Headers $headers -ContentType "application/json" -Body $webhook

# Send duplicate webhook for same reference
Invoke-RestMethod -Method Post -Uri "$base/webhooks/payment" -Headers $headers -ContentType "application/json" -Body $webhook

# Check metrics
Invoke-RestMethod -Method Get -Uri "$base/metrics" | Select-String -Pattern "webhook_events_total"
```

Invalid signatures (populate error outcomes):

```powershell
$badHeaders = @{ "x-api-key" = $apiKey; "Verif-Hash" = "wrong" }
Invoke-RestMethod -Method Post -Uri "$base/webhooks/payment" -Headers $badHeaders -ContentType "application/json" -Body $webhook
```

---

## Grafana Queries (PromQL)
- Request rate:
  ```promql
  sum by (route,method,status) (rate(api_requests_total[1m]))
  ```
- P95 latency:
  ```promql
  histogram_quantile(0.95, sum by (le,route,method,status) (rate(api_request_duration_seconds_bucket[5m])))
  ```
- Webhook outcomes:
  ```promql
  sum by (provider,outcome) (rate(webhook_events_total[5m]))
  ```

---

## Project Structure
- `src/metrics` Prometheus service, interceptor, module
- `src/payments` controller/service/dto
- `src/providers` Paystack/Flutterwave provider services + interface
- `src/transactions` entity, service, modules (real + mock)
- `src/webhooks` controller with signature verification and idempotency
- `monitoring/prometheus.yml` scrape targets
- `monitoring/grafana/...` provisioning + dashboards
- `docker-compose.yml` services: Prometheus, Grafana, Postgres, Redis

---
