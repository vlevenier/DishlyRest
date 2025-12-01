import { Request, Response, NextFunction } from "express";
import * as webhookService from "./mp.service"; // ⬅️ Importar el nuevo servicio

export async function mpWebhook(req: Request, res: Response, next: NextFunction) {
    try {
        const { type, data } = req.body;
        
        // 1. MP te envía notificaciones por diferentes eventos, solo procesamos 'payment'
        if (type !== "payment" || !data || !data.id) {
            // Siempre debes responder 200/204 rápidamente
            return res.sendStatus(200); 
        }

        const paymentId = data.id;

        // 2. Delegar el procesamiento al servicio (verifica, actualiza DB y emite Socket)
        await webhookService.processPaymentWebhook(paymentId);

        // 3. Responder 200 OK a Mercado Pago.
        res.sendStatus(200); 
    } catch (err) {
        console.error("❌ Webhook error:", err);
        // Responder 500 para que Mercado Pago intente el webhook de nuevo más tarde
        res.sendStatus(500); 
    }
}