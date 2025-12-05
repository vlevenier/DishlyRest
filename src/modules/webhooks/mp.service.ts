import { io } from '../../server';
import * as orderService from '../orders/orders.service';

interface MPPayment {
    id: number;
    status: 'approved' | 'rejected' | 'pending' | 'in_process' | string;
    transaction_amount: number;
    metadata: {
        order_id?: string;
        [key: string]: any;
    };
    external_reference: string;
}

// Recibe directamente el objeto MPPayment desde el webhook
export const processPaymentWebhook = async (payment: MPPayment) => {
    if (!payment) return;

    if (payment.status === 'approved') {
        // Extraemos el orderId del external_reference o metadata
        const orderId = payment.external_reference?.replace('order_', '') || payment.metadata?.order_id;

        if (orderId) {
            // Actualizar la base de datos
            await orderService.markOrderPaidService(parseInt(orderId, 10));

            // Emitir la notificación Socket.IO
            console.log(`[Socket] Pago aprobado. Notificando orden: ${orderId}`);

            io.emit('payment_update', {
                orderId,
                status: 'paid',
                total: payment.transaction_amount
            });
        } else {
            console.warn('[Webhook] No se encontró orderId en payment:', payment.id);
        }
    } else {
        console.warn(`[Webhook] Pago ${payment.id} no aprobado. Estado: ${payment.status}`);
    }
};
