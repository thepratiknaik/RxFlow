import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import SubscriptionInvoice from "../models/SubscriptionInvoice.js";
import SubscriptionInvoiceItem from "../models/SubscriptionInvoiceItem.js";
import {
  buildActorContext,
  writeAuditLog,
} from "../services/auditLogService.js";

const toLimit = (value, fallback = 25, max = 100) =>
  Math.min(Math.max(Number(value) || fallback, 1), max);

const toMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Number(amount.toFixed(2));
};

const toDateOnly = (value) => String(value || "").slice(0, 10);

const generateInvoiceNumber = async () => {
  const today = new Date();
  const yyyymm = `${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const prefix = `INV-${yyyymm}`;
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1),
  );

  const count = await SubscriptionInvoice.count({
    where: {
      createdat: {
        [Op.gte]: start,
        [Op.lt]: end,
      },
    },
  });

  return `${prefix}-${String(count + 1).padStart(5, "0")}`;
};

const serializeInvoice = (invoice) => {
  const plain = invoice.toJSON ? invoice.toJSON() : invoice;
  const items = Array.isArray(plain.items) ? plain.items : [];
  return {
    ...plain,
    subtotalAmount: Number(plain.subtotalAmount || 0),
    taxAmount: Number(plain.taxAmount || 0),
    totalAmount: Number(plain.totalAmount || 0),
    items: items.map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      lineTotal: Number(item.lineTotal || 0),
    })),
  };
};

export const generateSubscriptionInvoice = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      pharmacyId,
      pharmacyName,
      billingPeriodStart,
      billingPeriodEnd,
      currency = "USD",
      taxRatePercent = 0,
      items = [],
      notes,
    } = req.body || {};

    if (!pharmacyId || !billingPeriodStart || !billingPeriodEnd) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message:
          "pharmacyId, billingPeriodStart, and billingPeriodEnd are required.",
      });
    }

    const normalizedItems = Array.isArray(items) ? items : [];
    if (!normalizedItems.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "At least one billing item is required.",
      });
    }

    const invoiceNumber = await generateInvoiceNumber();

    const calculatedItems = normalizedItems.map((item, index) => {
      const quantity = Number(item?.quantity ?? 1);
      const unitPrice = Number(item?.unitPrice ?? 0);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Item ${index + 1} has invalid quantity.`);
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Item ${index + 1} has invalid unitPrice.`);
      }

      const lineTotal = toMoney(quantity * unitPrice);
      return {
        itemType: String(item?.itemType || "subscription"),
        description: String(item?.description || "").trim() || "Billing item",
        quantity,
        unitPrice,
        lineTotal,
        metadata:
          item?.metadata && typeof item.metadata === "object"
            ? item.metadata
            : null,
      };
    });

    const subtotalAmount = toMoney(
      calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0),
    );
    const taxAmount = toMoney(subtotalAmount * (Number(taxRatePercent) / 100));
    const totalAmount = toMoney(subtotalAmount + taxAmount);

    const invoice = await SubscriptionInvoice.create(
      {
        invoiceNumber,
        pharmacyId: String(pharmacyId).trim(),
        pharmacyName: pharmacyName ? String(pharmacyName).trim() : null,
        billingPeriodStart: toDateOnly(billingPeriodStart),
        billingPeriodEnd: toDateOnly(billingPeriodEnd),
        currency: String(currency || "USD").trim().toUpperCase(),
        subtotalAmount,
        taxAmount,
        totalAmount,
        status: "issued",
        notes: notes ? String(notes).trim() : null,
        generatedByUserId: req.user?.id || null,
      },
      { transaction },
    );

    await SubscriptionInvoiceItem.bulkCreate(
      calculatedItems.map((item) => ({
        ...item,
        invoiceId: invoice.id,
      })),
      { transaction },
    );

    const withItems = await SubscriptionInvoice.findByPk(invoice.id, {
      include: [
        {
          model: SubscriptionInvoiceItem,
          as: "items",
          required: false,
        },
      ],
      transaction,
    });

    await transaction.commit();

    const serialized = serializeInvoice(withItems);

    await writeAuditLog({
      entityType: "subscription_invoice",
      entityId: invoice.id,
      action: "generated",
      summary: `Generated subscription invoice ${invoice.invoiceNumber} for pharmacy ${invoice.pharmacyId}.`,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        pharmacyId: invoice.pharmacyId,
        totalAmount: serialized.totalAmount,
        itemCount: serialized.items.length,
      },
      ...buildActorContext(req),
    });

    return res.status(201).json({
      success: true,
      message: "Subscription invoice generated successfully.",
      data: serialized,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate subscription invoice.",
    });
  }
};

export const listSubscriptionInvoices = async (req, res) => {
  try {
    const limit = toLimit(req.query?.limit, 25, 100);
    const page = Math.max(Number(req.query?.page) || 1, 1);
    const pharmacyId = req.query?.pharmacyId
      ? String(req.query.pharmacyId).trim()
      : "";

    const where = {};
    if (pharmacyId) {
      where.pharmacyId = pharmacyId;
    }

    const { rows, count } = await SubscriptionInvoice.findAndCountAll({
      where,
      include: [
        {
          model: SubscriptionInvoiceItem,
          as: "items",
          required: false,
        },
      ],
      order: [["createdat", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    return res.status(200).json({
      success: true,
      data: rows.map(serializeInvoice),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(Math.ceil(count / limit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list subscription invoices.",
    });
  }
};

export const getSubscriptionInvoice = async (req, res) => {
  try {
    const invoice = await SubscriptionInvoice.findByPk(req.params.id, {
      include: [
        {
          model: SubscriptionInvoiceItem,
          as: "items",
          required: false,
        },
      ],
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Subscription invoice not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeInvoice(invoice),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get subscription invoice.",
    });
  }
};
