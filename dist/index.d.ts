import { Stripe as RealStripe } from "stripe";
declare class Stripe {
    customers: {
        list: (params: RealStripe.CustomerListParams) => Promise<RealStripe.ApiList<RealStripe.Customer>>;
    };
    charges: {
        list: (params: RealStripe.PaymentIntentListParams) => Promise<RealStripe.ApiList<RealStripe.Charge>>;
    };
    refunds: {
        create: (params: RealStripe.RefundCreateParams) => Promise<RealStripe.Response<RealStripe.Refund>>;
        list: (params: RealStripe.RefundListParams) => Promise<RealStripe.ApiList<RealStripe.Refund>>;
    };
    constructor(apiKey: string | undefined, config: RealStripe.StripeConfig);
}
export = Stripe;
