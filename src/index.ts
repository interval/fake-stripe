import faker from "@faker-js/faker";
import { Stripe as RealStripe } from "stripe";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function simulateNetworkLatency() {
  return sleep(faker.datatype.number({ min: 500, max: 2000 }));
}

function times(timesToCall: number, fn: Function) {
  return Array.from(Array(timesToCall)).forEach(() => fn());
}

function toStripeUnixTs(d: Date) {
  return Math.round(d.getTime() / 1000);
}

const customers: RealStripe.Customer[] = [];

const charges: Record<string, RealStripe.Charge[]> = {};

export function debug_getInternalDataStructure() {
  return { customers, charges };
}

function findCharge(id: string) {
  return Object.values(charges)
    .flat()
    .find((ch) => ch.id === id);
}

function createCharge(customerId: string): RealStripe.Charge {
  let amtCents = faker.datatype.number({ min: 100, max: 10000 });
  let isRefunded = faker.datatype.boolean();

  let id = `ch_${faker.random.alphaNumeric(24)}`;
  const destination = `acct_${faker.random.alphaNumeric(24)}`;
  const payment_intent = `pi_${faker.random.alphaNumeric(24)}`;

  return {
    id,
    object: "charge",
    amount: amtCents,
    amount_captured: amtCents,
    amount_refunded: isRefunded ? amtCents : 0,
    application: null,
    application_fee: null,
    application_fee_amount: null,
    balance_transaction: `txn_${faker.random.alphaNumeric(24)}`,
    billing_details: {
      address: {
        city: null,
        country: null,
        line1: null,
        line2: null,
        postal_code: faker.address.zipCode(),
        state: null,
      },
      email: null,
      name: null,
      phone: null,
    },
    calculated_statement_descriptor: "INTERVAL* SAMPLE",
    captured: true,
    created: toStripeUnixTs(faker.date.between("2021", "2022")),
    currency: "usd",
    customer: customerId,
    description: `${faker.commerce.department()} ${faker.commerce.product()}`,
    destination,
    dispute: null,
    disputed: false,
    failure_balance_transaction: null,
    failure_code: null,
    failure_message: null,
    fraud_details: {},
    invoice: `in_${faker.random.alphaNumeric(24)}`,
    livemode: false,
    metadata: {},
    on_behalf_of: null,
    outcome: {
      network_status: "approved_by_network",
      reason: null,
      risk_level: "normal",
      risk_score: faker.datatype.number({ min: 10, max: 100 }),
      seller_message: "Payment complete.",
      type: "authorized",
    },
    paid: true,
    payment_intent,
    payment_method: `pm_${faker.random.alphaNumeric(24)}`,
    payment_method_details: {
      card: {
        brand: "amex",
        checks: {
          address_line1_check: null,
          address_postal_code_check: "pass",
          cvc_check: null,
        },
        country: "US",
        exp_month: 7,
        exp_year: faker.date.future().getFullYear(),
        fingerprint: faker.random.alphaNumeric(16),
        funding: "credit",
        installments: null,
        last4: faker.random.numeric(4),
        mandate: null,
        network: "amex",
        three_d_secure: null,
        wallet: null,
      },
      type: "card",
    },
    receipt_email: null,
    receipt_number: null,
    receipt_url: "",
    refunded: false,
    refunds: {
      object: "list",
      data: [],
      has_more: false,
      url: `/v1/charges/${id}/refunds`,
    },
    review: null,
    shipping: null,
    source: null,
    source_transfer: null,
    statement_descriptor: "INTERVAL* SAMPLE",
    statement_descriptor_suffix: null,
    status: "succeeded",
    transfer: `tr_${faker.random.alphaNumeric(24)}`,
    transfer_data: {
      amount: amtCents,
      destination,
    },
    transfer_group: `group_${payment_intent}`,
  };
}

function findOrCreateChargesForCustomer(customerId: string) {
  if (charges[customerId]) {
    return charges[customerId];
  }

  charges[customerId] = [];

  times(faker.datatype.number({ min: 5, max: 10 }), () => {
    charges[customerId].push(createCharge(customerId));
  });

  return charges[customerId];
}

function findOrCreateCustomer(email?: string) {
  const name = faker.name.findName();

  if (email) {
    const foundCustomer = customers.find((c) => c.email === email);
    if (foundCustomer) return foundCustomer;
  }

  const c: RealStripe.Customer = {
    id: `cus_${faker.random.alphaNumeric(14)}`,
    object: "customer",
    address: null,
    balance: 0,
    created: toStripeUnixTs(faker.date.recent()),
    currency: "usd",
    default_source: null,
    delinquent: false,
    description: null,
    discount: null,
    email: email || faker.internet.email(name),
    invoice_prefix: faker.random.alphaNumeric(6),
    invoice_settings: {
      custom_fields: null,
      default_payment_method: `pm_${faker.random.alphaNumeric(24)}`,
      footer: null,
    },
    livemode: false,
    metadata: {},
    name,
    next_invoice_sequence: Number(faker.random.numeric()),
    phone: null,
    preferred_locales: [],
    shipping: null,
    tax_exempt: "none",
    test_clock: null,
  };

  customers.push(c);
  return c;
}

class Stripe {
  customers: {
    list: (
      params: RealStripe.CustomerListParams
    ) => Promise<RealStripe.ApiList<RealStripe.Customer>>;
  };
  charges: {
    list: (
      params: RealStripe.PaymentIntentListParams
    ) => Promise<RealStripe.ApiList<RealStripe.Charge>>;
  };
  refunds: {
    create: (
      params: RealStripe.RefundCreateParams
    ) => Promise<RealStripe.Response<RealStripe.Refund>>;
  };
  constructor(apiKey: string, config: RealStripe.StripeConfig) {
    this.customers = {
      async list(params) {
        await simulateNetworkLatency();
        const limit = params.limit || 10;

        return {
          has_more: false,
          data: Array.from(Array(limit)).map((_, i) =>
            findOrCreateCustomer(i === 0 ? params.email : undefined)
          ),
          object: "list",
          url: "",
        };
      },
    };

    this.charges = {
      list: async (params) => {
        await simulateNetworkLatency();
        return {
          has_more: false,
          data: findOrCreateChargesForCustomer(params.customer),
          object: "list",
          url: "",
        };
      },
    };

    this.refunds = {
      create: async (params) => {
        await simulateNetworkLatency();

        if (!params.charge) {
          throw new Error(
            `The fake Stripe client requires a Charge id for this request`
          );
        }

        const foundCharge = findCharge(params.charge);

        if (!foundCharge) {
          throw new Error(`No such charge: '${params.charge}'`);
        }

        if (foundCharge.refunded) {
          throw new Error(
            `The transfer ${foundCharge.transfer} is already fully reversed.`
          );
        }

        const refund: RealStripe.Refund = {
          id: `re_${faker.random.alphaNumeric(24)}`,
          object: "refund",
          amount: foundCharge.amount,
          balance_transaction: foundCharge.balance_transaction,
          charge: foundCharge.id,
          created: toStripeUnixTs(new Date()),
          currency: "usd",
          metadata: {},
          payment_intent: foundCharge.payment_intent,
          reason: params.reason || "requested_by_customer",
          receipt_number: null,
          source_transfer_reversal: null,
          status: "succeeded",
          transfer_reversal: `trr_${faker.random.alphaNumeric(24)}`,
        };

        const customerId =
          typeof foundCharge.customer === "string"
            ? foundCharge.customer
            : foundCharge.customer.id;

        const chargeIdx = charges[customerId].findIndex(
          (ch) => ch.id === foundCharge.id
        );
        if (chargeIdx !== -1) {
          charges[customerId][chargeIdx].refunds.data.push(refund);
          charges[customerId][chargeIdx].amount_refunded = refund.amount;
          charges[customerId][chargeIdx].refunded = true;
        }

        return { ...refund, lastResponse: null };
      },
    };
  }
}

export default Stripe;
