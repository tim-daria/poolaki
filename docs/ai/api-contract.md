# AI Service API Contract

This document defines the communication contract between the Django backend and the AI Service.

The Django backend remains responsible for authentication, authorization, business rules, and financial data ownership.

The AI Service is responsible for AI-specific workflows and processing.

---

## Current Endpoints

### Health Check

#### GET /health

Used to verify that the AI Service is running correctly.

This endpoint is used by Docker health monitoring.

#### Request

No request body required.

#### Response

```json
{
  "status": "healthy"
}