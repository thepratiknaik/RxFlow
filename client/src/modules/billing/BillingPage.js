import React from "react";
import AppShell from "../../components/AppShell";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import api from "../../services/api.js";
import "./BillingPage.css";

const DEFAULT_LINE_ITEMS = [
  {
    itemType: "subscription",
    description: "Monthly Pharmacy Subscription",
    quantity: "1",
    unitPrice: "199.00",
  },
];

const BillingPage = () => {
  const [pharmacyId, setPharmacyId] = React.useState("");
  const [pharmacyName, setPharmacyName] = React.useState("");
  const [periodStart, setPeriodStart] = React.useState("");
  const [periodEnd, setPeriodEnd] = React.useState("");
  const [taxRatePercent, setTaxRatePercent] = React.useState("0");
  const [items, setItems] = React.useState(DEFAULT_LINE_ITEMS);
  const [notes, setNotes] = React.useState("");

  const [invoices, setInvoices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const fetchInvoices = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.listSubscriptionInvoices({ page: 1, limit: 100 });
      setInvoices(response?.data || []);
    } catch (err) {
      setError(err.message || "Failed to load invoices.");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleItemChange = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        itemType: "usage",
        description: "",
        quantity: "1",
        unitPrice: "0.00",
      },
    ]);
  };

  const removeItem = (index) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const resetForm = () => {
    setPharmacyId("");
    setPharmacyName("");
    setPeriodStart("");
    setPeriodEnd("");
    setTaxRatePercent("0");
    setItems(DEFAULT_LINE_ITEMS);
    setNotes("");
  };

  const handleGenerateInvoice = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        pharmacyId: pharmacyId.trim(),
        pharmacyName: pharmacyName.trim() || null,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        taxRatePercent: Number(taxRatePercent || 0),
        notes: notes.trim() || null,
        items: items.map((item) => ({
          itemType: item.itemType,
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      const response = await api.generateSubscriptionInvoice(payload);
      setSuccess(response?.message || "Subscription invoice generated.");
      resetForm();
      await fetchInvoices();
    } catch (err) {
      setError(err.message || "Failed to generate invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Billing">
      <div className="billing-page">
        <Card>
          <div className="billing-header">
            <div>
              <h3>Generate Subscription Invoice</h3>
              <p>
                Generate invoices for subscription charges and related billing
                items for pharmacies.
              </p>
            </div>
          </div>

          {error ? <div className="billing-message error">{error}</div> : null}
          {success ? <div className="billing-message success">{success}</div> : null}

          <form className="billing-form" onSubmit={handleGenerateInvoice}>
            <div className="billing-form-grid">
              <label>
                Pharmacy ID
                <input
                  value={pharmacyId}
                  onChange={(event) => setPharmacyId(event.target.value)}
                  placeholder="PHARM-001"
                  required
                />
              </label>
              <label>
                Pharmacy Name
                <input
                  value={pharmacyName}
                  onChange={(event) => setPharmacyName(event.target.value)}
                  placeholder="Downtown Pharmacy"
                />
              </label>
              <label>
                Billing Period Start
                <input
                  type="date"
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                  required
                />
              </label>
              <label>
                Billing Period End
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(event) => setPeriodEnd(event.target.value)}
                  required
                />
              </label>
              <label>
                Tax Rate (%)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={taxRatePercent}
                  onChange={(event) => setTaxRatePercent(event.target.value)}
                />
              </label>
              <label className="billing-form-span-2">
                Notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional invoice notes"
                  rows={2}
                />
              </label>
            </div>

            <div className="billing-items-header">
              <h4>Billing Items</h4>
              <button type="button" onClick={addItem}>
                Add Item
              </button>
            </div>

            <div className="billing-items">
              {items.map((item, index) => (
                <div key={`${index}-${item.itemType}`} className="billing-item-row">
                  <select
                    value={item.itemType}
                    onChange={(event) =>
                      handleItemChange(index, "itemType", event.target.value)
                    }
                  >
                    <option value="subscription">Subscription</option>
                    <option value="usage">Usage</option>
                    <option value="addon">Addon</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                  <input
                    value={item.description}
                    onChange={(event) =>
                      handleItemChange(index, "description", event.target.value)
                    }
                    placeholder="Description"
                    required
                  />
                  <input
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={item.quantity}
                    onChange={(event) =>
                      handleItemChange(index, "quantity", event.target.value)
                    }
                    placeholder="Qty"
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) =>
                      handleItemChange(index, "unitPrice", event.target.value)
                    }
                    placeholder="Unit Price"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="billing-actions">
              <button type="submit" disabled={submitting}>
                {submitting ? "Generating..." : "Generate Invoice"}
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <h3>Recent Subscription Invoices</h3>
          {loading ? (
            <div className="billing-message">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              description="Generate your first subscription invoice using the form."
            />
          ) : (
            <div className="billing-invoice-list">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="billing-invoice-item">
                  <strong>{invoice.invoiceNumber}</strong>
                  <span>
                    {invoice.pharmacyName || invoice.pharmacyId} |{" "}
                    {invoice.billingPeriodStart} to {invoice.billingPeriodEnd}
                  </span>
                  <span>
                    Total: {invoice.currency} {Number(invoice.totalAmount || 0).toFixed(2)}
                  </span>
                  <span>
                    Items: {Array.isArray(invoice.items) ? invoice.items.length : 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
};

export default BillingPage;
