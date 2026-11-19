# 🛡️ TigerGate Security Test Platform

[![TigerGate CNAPP](https://img.shields.io/badge/Security-TigerGate_CNAPP-orange.svg)](#)
[![Compliance](https://img.shields.io/badge/Integration-LowerPlane_Compliance-blue.svg)](#)
[![Vulnerabilities](https://img.shields.io/badge/Total_Findings-123-red.svg)](#-vulnerability-summary)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](#)
[![Flask](https://img.shields.io/badge/Backend-Flask-000000?logo=flask&logoColor=white)](#)
[![Tailwind CSS](https://img.shields.io/badge/Frontend-Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](#)
[![Chart.js](https://img.shields.io/badge/Charts-Chart.js-FF6384?logo=chartdotjs&logoColor=white)](#)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status: Insecure By Design](https://img.shields.io/badge/Status-Insecure_by_Design-critical.svg)](#)

> [!CAUTION]
> ### ⚠️ CRITICAL WARNING: INTENTIONALLY VULNERABLE APPLICATION
> **THIS REPOSITORY IS STRICTLY DESIGNED FOR SECURITY TESTING AND EVALUATION.**
>
> - This repository contains a fully functional B2B SaaS platform embedded with **INTENTIONAL, SEVERE SECURITY VULNERABILITIES**, architectural flaws, and misconfigurations across application code, infrastructure as code (IaC), build scripts, container images, and software composition dependencies.
> - All credentials, API tokens, cloud provider service keys, database passwords, and cryptographic private keys included in this repository are **SYNTHETIC AND FAKE**. They exist solely to benchmark secret-detection algorithms and scanner accuracy.
> - **DO NOT deploy, execute, or host this application in any production, public-facing, or corporate network environment.**

---

## 🎯 Description

The **TigerGate Security Test Platform** is a fully functional B2B SaaS Admin & Analytics Platform developed with realistic business workflows and intentional security vulnerabilities. It serves as a dual-purpose repository:

1. **A Live, Runnable Web Application**: A full-stack administrative platform featuring authentication, interactive analytics dashboards, user role administration, automated reporting, file asset management, and system configuration. The application runtime mirrors enterprise architectures while exposing realistic SAST attack surfaces.
2. **Standardized Scanner Benchmark Suite**: Comprehensive test artifacts across SAST, IaC, Secret Detection, and SCA designed to benchmark and demonstrate the end-to-end detection, correlation, and compliance capabilities of **TigerGate CNAPP** integrated with the **LowerPlane Compliance Platform**.

---

## ✨ Application Features

The live application in `app/` is a modern, modular B2B SaaS management suite providing 6 core functional modules:

- **🔐 Authentication & Session Management**:
  - Standalone login interface with branded styling and responsive design.
  - JWT token-based authentication (`Bearer` scheme) with automatic local storage session persistence.
  - Role-based permissions supporting `admin`, `manager`, `analyst`, and `viewer` tiers.
  - Quick-login credential hints for rapid local testing.

- **📊 Analytics & KPI Dashboard**:
  - Real-time KPI summary cards displaying Total Revenue, Active Users, Monthly Churn Rate, and Managed Files.
  - Interactive **Chart.js** visualizations: Monthly Revenue Trends (Bar chart) and Revenue by Category (Doughnut chart).
  - Live activity audit log stream displaying user actions, system events, and timestamps.
  - Interactive business metric formula calculator with server-side evaluation.

- **👥 User Management (RBAC)**:
  - User directory table with role badges, department tags, and status indicators (`active`, `inactive`, `suspended`).
  - Real-time debounced search by username, email, full name, or department.
  - Add / Edit User modal dialogs with client and server-side validation.
  - User deactivation and deletion controls with confirmation safeguards.

- **📑 Report Generation**:
  - Dynamic report generation suite supporting Financial Summaries, User Activity Audits, Compliance Reports, and Security Logs.
  - Configurable date range selectors and export format options (PDF, CSV, JSON).
  - Historical report ledger with execution status indicators and direct authenticated file downloads.

- **📁 File & Asset Management**:
  - Modern drag-and-drop file upload zone with visual upload progress feedback.
  - Managed files inventory displaying file basenames, sizes, MIME types, and upload timestamps.
  - Authenticated file download endpoints and secure deletion actions.

- **⚙️ Settings & Administration**:
  - Administrative control panel with toggle switches for Maintenance Mode, Public Registration, and Security Email Alerts.
  - Configurable session timeout parameters and maximum file upload thresholds.
  - Live system telemetry diagnostics displaying application version, runtime environment, database engine, and server status.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- `pip` (Python package installer)

### Starting the Platform

```bash
# Clone the repository
git clone https://github.com/lowerplane/tigergate-security-test-repo.git
cd tigergate-security-test-repo

# Option 1: One-click startup script (recommended)
./app/run.sh

# Option 2: Manual execution
cd app
pip install -r requirements.txt
python server.py
```

Once started, open your web browser and navigate to:
```text
http://localhost:5000
```

### Default Credentials

| Username | Password | Assigned Role | Permissions |
| :--- | :--- | :--- | :--- |
| **admin** | `admin123` | `admin` | Full administrative access (All modules, Settings, User CRUD) |
| **analyst** | `analyst123` | `analyst` | Analytics, Reports generation, File views |
| **viewer** | `viewer123` | `viewer` | Read-only access to Dashboard and Reports |

---

## 📸 Application Screenshots

> [!NOTE]
> *Screenshots placeholder — capture and insert UI screenshots after first run:*
> - **Dashboard**: Executive KPI overview and Chart.js telemetry (`docs/screenshots/dashboard.png`)
> - **User Management**: RBAC directory and modal forms (`docs/screenshots/users.png`)
> - **Reports**: Report generation suite and history (`docs/screenshots/reports.png`)

---

## 🏗️ Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                  Browser Client                        │
                    │   • Tailwind CSS (CDN)   • Chart.js (CDN)              │
                    │   • Vanilla JS SPA       • Hash-based Routing          │
                    └───────────────────────────┬────────────────────────────┘
                                                │ REST API / JWT Bearer
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │                 Flask Application                      │
                    │   • server.py (REST API routes & SAST flaw endpoints)  │
                    │   • config.py (App configuration & JWT secrets)        │
                    │   • seed_data.py (Bootstrap data loader)               │
                    └───────────────────────────┬────────────────────────────┘
                                                │ SQLite3
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               SQLite Database (tigergate.db)           │
                    │   • users        • transactions   • reports            │
                    │   • files        • settings       • activity_log       │
                    └────────────────────────────────────────────────────────┘
```

- **Backend**: Python / Flask REST API delivering lightweight routing, JWT session validation, and database operations.
- **Frontend**: Vanilla JavaScript Single Page Application (SPA) with client-side hash routing (`#dashboard`, `#users`, `#reports`, `#files`, `#settings`), responsive Tailwind CSS layout, and inline SVG iconography (no external icon dependencies).
- **Database Engine**: Embedded SQLite (`tigergate.db`) with relational schemas and automatic bootstrapping on first startup.
- **Security Boundary**: Role-Based Access Control (RBAC) enforced at both API route decorators and UI navigation layers.

---

## 📁 Directory Structure

The repository organizes both the functional web application and the dedicated scanner benchmark artifacts:

```text
tigergate-security-test-repo/
├── .gitignore                     # Git configuration (preserves secrets/ for scanner testing)
├── LICENSE                        # MIT License
├── README.md                      # Repository overview and platform guide
├── VULNERABILITY_INVENTORY.md     # Granular itemized inventory of all 123 findings
│
├── app/                           # Fully Functional B2B SaaS Application
│   ├── config.py                  # Application configuration & secrets
│   ├── database.py                # SQLite connection & schema initialization
│   ├── requirements.txt           # Python application dependencies
│   ├── run.sh                     # One-click startup script (executable)
│   ├── seed_data.py               # Database seeder (users, transactions, logs)
│   ├── server.py                  # Main Flask application & REST API routes
│   ├── static/                    # Frontend static assets
│   │   ├── css/
│   │   │   └── custom.css         # Custom animations, transitions & component styling
│   │   └── js/
│   │       ├── app.js             # Core SPA router, state manager & API client
│   │       └── pages/
│   │           ├── dashboard.js   # KPI cards, Chart.js charts & metric calculator
│   │           ├── files.js       # Drag-and-drop file upload & management
│   │           ├── reports.js     # Report generation & history
│   │           ├── settings.js    # System configuration & diagnostics
│   │           └── users.js       # User directory & RBAC management
│   └── templates/
│       ├── app.html               # Main SPA application shell & navigation
│       └── login.html             # Standalone modern authentication screen
│
├── sast/                          # Static Application Security Testing (SAST) Target Artifacts
│   ├── java/
│   │   └── src/main/java/com/tigergate/
│   │       ├── CryptoUtils.java   # Weak crypto, DES, ECB, hardcoded keys
│   │       └── UserController.java# SQLi, XXE, SSRF, weak PRNG
│   ├── javascript/
│   │   ├── auth.js                # JWT 'none' alg, timing attacks, weak auth
│   │   └── server.js              # NoSQL injection, XSS, prototype pollution, CSRF
│   └── python/
│       ├── app.py                 # SQLi, RCE via os.system(), eval(), debug mode
│       └── utils.py               # Insecure pickle, MD5 hashing, path traversal
│
├── iac/                           # Infrastructure as Code (IaC) Misconfigurations
│   ├── docker/
│   │   ├── docker-compose.yml     # Privileged containers, socket mounts, plain secrets
│   │   └── Dockerfile             # Root user, embedded secrets, mutable base image
│   ├── kubernetes/
│   │   ├── deployment.yaml        # Privileged context, hostNetwork, missing limits
│   │   ├── network-policy.yaml    # Overly permissive network traffic policy
│   │   └── pod-security.yaml      # ALL capabilities, hostPID, writable root filesystem
│   └── terraform/
│       ├── iam.tf                 # Wildcard admin role, open assume role, missing MFA
│       ├── main.tf                # Unencrypted S3 backend state, default VPC
│       ├── rds.tf                 # Public RDS instance, no encryption, no backups
│       ├── s3.tf                  # Public S3 bucket, wildcard policy, no SSE
│       └── security_groups.tf     # 0.0.0.0/0 ingress on all ports, open SSH & RDP
│
├── secrets/                       # Secrets & Credential Detection
│   ├── .env                       # GitHub PAT, SendGrid key, Redis/Mongo URIs, Slack webhook
│   ├── .npmrc                     # Hardcoded NPM and GitHub registry tokens
│   ├── config.py                  # AWS Access/Secret keys, Stripe secret key
│   ├── credentials.json           # Application JSON credentials with API tokens & DB secrets
│   ├── database.yml               # Plaintext production & replica DB credentials
│   └── ssh/
│       └── id_rsa                 # Unencrypted PEM-encoded RSA private key
│
└── sca/                           # Software Composition Analysis (SCA)
    ├── go/
    │   └── go.mod                 # Vulnerable Go modules (jwt-go, x/crypto)
    ├── java/
    │   └── pom.xml                # Maven project with Log4Shell, Spring4Shell, Struts2 RCE
    ├── javascript/
    │   └── package.json           # Node project with Lodash, Handlebars, Axios CVEs
    └── python/
        └── requirements.txt       # Python packages with Django, PyYAML, Flask CVEs
```

---

## 🔬 Security Testing & Vulnerability Design

This repository is dual-layered for comprehensive security benchmarking:

1. **Live Application Vulnerabilities (`app/`)**: The running application itself mirrors the vulnerability patterns present in the test artifacts, allowing dynamic testing and real-world SAST analysis on a functional code base:
   - **SQL Injection (CWE-89)**: User search query concatenated directly into SQL (`/api/users?search=`).
   - **Eval Injection (CWE-95)**: Dynamic metric calculation using unescaped Python `eval()` (`/api/analytics/calculate`).
   - **Command Injection (CWE-78)**: Report generation calling system commands via `subprocess`/shell execution (`/api/reports/generate`).
   - **Path Traversal (CWE-22)**: File download endpoint lacking filename sanitation (`/api/files/<filename>/download`).
   - **Unrestricted File Upload (CWE-434)**: File upload without extension or MIME verification (`/api/files/upload`).
   - **Insecure Deserialization (CWE-502)**: Admin backup restore parsing arbitrary `pickle` payloads (`/api/admin/backup/restore`).
   - **Authentication Weaknesses**: Acceptance of JWT `none` algorithm (CWE-327), user enumeration via differential errors (CWE-204), string timing attack in token checks (CWE-208), and weak MD5 hashing (CWE-328).
   - **Information Disclosure (CWE-489)**: Flask debug mode actively enabled.

2. **Dedicated Benchmark Directories (`sast/`, `iac/`, `secrets/`, `sca/`)**: The original scanner test suites remain 100% intact, providing standardized files across multiple programming languages and cloud platforms for static scanner benchmarks.

---

## 📊 Vulnerability Summary

A full scan of the benchmark target files using **TigerGate CNAPP** integrated with **LowerPlane** is expected to detect **123 total findings** across 26 target files:

### Expected Scan Results Summary

| Engine / Category | Target Files | Critical | High | Medium | Low | Total Findings |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 🔍 **SAST** | 6 | 8 | 10 | 7 | 3 | **28** |
| 🏗️ **IaC Security** | 10 | 10 | 12 | 14 | 7 | **43** |
| 🔑 **Secrets Detection** | 6 | 9 | 10 | 2 | 1 | **22** |
| 📦 **SCA Dependencies** | 4 | 10 | 10 | 10 | 0 | **30** |
| **Combined Total** | **26** | **37** | **42** | **33** | **11** | **123** |

### Severity Distribution

```text
Critical : [██████████████████████████████] 37 (30.1%)
High     : [██████████████████████████████████] 42 (34.1%)
Medium   : [██████████████████████████] 33 (26.8%)
Low      : [█████████] 11 (8.9%)
```

> [!NOTE]
> For the comprehensive, line-by-line itemized breakdown with associated CWE numbers and remediation references, see the [Vulnerability Inventory](VULNERABILITY_INVENTORY.md).

---

## 🔗 Integration with LowerPlane & TigerGate

1. **Connect Source Repository**: Connect `tigergate-security-test-repo` to TigerGate CNAPP via GitHub SCM integration.
2. **Execute Full Suite Scan**: Trigger an all-engines scan across SAST, IaC, Secrets, and SCA:
   ```bash
   tigergate scan --repo . --all-engines --format json --output-file scan-results.json
   ```
3. **Audit Compliance Ingestion**: Open the **LowerPlane Compliance Workspace** to verify automated evidence collection against:
   - **SOC 2 CC6.1, CC6.6, CC6.8**: Triggered by hardcoded secrets, open security groups, and missing encryption.
   - **PCI-DSS Requirements 6.5 & 3.4**: Triggered by SQL injection, XSS, and unencrypted database keys.
   - **ISO 27001 A.12.6.1 & A.14.2.8**: Triggered by critical SCA vulnerabilities (Log4Shell, Spring4Shell).
   - **CIS Benchmarks**: Triggered by privileged containers and default VPC usage.

---

## ⚖️ License & Disclaimer

### License
This project is licensed under the [MIT License](LICENSE).

### Disclaimer
This software and configuration suite is provided "as is", without warranty of any kind, express or implied. Under no circumstances shall the authors, maintainers, or copyright holders be liable for any claim, damages, or other liability arising from the use or misuse of this repository. All testing should be conducted strictly in isolated, non-production sandbox environments.
