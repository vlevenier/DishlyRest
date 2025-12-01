export const createPointPaymentIntent = async(order:any) => {
  const response = await fetch(
    `https://api.mercadopago.com/point/integration-api/devices/${process.env.POINT_DEVICE_ID}/payment-intents`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: Math.round(order.total * 100), // en centavos
        description: `Order #${order.id}`,
        external_reference: `order_${order.id}`,
        metadata: {
          order_id: order.id
        }
      })
    }
  );

  return await response.json();
}



export const getPayment = async (paymentId: string) => {
    // ⚠️ REEMPLAZA ESTA URL por la API de Mercado Pago para obtener detalles del pago
    const url = `https://api.mercadopago.com/v1/payments/${paymentId}`; 

    const response = await fetch(url, {
        method: "GET",
        headers: {
            // Usa tu token de acceso para la autorización
            "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`, 
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        // Manejo de errores si MP no devuelve el pago (ej. 404)
        throw new Error(`Failed to fetch payment ${paymentId}: ${response.statusText}`);
    }

    return await response.json();
}
