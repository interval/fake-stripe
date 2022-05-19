"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const faker_1 = __importDefault(require("@faker-js/faker"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function simulateNetworkLatency() {
    return sleep(faker_1.default.datatype.number({ min: 500, max: 2000 }));
}
function times(timesToCall, fn) {
    return Array.from(Array(timesToCall)).forEach(() => fn());
}
function toStripeUnixTs(d) {
    return Math.round(d.getTime() / 1000);
}
const customers = [];
const charges = {};
function findCharge(id) {
    return Object.values(charges)
        .flat()
        .find((ch) => ch.id === id);
}
function createCharge(customerId) {
    let amtCents = faker_1.default.datatype.number({ min: 100, max: 10000 });
    let isRefunded = faker_1.default.datatype.boolean();
    let id = `ch_${faker_1.default.random.alphaNumeric(24)}`;
    const destination = `acct_${faker_1.default.random.alphaNumeric(24)}`;
    const payment_intent = `pi_${faker_1.default.random.alphaNumeric(24)}`;
    return {
        id,
        object: "charge",
        amount: amtCents,
        amount_captured: amtCents,
        amount_refunded: isRefunded ? amtCents : 0,
        application: null,
        application_fee: null,
        application_fee_amount: null,
        balance_transaction: `txn_${faker_1.default.random.alphaNumeric(24)}`,
        billing_details: {
            address: {
                city: null,
                country: null,
                line1: null,
                line2: null,
                postal_code: faker_1.default.address.zipCode(),
                state: null,
            },
            email: null,
            name: null,
            phone: null,
        },
        calculated_statement_descriptor: "INTERVAL* SAMPLE",
        captured: true,
        created: toStripeUnixTs(faker_1.default.date.between("2021", "2022")),
        currency: "usd",
        customer: customerId,
        description: `${faker_1.default.commerce.department()} ${faker_1.default.commerce.product()}`,
        destination,
        dispute: null,
        disputed: false,
        failure_balance_transaction: null,
        failure_code: null,
        failure_message: null,
        fraud_details: {},
        invoice: `in_${faker_1.default.random.alphaNumeric(24)}`,
        livemode: false,
        metadata: {},
        on_behalf_of: null,
        outcome: {
            network_status: "approved_by_network",
            reason: null,
            risk_level: "normal",
            risk_score: faker_1.default.datatype.number({ min: 10, max: 100 }),
            seller_message: "Payment complete.",
            type: "authorized",
        },
        paid: true,
        payment_intent,
        payment_method: `pm_${faker_1.default.random.alphaNumeric(24)}`,
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
                exp_year: faker_1.default.date.future().getFullYear(),
                fingerprint: faker_1.default.random.alphaNumeric(16),
                funding: "credit",
                installments: null,
                last4: faker_1.default.random.numeric(4),
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
        transfer: `tr_${faker_1.default.random.alphaNumeric(24)}`,
        transfer_data: {
            amount: amtCents,
            destination,
        },
        transfer_group: `group_${payment_intent}`,
    };
}
function findOrCreateChargesForCustomer(customerId) {
    if (charges[customerId]) {
        return charges[customerId];
    }
    charges[customerId] = [];
    times(faker_1.default.datatype.number({ min: 5, max: 10 }), () => {
        charges[customerId].push(createCharge(customerId));
    });
    return charges[customerId];
}
function findOrCreateCustomer(email) {
    const name = faker_1.default.name.findName();
    if (email) {
        const foundCustomer = customers.find((c) => c.email === email);
        if (foundCustomer)
            return foundCustomer;
    }
    const c = {
        id: `cus_${faker_1.default.random.alphaNumeric(14)}`,
        object: "customer",
        address: null,
        balance: 0,
        created: toStripeUnixTs(faker_1.default.date.recent()),
        currency: "usd",
        default_source: null,
        delinquent: false,
        description: null,
        discount: null,
        email: email || faker_1.default.internet.email(name),
        invoice_prefix: faker_1.default.random.alphaNumeric(6),
        invoice_settings: {
            custom_fields: null,
            default_payment_method: `pm_${faker_1.default.random.alphaNumeric(24)}`,
            footer: null,
        },
        livemode: false,
        metadata: {},
        name,
        next_invoice_sequence: Number(faker_1.default.random.numeric()),
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
    constructor(apiKey, config) {
        this.customers = {
            list(params) {
                return __awaiter(this, void 0, void 0, function* () {
                    yield simulateNetworkLatency();
                    const limit = params.limit || 10;
                    return {
                        has_more: false,
                        data: Array.from(Array(limit)).map((_, i) => findOrCreateCustomer(i === 0 ? params.email : undefined)),
                        object: "list",
                        url: "",
                    };
                });
            },
        };
        this.charges = {
            list: (params) => __awaiter(this, void 0, void 0, function* () {
                yield simulateNetworkLatency();
                return {
                    has_more: false,
                    data: findOrCreateChargesForCustomer(params.customer),
                    object: "list",
                    url: "",
                };
            }),
        };
        this.refunds = {
            create: (params) => __awaiter(this, void 0, void 0, function* () {
                yield simulateNetworkLatency();
                if (!params.charge) {
                    throw new Error(`The fake Stripe client requires a Charge id for this request`);
                }
                const foundCharge = findCharge(params.charge);
                if (!foundCharge) {
                    throw new Error(`No such charge: '${params.charge}'`);
                }
                if (foundCharge.refunded) {
                    throw new Error(`The transfer ${foundCharge.transfer} is already fully reversed.`);
                }
                const refund = {
                    id: `re_${faker_1.default.random.alphaNumeric(24)}`,
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
                    transfer_reversal: `trr_${faker_1.default.random.alphaNumeric(24)}`,
                };
                const customerId = typeof foundCharge.customer === "string"
                    ? foundCharge.customer
                    : foundCharge.customer.id;
                const chargeIdx = charges[customerId].findIndex((ch) => ch.id === foundCharge.id);
                if (chargeIdx !== -1) {
                    charges[customerId][chargeIdx].refunds.data.push(refund);
                    charges[customerId][chargeIdx].amount_refunded = refund.amount;
                    charges[customerId][chargeIdx].refunded = true;
                }
                return Object.assign(Object.assign({}, refund), { lastResponse: null });
            }),
        };
    }
}
module.exports = Stripe;
