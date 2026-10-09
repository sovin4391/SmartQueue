# SmartQueue

**Cloud-Based Campus Queue Management System using React and AWS**

SmartQueue is a campus service queue application. Students can join a queue for a selected service and receive a ticket with their current position. Authenticated staff can review queue status and call, complete, or skip tickets.

## Problem Statement

Campus offices and shared services can create crowded, hard-to-manage waiting areas. SmartQueue provides a browser-based way to record service requests and gives staff a queue dashboard for managing tickets.

## Objectives

- Let students request a place in a campus service queue.
- Show the created ticket and its position among waiting tickets.
- Provide staff sign-in and email verification through Amazon Cognito.
- Provide queue management actions backed by an HTTP API and DynamoDB.

## Implemented Features

- Student queue entry for Office, Library, Lab, Administration, and Canteen.
- Ticket confirmation with service, status, ticket ID, and position at creation time.
- Cognito registration, sign-in, email confirmation, and confirmation-code resend flows.
- Staff dashboard with service selection, manual refresh, queue status counts, and current serving ticket.
- Staff actions to call the next waiting ticket, complete a serving ticket, or skip it.
- Lambda HTTP handlers for health checks, queue reads, ticket creation, and queue actions.

## Technology Stack

- Frontend: React, JavaScript, Vite, and CSS.
- Authentication: `amazon-cognito-identity-js` with a public Cognito app client.
- Backend: AWS Lambda with Python and `boto3`.
- Queue storage: Amazon DynamoDB.
- HTTP integration: Amazon API Gateway is expected to expose the Lambda routes; the API Gateway infrastructure is not defined in this repository.

This codebase does not use Tailwind CSS or React Router. AWS S3/CloudFront hosting is not configured in the repository; hosting the Vite build there is a possible deployment approach, not a verified project feature.

## Architecture Overview

```text
Browser (React/Vite)
	|-- Cognito SDK ----------------------> Amazon Cognito User Pool
	|-- HTTP queue requests -------------> API Gateway -> Lambda (Python)
																									 |--> DynamoDB
```

The frontend calls `GET /health`, `GET /queue?service=...`, `POST /queue`, and `POST /queue/action`. The Lambda handler reads and updates queue tickets in DynamoDB. The Lambda table name is configured with `TABLE_NAME` and defaults in code to `SmartQueueMain` if that variable is absent.

## Project Structure

```text
.
|-- backend/
|   `-- lambda_function.py
|-- public/
|   `-- favicon.svg
|-- src/
|   |-- context/
|   |   `-- AuthContext.jsx
|   |-- App.jsx
|   |-- index.css
|   `-- main.jsx
|-- .env.example
|-- .gitignore
|-- index.html
|-- package.json
|-- package-lock.json
`-- vite.config.js
```

## Prerequisites

- Node.js compatible with the Vite version in `package.json` and npm.
- A configured Cognito User Pool with a public app client for browser sign-in.
- A reachable API exposing the documented queue routes, backed by the Lambda handler and a DynamoDB table.

AWS resources are not provisioned by this repository. Configure the Lambda execution role, table, API routes, CORS, and any API authorization separately before connecting a deployment.

## Local Setup

Install the frontend dependencies:

```sh
npm install
```

Create a local `.env` from `.env.example` only if you do not already have one, then replace the placeholders with your own public frontend configuration. Do not commit `.env`. Vite embeds `VITE_*` values into the browser bundle, so never put passwords, AWS access keys, Cognito client secrets, or other private credentials in these variables.

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the API Gateway stage; no queue routes are appended here. |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool identifier. |
| `VITE_COGNITO_CLIENT_ID` | Public Cognito app client identifier; use a client without a client secret. |
| `VITE_COGNITO_REGION` | AWS Region containing the User Pool. |

Start the development server:

```sh
npm run dev
```

Create and preview a production build:

```sh
npm run build
npm run preview
```

Run the configured linter with `npm run lint`.

## AWS Integration

- **Amazon Cognito:** Handles staff registration, sign-in, email confirmation, and confirmation-code resend in the frontend.
- **Amazon API Gateway:** The frontend expects the queue routes listed above. Gateway configuration is external to this repository.
- **AWS Lambda:** `backend/lambda_function.py` validates queue input, creates tickets, orders queue reads, and conditionally transitions ticket statuses.
- **Amazon DynamoDB:** Stores tickets by service and ticket identifier. Set `TABLE_NAME` in the Lambda environment and grant the function the required table permissions.
- **Amazon S3:** No bucket configuration or deployment workflow is included. Static hosting on S3 (optionally with CloudFront) remains a deployment task.

## Screenshots

Add screenshots of the student queue form, ticket confirmation, Cognito sign-in/verification, and staff dashboard here when available.

<!-- Screenshot placeholders: student view, ticket confirmation, staff dashboard -->

## Known Limitations

- Queue position is calculated when a student joins; the student view does not continuously refresh that position.
- Queue updates in the staff dashboard require manual refresh or an action that reloads the selected queue.
- No API Gateway, Cognito, DynamoDB, IAM, or S3 infrastructure definitions or automated deployment scripts are included.
- The Lambda handler returns permissive CORS headers. Configure and verify the deployed API's CORS and authorization policies for the intended environment.
- The repository does not include automated frontend or backend tests.

## Future Enhancements

- Add automated tests for queue ordering, status transitions, and authentication flows.
- Add a student ticket lookup with refreshed position and optional notifications.
- Add role-based staff authorization at the API boundary and least-privilege infrastructure definitions.
- Add infrastructure-as-code and a repeatable static frontend deployment workflow.
