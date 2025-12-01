import { Request, Response } from "express";
import { io } from "../server"; // Importamos la instancia IO que exportaste en server.ts

/**
 * Simula la recepción de un Webhook exitoso y emite el evento Socket.
 * Endpoint: GET /api/dev/test-socket-emit
 */
export const testSocketEmit = (req: Request, res: Response) => {
    
    // Datos de prueba para simular una orden pagada
    const testData = {
        orderId: 'TEST-ORDER-12345',
        status: 'paid',
        total: 75000 
    };

    // ⚡️ EMISIÓN DEL EVENTO DE PAGO REAL ⚡️
    // Esto simula lo que haría tu mp.service.ts al recibir el Webhook.
    io.emit('payment_update', testData);

    console.log(`[TEST-SOCKET] Evento 'payment_update' emitido con datos:`, testData);

    res.json({ success: true, message: "Socket event 'payment_update' emitted.", data: testData });
};