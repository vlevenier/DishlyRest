import { Router, Request, Response } from 'express';
import { processOrderWebhook } from './mp.service';

const router = Router();

// router.post('/', async (req: Request, res: Response) => {
//     try {
//         console.log("[BEGIN SOCKET WEBHOOK ]");
//         // Mercado Pago envía el ID del pago en req.body.data.id
//         const paymentId = req.body?.data?.id;
//         console.log('[Webhook Received] Payment ID:', paymentId);
//         console.log(JSON.stringify(req.body));
//         if (!paymentId) {
//             return res.status(400).json({ error: 'Payment ID missing' });
//         }
//         //const res_ = req.body;
//         await processPaymentWebhook(paymentId);

//         // Siempre responder 200 a Mercado Pago para confirmar que recibiste el webhook
//         return res.status(200).send('OK');
//     } catch (error) {
//         console.error('[Webhook Error]', error);
//         return res.status(500).send('Internal Server Error');
//     }
// });

// export default router;


router.post('/', async (req: Request, res: Response) => {
    try {
        console.log("[WEBHOOK ORDER] Recibido:");
        console.log(JSON.stringify(req.body, null, 2));

        await processOrderWebhook(req.body);

        return res.status(200).send('OK');
    } catch (error) {
        console.error('[Webhook Error]', error);
        return res.status(500).send('Internal Server Error');
    }
});

export default router;
