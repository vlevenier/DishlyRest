import { io } from '../../server'; 
import * as mpExternalService from '../payment/pointSmart.service';
import * as orderService from '../orders/orders.service'; 

// 1. DEFINICIÓN DE LA INTERFAZ
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


export const processPaymentWebhook = async (paymentId: string) => {
    
    // 2. APLICAR EL CASTING (AS MPPayment)
    const payment = await mpExternalService.getPayment(paymentId) as MPPayment; 

    // ¡Ahora TypeScript reconoce "payment.status" sin error!
    if (payment && payment.status === 'approved') {
        
        // El orderId lo puedes extraer del external_reference o metadata
        // Usamos external_reference que enviamos como 'order_ID_XYZ'
        const orderId = payment.external_reference.replace('order_', ''); 
        
        if (orderId) {
            
            // 3. Actualizar la base de datos (DB)
            await orderService.markOrderPaidService( parseInt(orderId, 10));
            
            // 4. EMITIR LA NOTIFICACIÓN SOCKET.IO
            console.log(`[Socket] Pago aprobado. Notificando orden: ${orderId}`);
            
            io.emit('payment_update', { 
                orderId: orderId, 
                status: 'paid',
                total: payment.transaction_amount
            });
        }
    } else {
        console.warn(`[Webhook] Pago ${paymentId} no aprobado. Estado: ${payment?.status}`);
    }
};