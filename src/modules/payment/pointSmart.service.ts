// pointSmart.service.ts
import axios from "axios";

const MP_API_URL = "https://api.mercadopago.com/v1/orders";
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;
const MP_TERMINAL_ID = process.env.MP_TERMINAL_ID;

export async function createPointPaymentIntent(order: { id: string; total: number }) {
  console.log("Creating Point Smart payment intent for order:", order);
  console.log("Using MP_ACCESS_TOKEN:", MP_ACCESS_TOKEN);
  console.log("Using MP_TERMINAL_ID:", MP_TERMINAL_ID);
    try {
        const body = {
            type: "point",
            external_reference: order.id,
            expiration_time: "PT10M",
            transactions: {
                payments: [
                    {
                        amount: String(Number(order.total).toFixed(0))
                    }
                ]
            },
            description: "Pago desde SmartPoint API",
            config: {
                point: {
                    terminal_id: MP_TERMINAL_ID,
                    print_on_terminal: "no_ticket"
                },
                payment_method: {
                    default_type: "credit_card"
                }
            },
            taxes: [
                {
                    payer_condition: "payment_taxable_iva"
                }
            ]
        };

        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
            "X-Idempotency-Key": crypto.randomUUID()
        };

        const response = await axios.post(MP_API_URL, body, { headers });

        return response.data;

    } catch (err: any) {
        console.error("Error creating Point Smart order:", err.response?.data || err.message);
        throw new Error(
            err.response?.data?.errors?.[0]?.message || "Mercado Pago Point API error"
        );
    }
}
