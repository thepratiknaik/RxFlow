import Pharmacy from "../models/Pharmacy.js";
import User from "../models/User.js";
import Invoice from "../models/Invoice.js";
import stripe, {
  SUBSCRIPTION_PLANS,
  getOrCreateStripeCustomer,
} from "../services/stripeService.js";

const getPharmacyForUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user?.pharmacyId) return null;
  return Pharmacy.findByPk(user.pharmacyId);
};

const upsertInvoice = async (inv, pharmacyId) => {
  const fields = {
    pharmacyId,
    stripeInvoiceId: inv.id,
    invoiceNumber: inv.number || null,
    status: inv.status,
    amountDue: inv.amount_due,
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    periodStart: inv.period_start ? new Date(inv.period_start * 1000) : null,
    periodEnd: inv.period_end ? new Date(inv.period_end * 1000) : null,
    hostedInvoiceUrl: inv.hosted_invoice_url || null,
    invoicePdf: inv.invoice_pdf || null,
    stripeCreatedAt: inv.created ? new Date(inv.created * 1000) : null,
  };
  const existing = await Invoice.findOne({ where: { stripeInvoiceId: inv.id } });
  if (existing) {
    await existing.update(fields);
  } else {
    await Invoice.create(fields);
  }
};

// Fetch the customer's subscriptions from Stripe and sync the pharmacy record.
// Returns the most relevant Stripe subscription object (or null).
const syncSubscriptionFromStripe = async (pharmacy) => {
  if (!pharmacy.stripeCustomerId) return null;

  // Prefer the ID already stored
  if (pharmacy.stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(pharmacy.stripeSubscriptionId);
      if (!["canceled", "incomplete_expired"].includes(sub.status)) {
        return sub;
      }
    } catch {
      // May have been deleted from Stripe side
    }
  }

  // List all subscriptions for this customer and pick the best one
  const list = await stripe.subscriptions.list({
    customer: pharmacy.stripeCustomerId,
    limit: 10,
  });

  const active = list.data.find((s) =>
    ["active", "trialing", "past_due"].includes(s.status),
  );
  const latest = active || list.data[0] || null;
  if (!latest) return null;

  // Sync the DB record so webhooks aren't required
  const planId = latest.metadata?.planId;
  const needsUpdate =
    pharmacy.stripeSubscriptionId !== latest.id ||
    pharmacy.subscriptionStatus !== latest.status ||
    (planId && SUBSCRIPTION_PLANS[planId] && pharmacy.subscriptionTier !== planId);

  if (needsUpdate) {
    pharmacy.stripeSubscriptionId = latest.id;
    pharmacy.subscriptionStatus = latest.status;
    if (planId && SUBSCRIPTION_PLANS[planId]) pharmacy.subscriptionTier = planId;
    await pharmacy.save();
  }

  return latest;
};

// ─────────────────────────────────────────────────────────────────────────────

export const getPlans = (req, res) => {
  return res.status(200).json({
    success: true,
    data: Object.values(SUBSCRIPTION_PLANS),
  });
};

export const getSubscription = async (req, res) => {
  try {
    const pharmacy = await getPharmacyForUser(req.user.id);
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: "Pharmacy not found." });
    }

    let stripeSub = null;
    try {
      stripeSub = await syncSubscriptionFromStripe(pharmacy);
    } catch (err) {
      console.error("Stripe sync error:", err.message);
    }

    return res.status(200).json({
      success: true,
      data: {
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
        subscriptionTier: pharmacy.subscriptionTier,
        // Always prefer live Stripe status; fall back to DB value
        subscriptionStatus: stripeSub?.status || pharmacy.subscriptionStatus || "inactive",
        stripeCustomerId: pharmacy.stripeCustomerId || null,
        stripeSubscriptionId: pharmacy.stripeSubscriptionId || null,
        // Pull validity directly from Stripe
        currentPeriodEnd: stripeSub?.current_period_end
          ? new Date(stripeSub.current_period_end * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: stripeSub?.cancel_at_period_end ?? false,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to load subscription." });
  }
};

export const createCheckoutSession = async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body || {};

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, message: "Invalid plan selected." });
    }

    const pharmacy = await getPharmacyForUser(req.user.id);
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: "Pharmacy not found." });
    }

    // Block re-purchase of the same active plan
    const alreadyActive =
      pharmacy.subscriptionTier === planId &&
      (pharmacy.subscriptionStatus === "active" || pharmacy.subscriptionStatus === "trialing");
    if (alreadyActive) {
      return res.status(400).json({
        success: false,
        message: "You already have an active subscription to this plan.",
      });
    }

    const customerId = await getOrCreateStripeCustomer(pharmacy);

    const baseUrl = process.env.CLIENT_APP_BASE_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: {
              name: `RxFlow ${plan.name}`,
              description: plan.description,
            },
            unit_amount: plan.priceMonthly,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          pharmacyId: String(pharmacy.id),
          planId: plan.id,
        },
      },
      success_url: successUrl || `${baseUrl}/profile?success=true`,
      cancel_url: cancelUrl || `${baseUrl}/profile`,
    });

    return res.status(200).json({ success: true, data: { url: session.url } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to create checkout session." });
  }
};

export const createPortalSession = async (req, res) => {
  try {
    const pharmacy = await getPharmacyForUser(req.user.id);
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: "Pharmacy not found." });
    }

    if (!pharmacy.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: "No active subscription found. Please subscribe to a plan first.",
      });
    }

    const baseUrl = process.env.CLIENT_APP_BASE_URL || "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: pharmacy.stripeCustomerId,
      return_url: `${baseUrl}/profile`,
    });

    return res.status(200).json({ success: true, data: { url: session.url } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to open billing portal." });
  }
};

export const listInvoices = async (req, res) => {
  try {
    const pharmacy = await getPharmacyForUser(req.user.id);
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: "Pharmacy not found." });
    }

    // Try DB first — table may not exist yet if migration hasn't run
    try {
      const rows = await Invoice.findAll({
        where: { pharmacyId: pharmacy.id },
        order: [["stripeCreatedAt", "DESC"]],
        limit: 24,
      });

      if (rows.length > 0) {
        return res.status(200).json({
          success: true,
          data: rows.map((inv) => ({
            id: inv.stripeInvoiceId,
            number: inv.invoiceNumber,
            status: inv.status,
            amountDue: inv.amountDue,
            amountPaid: inv.amountPaid,
            currency: inv.currency,
            created: inv.stripeCreatedAt?.toISOString() || inv.createdAt?.toISOString(),
            periodStart: inv.periodStart?.toISOString() || null,
            periodEnd: inv.periodEnd?.toISOString() || null,
            hostedInvoiceUrl: inv.hostedInvoiceUrl,
            invoicePdf: inv.invoicePdf,
          })),
        });
      }
    } catch (dbErr) {
      console.warn("Invoice DB query failed, falling back to Stripe:", dbErr.message);
    }

    // Fallback: fetch from Stripe and backfill the DB
    if (!pharmacy.stripeCustomerId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const stripeList = await stripe.invoices.list({
      customer: pharmacy.stripeCustomerId,
      limit: 24,
    });

    // Persist to DB (best-effort; ignore if table still doesn't exist)
    for (const inv of stripeList.data) {
      try {
        await upsertInvoice(inv, pharmacy.id);
      } catch {}
    }

    const data = stripeList.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      amountDue: inv.amount_due,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      created: new Date(inv.created * 1000).toISOString(),
      periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      invoicePdf: inv.invoice_pdf,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to load invoices." });
  }
};

export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const isDev = process.env.NODE_ENV === "development";

  // Only verify if the secret is a real webhook secret (starts with whsec_)
  const hasValidSecret = webhookSecret && webhookSecret.startsWith("whsec_");

  let event;
  try {
    if (hasValidSecret && sig) {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } else if (isDev) {
      event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } else {
      return res.status(400).json({ success: false, message: "Missing webhook signing secret." });
    }
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).json({ success: false, message: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const pharmacyId = sub.metadata?.pharmacyId;
        const planId = sub.metadata?.planId;
        if (pharmacyId) {
          const pharmacy = await Pharmacy.findByPk(Number(pharmacyId));
          if (pharmacy) {
            pharmacy.stripeSubscriptionId = sub.id;
            pharmacy.subscriptionStatus = sub.status;
            if (planId && SUBSCRIPTION_PLANS[planId]) pharmacy.subscriptionTier = planId;
            await pharmacy.save();
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const pharmacyId = sub.metadata?.pharmacyId;
        if (pharmacyId) {
          const pharmacy = await Pharmacy.findByPk(Number(pharmacyId));
          if (pharmacy) {
            pharmacy.subscriptionStatus = sub.status || "canceled"; // Stripe spells it "canceled"
            pharmacy.stripeSubscriptionId = null;
            pharmacy.subscriptionTier = "free";
            await pharmacy.save();
          }
        }
        break;
      }

      case "customer.created": {
        const customer = event.data.object;
        const pharmacyId = customer.metadata?.pharmacyId;
        if (pharmacyId) {
          const pharmacy = await Pharmacy.findByPk(Number(pharmacyId));
          if (pharmacy && !pharmacy.stripeCustomerId) {
            pharmacy.stripeCustomerId = customer.id;
            await pharmacy.save();
          }
        }
        break;
      }

      case "invoice.paid":
      case "invoice.payment_succeeded":
      case "invoice.updated": {
        const inv = event.data.object;
        if (inv.customer) {
          const pharmacy = await Pharmacy.findOne({ where: { stripeCustomerId: inv.customer } });
          if (pharmacy) {
            try { await upsertInvoice(inv, pharmacy.id); } catch {}
          }
        }
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ success: false, message: "Webhook processing failed." });
  }
};
