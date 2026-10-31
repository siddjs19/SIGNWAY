
# SIGNWAY — Communication Beyond Words

**AI-powered Indian Sign Language (ISL) communication platform**

SIGNWAY aims to make communication more accessible by bringing sign-language recognition and digital communication tools together in one platform. It combines an AI-powered sign-language workflow with a web application and a blockchain-based credential registry prototype.

> **Project status:** The web application and blockchain contract are under development. The `CredentialRegistry` contract compiles and has been tested locally. It has **not yet been deployed to Coral Testnet**, and therefore does not currently have a live contract address or on-chain transaction proof.

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Proposed Solution](#proposed-solution)
- [Objectives](#objectives)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [How the Application Works](#how-the-application-works)
- [Blockchain Credential Registry](#blockchain-credential-registry)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Limitations and Future Scope](#limitations-and-future-scope)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

SIGNWAY is a communication accessibility project focused on Indian Sign Language (ISL).

The project explores how computer vision, AI, web technologies, and blockchain can be combined to support communication between sign-language users and people who may not understand sign language.

The platform is designed around three main components:

1. **Sign-language interaction:** An AI-based workflow for recognizing or processing sign-language input.
2. **Web application:** A user interface for interacting with the platform.
3. **Credential registry prototype:** A Solidity smart contract designed to issue, verify, and revoke credential records using blockchain.

SIGNWAY is a prototype and should not be considered a complete replacement for professional interpreters or a validated sign-language translation system.

## Problem Statement

Communication barriers can arise when people who use sign language interact with people who do not understand it.

Access to interpreters may not always be immediate or convenient. In addition, sign-language recognition systems face challenges involving variations in signing style, movement, lighting, camera position, and context.

SIGNWAY explores a technology-assisted approach to reducing these barriers through an accessible digital interface and AI-supported sign-language interaction.

## Proposed Solution

SIGNWAY brings together a web-based communication interface and an AI-powered sign-language workflow.

The application is intended to:

- Provide a digital interface for sign-language interaction.
- Use AI-based processing to support sign-language recognition.
- Present recognition results through the application interface.
- Provide a foundation for extending the platform with additional accessibility tools.
- Explore blockchain-backed credential records through a separate smart-contract component.

The system is modular so that the AI, backend, frontend, and blockchain components can be developed and tested independently.

## Objectives

- Explore AI-assisted Indian Sign Language communication.
- Build a usable web application for accessibility-focused interaction.
- Integrate an AI service into a web-based workflow.
- Develop a backend for application services and data management.
- Implement a Solidity credential registry with issuer access control.
- Demonstrate local smart-contract compilation and testing.
- Establish a foundation for future deployment and integration.

## Key Features

### AI-assisted sign-language workflow

SIGNWAY includes an AI-oriented sign-language interaction workflow intended to process sign-language input and present results through the application.

The accuracy and coverage of recognition depend on the underlying model, supported classes, input conditions, and implementation. The system should be evaluated with real users and diverse signing conditions before being used in real-world communication settings.

### Web application

The web application provides the user-facing interface for SIGNWAY.

The frontend communicates with backend APIs to support application functionality. The frontend and backend can be run and deployed separately.

### Backend services

The backend is built with Node.js and Express. It provides an API layer for the frontend and connects to MongoDB for application data.

### Blockchain credential registry

The Solidity `CredentialRegistry` contract provides functions for:

- Issuing credential records.
- Verifying credential records.
- Revoking credential records.
- Restricting issuance and revocation to authorized issuers.
- Emitting events for issuance and revocation.

The contract stores a credential identifier, subject address, metadata hash, issuance timestamp, and revocation status.

**Current status:** The contract has been compiled and tested locally. It has not been deployed to Coral Testnet.

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Frontend tooling | Vite |
| Backend | Node.js |
| API framework | Express |
| Database | MongoDB |
| AI integration | AI service/model integration |
| Smart contracts | Solidity |
| Smart-contract development | Hardhat |
| Contract library | OpenZeppelin AccessControl |
| Blockchain network target | MST Coral Testnet |
| Version control | Git and GitHub |

---

## System Architecture

The application is organized into independent components.

```text
                  ┌──────────────────────┐
                  │      User / Client   │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   React + Vite UI    │
                  │      Frontend        │
                  └──────────┬───────────┘
                             │ HTTP API
                             ▼
                  ┌──────────────────────┐
                  │   Node.js + Express  │
                  │       Backend        │
                  └───────┬────────┬─────┘
                          │        │
                          ▼        ▼
                 ┌────────────┐  ┌──────────────┐
                 │  MongoDB   │  │ AI Service / │
                 │            │  │ Model        │
                 └────────────┘  └──────────────┘


       Separate Blockchain Development Component

                  ┌──────────────────────┐
                  │ CredentialRegistry   │
                  │     Solidity         │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Hardhat Local Tests  │
                  │ / Testnet Deployment │
                  └──────────────────────┘
```

The diagram represents the project’s component boundaries. The AI and blockchain paths should only be considered live integrations when the corresponding service or contract is configured and available.

---

## Project Structure

The project contains a frontend, backend, and blockchain development component.

A simplified structure is shown below. Directory names may differ slightly in the current repository.

```text
SIGNWAY/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── blockchain/
│   ├── contracts/
│   │   └── CredentialRegistry.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   ├── hardhat.config.js
│   ├── package.json
│   └── ...
│
└── README.md
```

---

## How the Application Works

### 1. User interaction

The user interacts with the SIGNWAY frontend through the web interface.

### 2. Frontend processing

The frontend handles the user interface and communicates with backend endpoints where required.

### 3. Backend processing

The Express backend receives API requests and coordinates application services, data access, and configured AI integrations.

### 4. AI processing

The sign-language workflow uses the configured AI model or service to process supported input. The recognition result is returned to the application for presentation.

The supported gesture vocabulary and recognition behavior depend on the model and implementation currently configured in the repository.

### 5. Credential registry

The blockchain component is separate from the core application workflow. It is designed to record credential metadata hashes and provide issuer-controlled verification and revocation.

---

## Blockchain Credential Registry

### Contract

The project includes:

```text
blockchain/contracts/CredentialRegistry.sol
```

The contract uses OpenZeppelin's `AccessControl` to manage permissions.

### Credential data

Each credential record contains:

| Field | Description |
|---|---|
| `subject` | Address associated with the credential |
| `metadataHash` | Hash representing credential metadata |
| `issuedAt` | Credential issuance timestamp |
| `revoked` | Whether the credential has been revoked |

The credential identifier is used as the key for retrieving the record.

### Contract functions

#### `issue(bytes32 id, address subject, bytes32 metadataHash)`

Issues a credential record.

The function:

- Requires the caller to have `ISSUER_ROLE`.
- Rejects a zero credential identifier.
- Rejects a zero subject address.
- Prevents a credential identifier from being issued more than once.
- Stores the credential record.
- Emits `CredentialIssued`.

#### `verify(bytes32 id)`

Returns the stored credential data:

- Subject address
- Metadata hash
- Issuance timestamp
- Revocation status

A client should interpret a record as issued when its issuance timestamp is nonzero. It should also check that the credential has not been revoked.

#### `revoke(bytes32 id)`

Revokes an existing credential.

The function:

- Requires the caller to have `ISSUER_ROLE`.
- Rejects unknown credentials.
- Rejects credentials that have already been revoked.
- Updates the revocation status.
- Emits `CredentialRevoked`.

### Roles

The contract defines:

- `DEFAULT_ADMIN_ROLE`
- `ISSUER_ROLE`

The constructor grants both roles to the supplied admin address.

### Current deployment status

The contract has been compiled and tested locally.

The deployment attempt to Coral Testnet was stopped because the deployer wallet had no testnet gas balance. No funds were added, and no live deployment was completed.

| Item | Status |
|---|---|
| Solidity contract | Implemented |
| Local compilation | Successful |
| Local contract tests | Run locally |
| Coral Testnet deployment | Not completed |
| Live contract address | Not available |
| On-chain transaction proof | Not available |

The project should not claim a deployed blockchain contract until a successful deployment transaction and contract address are available.

---

## Installation and Setup

### Prerequisites

Install the following tools:

- Node.js and npm
- Git
- MongoDB, either locally or through MongoDB Atlas
- A compatible browser

For blockchain development, also install or configure:

- Hardhat dependencies
- A test wallet, if deploying to a testnet
- Testnet gas tokens, if performing a testnet deployment

### Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>
```

Replace the placeholders with the actual repository URL and folder name.

### Install frontend dependencies

```bash
cd frontend
npm install
```

### Install backend dependencies

Open another terminal:

```bash
cd backend
npm install
```

### Install blockchain dependencies

Open another terminal:

```bash
cd blockchain
npm install
```

---

## Environment Variables

Do not commit `.env` files, API keys, database credentials, wallet private keys, or other secrets to GitHub.

Create local environment files based on the variables used by the application.

### Backend environment

Create:

```text
backend/.env
```

Example configuration:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=your_ai_service_api_key
JWT_SECRET=replace_with_a_long_random_secret
```

These names are illustrative. Use the exact variable names referenced by the backend source code.

### Frontend environment

Create the frontend environment file required by Vite, commonly:

```text
frontend/.env
```

Example:

```env
VITE_API_URL=http://localhost:5000/api
```

The frontend variable name and API path must match the actual application configuration.

### Blockchain environment

Create:

```text
blockchain/.env
```

Example for a future Coral Testnet deployment:

```env
MST_RPC_URL=https://coralrpc.mstblockchain.com/
MST_CHAIN_ID=54635
DEPLOYER_PRIVATE_KEY=your_test_wallet_private_key
```

**Never share the private key in a chat, screenshot, issue, or repository.** Use a dedicated test wallet and only configure a private key locally when you intend to deploy.

The `mst` network alias in the Hardhat configuration points to the configured RPC endpoint and chain ID. The alias name itself does not determine the blockchain network.

---

## Running the Project

Run each component in a separate terminal.

### Start the backend

```bash
cd backend
npm run dev
```

If the backend does not define a `dev` script, use the script specified in its `package.json`.

### Start the frontend

```bash
cd frontend
npm run dev
```

Vite will print the local development URL in the terminal.

### Run blockchain tests

```bash
cd blockchain
npx hardhat test
```

### Compile the smart contract

```bash
cd blockchain
npx hardhat compile
```

---

## Testing

Testing should be performed independently for each component.

### Frontend testing

Verify:

- The frontend starts successfully.
- The main pages load.
- API requests point to the correct backend URL.
- Loading, error, and empty states are handled.
- The application works at common desktop and mobile viewport sizes.

### Backend testing

Verify:

- The backend starts with the required environment variables.
- The database connection is successful.
- API endpoints return expected responses.
- Invalid requests are handled appropriately.
- Secrets and sensitive values are not included in API responses or logs.

### Smart-contract testing

The `CredentialRegistry` contract should be tested for:

- Correct role assignment during deployment.
- Authorized credential issuance.
- Rejection of unauthorized issuance.
- Rejection of duplicate credential IDs.
- Rejection of invalid input.
- Correct verification output.
- Authorized revocation.
- Rejection of unauthorized revocation.
- Rejection of unknown credentials.
- Rejection of repeated revocation.

Local tests do not constitute proof of a live blockchain deployment.

---

## Deployment

The frontend, backend, and blockchain components can be deployed independently.

### Frontend

The React/Vite frontend can be deployed to a static hosting platform that supports Vite builds.

Before deployment:

- Configure the production API URL.
- Confirm that the backend allows requests from the frontend origin.
- Verify that no development-only environment values are used.

### Backend

The Express backend can be deployed to a Node.js hosting platform.

Before deployment:

- Configure production environment variables.
- Configure the production MongoDB connection.
- Set the appropriate CORS origin.
- Ensure secrets are stored in the hosting platform’s environment configuration.
- Verify API endpoints after deployment.

### Blockchain

The smart contract can be deployed to a supported EVM network when a funded test wallet and deployment configuration are available.

The current repository status is local compilation and testing. **No live Coral Testnet deployment is claimed.**

---

## Security Considerations

- Never commit `.env` files.
- Never expose private keys or seed phrases.
- Use a dedicated test wallet for testnet deployment.
- Keep AI-service API keys on the backend.
- Validate and sanitize backend input.
- Apply access control to privileged contract operations.
- Treat a metadata hash as a commitment to data, not as encryption.
- Avoid placing personal or sensitive credential data directly on-chain.
- Test smart contracts locally before any network deployment.
- Do not treat a successful local test as a security audit.

---

## Limitations and Future Scope

SIGNWAY is an evolving prototype. Potential areas for further work include:

- Improving recognition robustness across signing styles and environments.
- Expanding the supported sign vocabulary.
- Evaluating recognition performance with representative datasets.
- Improving handling of continuous signing and sentence-level context.
- Adding user feedback and correction workflows.
- Improving accessibility and multilingual support.
- Completing end-to-end integration testing.
- Deploying and verifying the credential registry on a testnet.
- Adding automated deployment and monitoring.
- Conducting usability testing with sign-language users and accessibility specialists.

Recognition quality, supported gestures, and practical usability should be evaluated before the system is relied upon for critical communication.

---

## Contributing

Contributions, feedback, and suggestions are welcome.

A typical contribution workflow:

1. Fork the repository.
2. Create a feature branch.
3. Make and test your changes.
4. Commit your changes with a descriptive message.
5. Open a pull request explaining the changes.

Please avoid committing secrets, generated build artifacts, or local environment files.

---

## License

Add the license chosen for this repository here.

If the project does not yet have a license file, its reuse and redistribution terms have not been explicitly specified.
