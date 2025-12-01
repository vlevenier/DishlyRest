// payment/pointSmart.controller.ts

import { Request, Response, NextFunction } from "express";
import * as mpService from "./pointSmart.service";

// NOTA: Si este controller es llamado INTERNAMENTE por tu main_controller,
// puedes simplificarlo a solo una función que reciba el objeto de la orden,
// en lugar de depender de req.body. Aquí lo adaptamos para que funcione.

export async function startPointSmartPayment(req: Request, res: Response, next: NextFunction) {
    try {
        // En un flujo ideal, esto ya vendría de la orden creada.
        const { order_id, total_amount } = req.body; 

        // Creamos un objeto 'order' simple para el servicio de MP
        let order = { id: order_id, total: total_amount }; 
        
        // Llamada al service que se comunica con la API de Mercado Pago
        const paymentIntent = await mpService.createPointPaymentIntent(order);

        // Retorna la info del intent de pago de MP
        res.json(paymentIntent); 
    } catch (err) {
        next(err);
    }
}