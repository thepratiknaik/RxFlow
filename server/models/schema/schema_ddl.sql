-- ============================================================
-- PHARMACY SAAS - PostgreSQL DDL Script
-- ============================================================
-- Order: Reference Tables → Core Tables → Dependent Tables
-- ============================================================


-- ------------------------------------------------------------
-- REFERENCE TABLES
-- ------------------------------------------------------------

CREATE TABLE role (
    id          SERIAL          PRIMARY KEY,
    role_name   VARCHAR(50)     NOT NULL UNIQUE,
    description VARCHAR(255)    NOT NULL
);

CREATE TABLE pharmacy_status (
    id          SERIAL          PRIMARY KEY,
    status      VARCHAR(50)     NOT NULL UNIQUE,
    description VARCHAR(255)    NOT NULL
);

CREATE TABLE prescription_status (
    id          SERIAL          PRIMARY KEY,
    status      VARCHAR(50)     NOT NULL UNIQUE,
    description VARCHAR(255)    NOT NULL
);

CREATE TABLE invoice_status (
    id          SERIAL          PRIMARY KEY,
    status      VARCHAR(50)     NOT NULL UNIQUE,
    description VARCHAR(255)    NOT NULL
);


-- ------------------------------------------------------------
-- SEED REFERENCE DATA
-- ------------------------------------------------------------

INSERT INTO role (role_name, description) VALUES
    ('Admin',       'Full access to all pharmacy settings and data'),
    ('Pharmacist',  'Can verify and approve prescriptions'),
    ('Technician',  'Can enter and process prescriptions');

INSERT INTO pharmacy_status (status, description) VALUES
    ('Active',      'Pharmacy is active and operational'),
    ('Suspended',   'Pharmacy account has been suspended');

INSERT INTO prescription_status (status, description) VALUES
    ('New',         'Prescription has been received but not yet processed'),
    ('In Process',  'Prescription is currently being prepared'),
    ('Ready',       'Prescription is ready for patient pickup'),
    ('Picked Up',   'Prescription has been collected by the patient'),
    ('Cancelled',   'Prescription has been cancelled and is no longer active');

INSERT INTO invoice_status (status, description) VALUES
    ('Pending',     'Invoice has been issued but not yet paid'),
    ('Paid',        'Invoice has been fully paid'),
    ('Overdue',     'Invoice payment is past due date');


-- ------------------------------------------------------------
-- CORE TABLES
-- ------------------------------------------------------------

CREATE TABLE pharmacy (
    pharmacy_id         SERIAL          PRIMARY KEY,
    name                VARCHAR(255)    NOT NULL,
    license_number      VARCHAR(100)    NOT NULL UNIQUE,
    subscription_tier   VARCHAR(50)     NOT NULL,
    status_id           INT             NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_pharmacy_status
        FOREIGN KEY (status_id) REFERENCES pharmacy_status(id)
);

CREATE TABLE "user" (
    user_id         SERIAL          PRIMARY KEY,
    pharmacy_id     INT,
    role_id         INT             NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    fullname        VARCHAR(255),
    password_hash   VARCHAR(512)    NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_user_pharmacy
        FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(pharmacy_id),
    CONSTRAINT fk_user_role
        FOREIGN KEY (role_id) REFERENCES role(id)
);

CREATE TABLE patient (
    patient_id      SERIAL          PRIMARY KEY,
    pharmacy_id     INT             NOT NULL,
    first_name      VARCHAR(255)    NOT NULL,
    last_name       VARCHAR(255)    NOT NULL,
    middle_name     VARCHAR(255),
    dob             DATE            NOT NULL,
    gender          VARCHAR(50),
    email           VARCHAR(255),
    phone_primary   VARCHAR(50),
    phone_secondary VARCHAR(50),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(50),
    zip_code        VARCHAR(20),
    mrn             VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_patient_pharmacy
        FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(pharmacy_id)
);

CREATE TABLE patient_allergy (
    allergy_id      SERIAL          PRIMARY KEY,
    patient_id      INT             NOT NULL,
    allergen_name   VARCHAR(255)    NOT NULL,
    severity        VARCHAR(50)     NOT NULL
                        CHECK (severity IN ('Mild', 'Moderate', 'Severe')),
    reaction_notes  TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_allergy_patient
        FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
            ON DELETE CASCADE
);

CREATE TABLE insurance (
    insurance_id    SERIAL          PRIMARY KEY,
    patient_id      INT             NOT NULL,
    provider_name   VARCHAR(255)    NOT NULL,
    member_id       VARCHAR(100)    NOT NULL,
    bin_number      VARCHAR(50)     NOT NULL,
    pcn_number      VARCHAR(50),

    CONSTRAINT fk_insurance_patient
        FOREIGN KEY (patient_id) REFERENCES patient(patient_id)
);

CREATE TABLE prescriber (
    prescriber_id   SERIAL          PRIMARY KEY,
    npi_number      VARCHAR(20)     NOT NULL UNIQUE,
    first_name      VARCHAR(255)    NOT NULL,
    last_name       VARCHAR(255)    NOT NULL,
    contact_details VARCHAR(255),
    email           VARCHAR(255),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE TABLE drug (
    drug_id         SERIAL          PRIMARY KEY,
    ndc_code        VARCHAR(20)     NOT NULL UNIQUE,
    brand_name      VARCHAR(255)    NOT NULL,
    generic_name    VARCHAR(255)    NOT NULL,
    dosage_form     VARCHAR(255),
    route           VARCHAR(255),
    is_controlled   BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_lot (
    lot_id              SERIAL          PRIMARY KEY,
    pharmacy_id         INT             NOT NULL,
    drug_id             INT             NOT NULL,
    lot_number          VARCHAR(255)    NOT NULL,
    expiration_date     DATE            NOT NULL,
    minimum_level       INT             NOT NULL DEFAULT 0
                            CHECK (minimum_level >= 0),
    quantity_on_hand    INT             NOT NULL DEFAULT 0
                            CHECK (quantity_on_hand >= 0),

    CONSTRAINT fk_lot_pharmacy
        FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(pharmacy_id),
    CONSTRAINT fk_lot_drug
        FOREIGN KEY (drug_id) REFERENCES drug(drug_id)
);

CREATE TABLE prescription (
    prescription_id     SERIAL          PRIMARY KEY,
    pharmacy_id         INT             NOT NULL,
    patient_id          INT             NOT NULL,
    prescriber_id       INT             NOT NULL,
    drug_id             INT             NOT NULL,
    insurance_id        INT,
    status_id           INT             NOT NULL,
    quantity            INT             NOT NULL CHECK (quantity > 0),
    entered_by          INT             NOT NULL,
    verified_by         INT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_rx_pharmacy
        FOREIGN KEY (pharmacy_id)   REFERENCES pharmacy(pharmacy_id),
    CONSTRAINT fk_rx_patient
        FOREIGN KEY (patient_id)    REFERENCES patient(patient_id),
    CONSTRAINT fk_rx_prescriber
        FOREIGN KEY (prescriber_id) REFERENCES prescriber(prescriber_id),
    CONSTRAINT fk_rx_drug
        FOREIGN KEY (drug_id)       REFERENCES drug(drug_id),
    CONSTRAINT fk_rx_insurance
        FOREIGN KEY (insurance_id)  REFERENCES insurance(insurance_id),
    CONSTRAINT fk_rx_status
        FOREIGN KEY (status_id)     REFERENCES prescription_status(id),
    CONSTRAINT fk_rx_entered_by
        FOREIGN KEY (entered_by)    REFERENCES "user"(user_id),
    CONSTRAINT fk_rx_verified_by
        FOREIGN KEY (verified_by)   REFERENCES "user"(user_id)
);

CREATE TABLE invoice (
    invoice_id          SERIAL              PRIMARY KEY,
    pharmacy_id         INT                 NOT NULL,
    prescription_id     INT                 NOT NULL,
    status_id           INT                 NOT NULL,
    total_amount        NUMERIC(10, 2)      NOT NULL CHECK (total_amount >= 0),
    discount_applied    NUMERIC(10, 2)      NOT NULL DEFAULT 0.00
                            CHECK (discount_applied >= 0),
    created_at          TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_invoice_pharmacy
        FOREIGN KEY (pharmacy_id)     REFERENCES pharmacy(pharmacy_id),
    CONSTRAINT fk_invoice_prescription
        FOREIGN KEY (prescription_id) REFERENCES prescription(prescription_id),
    CONSTRAINT fk_invoice_status
        FOREIGN KEY (status_id)       REFERENCES invoice_status(id)
);

CREATE TABLE payment (
    payment_id      SERIAL              PRIMARY KEY,
    invoice_id      INT                 NOT NULL,
    amount_paid     NUMERIC(10, 2)      NOT NULL CHECK (amount_paid > 0),
    transaction_id  VARCHAR(255)        NOT NULL UNIQUE,
    payment_date    DATE                NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT fk_payment_invoice
        FOREIGN KEY (invoice_id) REFERENCES invoice(invoice_id)
);

CREATE TABLE audit_log (
    log_id          SERIAL          PRIMARY KEY,
    pharmacy_id     INT             NOT NULL,
    user_id         INT             NOT NULL,
    action_type     VARCHAR(50)     NOT NULL
                        CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE')),
    audit_type      VARCHAR(50)     NOT NULL DEFAULT 'general'
                        CHECK (audit_type IN ('general', 'patient', 'drug_pull')),
    entity_table    VARCHAR(100)    NOT NULL,
    entity_id       INT             NOT NULL,
    changes         JSONB,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_audit_pharmacy
        FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(pharmacy_id),
    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id) REFERENCES "user"(user_id)
);

CREATE TABLE prescription_review_tokens (
    id              UUID            PRIMARY KEY,
    prescription_id INT             NOT NULL,
    token_hash      VARCHAR(255)    NOT NULL UNIQUE,
    recipient_email VARCHAR(255)    NOT NULL,
    recipient_name  VARCHAR(255),
    review_url      TEXT            NOT NULL,
    sent_at         TIMESTAMP,
    expires_at      TIMESTAMP       NOT NULL,
    used_at         TIMESTAMP,
    decision        VARCHAR(20)
                        CHECK (decision IN ('approved', 'rejected')),
    createdat       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updatedat       TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_review_token_prescription
        FOREIGN KEY (prescription_id) REFERENCES prescription(prescription_id)
            ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

-- Pharmacy lookups
CREATE INDEX idx_pharmacy_status         ON pharmacy(status_id);

-- User lookups
CREATE INDEX idx_user_pharmacy           ON "user"(pharmacy_id);
CREATE INDEX idx_user_role               ON "user"(role_id);
CREATE INDEX idx_user_email              ON "user"(email);

-- Patient lookups
CREATE INDEX idx_patient_pharmacy        ON patient(pharmacy_id);
CREATE INDEX idx_patient_name            ON patient(last_name, first_name);

-- Patient allergy lookups
CREATE INDEX idx_allergy_patient         ON patient_allergy(patient_id);

-- Insurance lookups
CREATE INDEX idx_insurance_patient       ON insurance(patient_id);

-- Inventory lookups
CREATE INDEX idx_lot_pharmacy            ON inventory_lot(pharmacy_id);
CREATE INDEX idx_lot_drug                ON inventory_lot(drug_id);
CREATE INDEX idx_lot_expiration          ON inventory_lot(expiration_date);

-- Prescription lookups
CREATE INDEX idx_rx_pharmacy             ON prescription(pharmacy_id);
CREATE INDEX idx_rx_patient              ON prescription(patient_id);
CREATE INDEX idx_rx_drug                 ON prescription(drug_id);
CREATE INDEX idx_rx_prescriber           ON prescription(prescriber_id);
CREATE INDEX idx_rx_status               ON prescription(status_id);
CREATE INDEX idx_rx_created              ON prescription(created_at);

-- Invoice lookups
CREATE INDEX idx_invoice_pharmacy        ON invoice(pharmacy_id);
CREATE INDEX idx_invoice_prescription    ON invoice(prescription_id);
CREATE INDEX idx_invoice_status          ON invoice(status_id);

-- Payment lookups
CREATE INDEX idx_payment_invoice         ON payment(invoice_id);

-- Audit log lookups
CREATE INDEX idx_audit_pharmacy          ON audit_log(pharmacy_id);
CREATE INDEX idx_audit_user              ON audit_log(user_id);
CREATE INDEX idx_audit_entity            ON audit_log(entity_table, entity_id);
CREATE INDEX idx_audit_created           ON audit_log(created_at);


-- ------------------------------------------------------------
-- AUTO-UPDATE updated_at TRIGGER
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pharmacy_updated_at
    BEFORE UPDATE ON pharmacy
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_updated_at
    BEFORE UPDATE ON "user"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_patient_updated_at
    BEFORE UPDATE ON patient
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
