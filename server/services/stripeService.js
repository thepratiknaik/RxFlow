import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const SUBSCRIPTION_PLANS = {
  basic: {
    id: "basic",
    name: "Basic",
    description: "Perfect for small pharmacies",
    priceMonthly: 4900,
    currency: "usd",
    features: [
      "Up to 5 staff users",
      "Up to 500 patient records",
      "Prescription management",
      "Inventory tracking",
      "Email support",
    ],
  },
  pro: {
    id: "pro",
    name: "Professional",
    description: "For growing pharmacy operations",
    priceMonthly: 9900,
    currency: "usd",
    features: [
      "Up to 20 staff users",
      "Unlimited patient records",
      "FHIR prescription sync",
      "Advanced inventory management",
      "Email notifications",
      "Audit logs",
      "Priority email support",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Full-featured for large operations",
    priceMonthly: 19900,
    currency: "usd",
    features: [
      "Unlimited staff users",
      "Unlimited patient records",
      "FHIR prescription sync",
      "Advanced inventory management",
      "Full audit logs & reporting",
      "Custom integrations",
      "Dedicated account support",
    ],
  },
};

export const getOrCreateStripeCustomer = async (pharmacy) => {
  if (pharmacy.stripeCustomerId) {
    return pharmacy.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    name: pharmacy.name,
    metadata: { pharmacyId: String(pharmacy.id) },
  });

  pharmacy.stripeCustomerId = customer.id;
  await pharmacy.save();

  return customer.id;
};

export default stripe;
