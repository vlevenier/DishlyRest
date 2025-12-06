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

// // Recibe directamente el objeto MPPayment desde el webhook
// export const processPaymentWebhook = async (payment: MPPayment) => {
//     if (!payment) return;

//     if (payment.status === 'approved') {
//         // Extraemos el orderId del external_reference o metadata
//         const orderId = payment.external_reference?.replace('order_', '') || payment.metadata?.order_id;

//         if (orderId) {
//             // Actualizar la base de datos
//             await orderService.markOrderPaidService(parseInt(orderId, 10));

//             // Emitir la notificación Socket.IO
//             console.log(`[Socket] Pago aprobado. Notificando orden: ${orderId}`);

//             io.emit('payment_update', {
//                 orderId,
//                 status: 'paid',
//                 total: payment.transaction_amount
//             });
//         } else {
//             console.warn('[Webhook] No se encontró orderId en payment:', payment.id);
//         }
//     } else {
//         console.warn(`[Webhook] Pago ${payment.id} no aprobado. Estado: ${payment.status}`);
//     }
// };




export const processOrderWebhook = async (webhook: any) => {
    if (!webhook || !webhook.data) {
        console.warn("[Webhook] Data vacía");
        return;
    }

    const data = webhook.data;

    // Tu ID interno de orden
    const orderId = data.external_reference;

    const status = data.status;              // processed
    const statusDetail = data.status_detail; // accredited
    const totalPaid = Number(data.total_paid_amount);

    if (!orderId) {
        console.warn("[Webhook] No se encontró external_reference");
        return;
    }

    // Solo atendemos pagos acreditados
    if (status === "processed" && statusDetail === "accredited") {
        console.log(`[Webhook] Orden pagada correctamente: ${orderId}`);

        await orderService.markOrderPaidService(Number(orderId));
        const order = await orderService.getOrderByIdService(orderId);
      // 1. Preparamos los items en un formato limpio para la app móvil
 const itemsForSocket = order.items.map((item: any) => ({
    qty: item.quantity,
    name: item.product_name,
    price: item.subtotal
}));

    // 2. Emitimos el evento con la estructura completa
    io.emit("payment_update", {
        orderId: order.order_number, // Enviamos el 156 (número legible) en vez del ID interno
        status: "paid",
        total: order.total,
        items: itemsForSocket // <--- AQUÍ va el array con los productos
    });
    } else {
        console.log(`[Webhook] Orden con estado: ${status} / ${statusDetail}`);

        io.emit("payment_update", {
            orderId,
            status: "canceled",
            total: totalPaid
        });
    }
};
