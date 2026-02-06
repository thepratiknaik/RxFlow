# RxFlow 💊

> **Pharmacy Workflow & Inventory Management System**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Status](https://img.shields.io/badge/status-MVP%20Development-orange)]()

**RxFlow** is a B2B SaaS web application designed to modernize operations for independent pharmacies. It streamlines the prescription lifecycle—from intake to pickup—and automates inventory tracking to prevent stockouts and waste.

---

## 📑 Table of Contents
- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [External Integrations](#external-integrations)
- [Getting Started](#getting-started)
- [Database Schema](#database-schema)
- [Roadmap](#roadmap)
- [Disclaimer](#disclaimer)

---

## 🧐 About the Project

### The Problem
Independent pharmacies often struggle with fragmented processes: maintaining manual records, losing track of inventory expiry dates, and lacking visibility into prescription fill status. This leads to delays, missed refills, and operational inefficiency.

### The Solution
RxFlow provides a single, consistent web interface to manage:
* **Patient & Prescriber Records**
* **Prescription Work Queues** (New $\rightarrow$ In Process $\rightarrow$ Ready $\rightarrow$ Picked Up)
* **Inventory Control** (Lot numbers, expiration dates, low-stock alerts)
* **Auditability** (Strict logging of who dispensed what and when)

---

## 🚀 Key Features

### 🩺 Core Workflow
* **Digital Intake:** Create new prescriptions and assign them to the "New" queue.
* **Status Tracking:** Visual kanban-style or list view moving items from *In Process* to *Ready*.
* **Dispense Logs:** Record exact quantity, timestamp, and staff member for every fill.
* **Pickup/POS:** Simple checkout flow to mark items "Picked Up" and generate a receipt.

### 📦 Inventory Management
* **Lot & Expiry Tracking:** Track specific bottles (lots) to ensure expired drugs are never dispensed.
* **Stock Alerts:** Auto-generated reorder lists when "On-Hand" quantity dips below thresholds.
* **Audit Trails:** Complete history of inventory adjustments.

### 👥 User Management
* **Role-Based Access:** * *Technician:* Entry, filling, inventory updates.
    * *Pharmacist:* Verification, overrides, clinical review.
    * *Admin:* Reports and configuration.

---

## 🏗 System Architecture

RxFlow follows a standard **3-Tier Web Application** architecture:

1.  **Presentation Layer (Frontend):** Web GUI for staff usage (Dashboard, Queues, Profiles).
2.  **Application Layer (API):** Handles business logic, status transitions, and validation.
3.  **Data Layer (DB):** Relational database ensuring data integrity and audit logging.

### Tech Stack (Example)
* **Frontend:** [e.g., React.js / Vue.js / Angular]
* **Backend:** [e.g., Node.js / Python / Java]
* **Database:** [e.g., PostgreSQL / MySQL]

---

## 🔌 External Integrations

RxFlow integrates with real-world and simulated healthcare standards:

### 1. openFDA Drug Data
* **Purpose:** Fetches official drug attributes (Brand/Generic name, Packaging).
* **Implementation:** Queries the openFDA NDC endpoint to populate the local Drug Catalog.

### 2. HAPI FHIR (R4) Simulation
* **Purpose:** Simulates the arrival of electronic prescriptions (eRx).
* **Implementation:** Connects to the public HAPI FHIR Test Server to pull `MedicationRequest` resources into the RxFlow "eRx Inbox."

---

## 💻 Getting Started

### Prerequisites
* Node.js / Python (depending on backend choice)
* SQL Database instance
* Git

### Installation

1.  **Clone the repo**
    ```sh
    git clone [https://github.com/yourusername/rxflow.git](https://github.com/yourusername/rxflow.git)
    ```
2.  **Install Backend Dependencies**
    ```sh
    cd server
    npm install
    ```
3.  **Install Frontend Dependencies**
    ```sh
    cd client
    npm install
    ```
4.  **Configure Environment**
    * Create a `.env` file based on `.env.example`.
    * Add your Database credentials and API keys.

5.  **Run the App**
    ```sh
    # Start Backend
    npm run start:server
    # Start Client
    npm start
    ```

---

## 🗄 Database Schema (Core Tables)

* `Users`: Auth and Role management.
* `Patients` & `Prescribers`: Core directory entities.
* `Drugs`: Catalog linked to NDCs.
* `Prescriptions`: The central transaction table linking Patients, Prescribers, and Drugs.
* `DispenseEvents`: Log of physical filling actions.
* `InventoryLots`: Tracking specific stock batches and expiry.
* `AuditLog`: Security and compliance tracking.

---

## 🗺 Roadmap

- [x] **Phase 1: Requirements & Design** (ERD, Wireframes)
- [ ] **Phase 2: Core Build** (Auth, CRUD, Basic Queue)
- [ ] **Phase 3: Inventory Logic** (Lot tracking, Dispensing logic)
- [ ] **Phase 4: Integrations** (openFDA, FHIR)
- [ ] **Phase 5: Reporting & Polish**

---

## ⚠️ Disclaimer

**Educational Use Only.** RxFlow is a reference implementation of a pharmacy management system.
* It is **NOT** connected to real insurance switches.
* It is **NOT** certified for EPCS (Controlled Substances).
* It uses **Synthetic Data** and public test servers. Do not use real Protected Health Information (PHI).

---

Distributed under the MIT License. See `LICENSE` for more information.
