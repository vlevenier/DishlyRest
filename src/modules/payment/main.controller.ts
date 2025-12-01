// main_controller.ts

import { Request, Response, NextFunction } from "express";
import * as ordersService from "../orders/orders.service";
import * as smartPointService from "../payment/pointSmart.service"; 

// Definición básica del tipo de orden que esperamos del service, 
// para mantener la claridad sobre las propiedades usadas.
// Si estás usando TypeScript, esto ayuda a evitar errores.
// Si usas JavaScript puro, esto es solo un comentario.
type BasicOrder = {
    id: string;
    total: number;
    // ... otras propiedades necesarias para el pago
};


export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const payload = req.body;
        
        // 1. Validar Payload Básico
        if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
            return res.status(400).json({ success: false, message: "At least one item is required" });
        }

        // 2. CREAR Y GUARDAR LA ORDEN LOCAL
        // El servicio devuelve el objeto de la orden creada { id, total, items, ... }
        // Utilizamos 'as BasicOrder' para indicar al motor qué estructura esperamos.
        const createdOrder: BasicOrder = await ordersService.createOrderService(payload);

        // 3. INICIAR EL PROCESO DE PAGO DE MERCADO PAGO POINT
        // El controller toma la orden creada y la usa para generar el Intent de Pago.
        
        const orderDataForPayment = {
            id: createdOrder.id,
            total: createdOrder.total, 
        };

        // Llama al service que se comunica con la API de Mercado Pago Point
        const paymentIntent = await smartPointService.createPointPaymentIntent(orderDataForPayment);

        // 4. RETORNAR LA ORDEN Y LA INFORMACIÓN DE PAGO AL FRONTEND
        // El frontend recibe: { success: true, order_id, total_amount, payment_info: { mp_intent_id, ... } }
        res.status(201).json({ 
            success: true, 
            order_id: createdOrder.id,
            total_amount: createdOrder.total,
            payment_info: paymentIntent // Contiene la data necesaria para el Smart Point/QR
        });

    } catch (err) {
        // En caso de error (ej. ordersService falló o smartPointService falló)
        next(err);
    }
};