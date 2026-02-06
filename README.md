# RxFlow 💊

> **Pharmacy Workflow & Inventory System**

[![Status](https://img.shields.io/badge/status-MVP%20Development-orange)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

**RxFlow** is a B2B SaaS web application designed to modernize operations for independent pharmacies. It streamlines the prescription lifecycle—from intake to pickup—and automates inventory tracking to prevent stockouts and waste.

---

## 📑 Table of Contents
- [Business Context](#-business-context)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [External Integrations](#-external-integrations)
- [Database Schema](#-database-schema)
- [Roadmap](#-roadmap)

---

## 💼 Business Context

### The Problem
Independent pharmacies manage many operational tasks simultaneously: maintaining manual records, organizing intake queues, and preventing inventory stockouts. Manual or fragmented processes cause delays, missed refills, and compliance risks.

### The Solution
RxFlow provides a centralized web platform that:
1.  **Digitizes Workflow:** Moves prescriptions through a clear queue (New $\rightarrow$ In Process $\rightarrow$ Ready $\rightarrow$ Picked Up).
2.  **Automates Inventory:** Tracks specific lot numbers and expiration dates to reduce waste.
3.  **Ensures Accountability:** strict audit trails for every dispensing event.

### Target Audience
* **Customer:** Independent & Community Pharmacies (SaaS Subscription Model).
* **Users:** Pharmacy Technicians (Data Entry), Pharmacists (Verification), and Managers (Reporting).

---

## 🚀 Key Features

### 🩺 Core Workflow
* **Digital Intake:** Create new prescriptions and assign them to the "New" queue.
* **Status Tracking:** Visual Kanban-style or list view for workflow management.
* **Dispense Logs:** Record exact quantity, timestamp, and staff member for every fill.
* **Pickup/POS:** Simple checkout flow to mark items "Picked Up" and generate a receipt.

### 📦 Inventory Management
* **Lot & Expiry Tracking:** Track specific bottles (lots) to ensure expired drugs are never dispensed.
* **Stock Alerts:** Auto-generated reorder lists when "On-Hand" quantity dips below thresholds.

### 👥 User Management
* **Role-Based Access Control (RBAC):**
    * *Technician:* Entry, filling, inventory updates.
    * *Pharmacist:* Verification, overrides, clinical review.
    * *Admin:* Reports and configuration.

---

## 🛠 Tech Stack

RxFlow is built as a standard 3-tier web application:

* **Frontend:** React.js (with TypeScript) & Tailwind CSS
* **Backend:** Python FastAPI
* **Database:** PostgreSQL
* **DevOps:** Docker & Docker Compose

---

## 🏗 System Architecture

1.  **Presentation Layer (GUI):** A responsive web interface for staff to manage queues and profiles.
2.  **Application Layer (API):** RESTful API handling business logic, validation, and workflow state changes.
3.  **Data Layer (Relational DB):** Persistent storage ensuring data integrity and audit logging.

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

## 🗄 Database Schema (Core Tables)

* `Users`: Authentication and Role management.
* `Patients` & `Prescribers`: Core directory entities.
* `Drugs`: Catalog linked to NDCs (from openFDA).
* `Prescriptions`: The central transaction table linking Patients, Prescribers, and Drugs.
* `DispenseEvents`: Log of physical filling actions.
* `InventoryLots`: Tracking specific stock batches and expiry.
* `AuditLog`: Security and compliance tracking.

---

## 🗺 Roadmap

- [ ] **Phase 1: Requirements & Design** (ERD, Wireframes, API Contract)
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
