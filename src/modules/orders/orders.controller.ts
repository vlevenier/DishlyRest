import { Request, Response, NextFunction } from "express";
import * as ordersService from "./orders.service";
import { io } from '../../server';

export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, source } = req.query as any;
    const orders = await ordersService.getOrdersServiceFull({ status, source });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};


export const getOrdersFilters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      source,
      sortField,
      sortDir,
      page = "1",
      limit = "20",
      todayOnly
    } = req.query as any;

    const result = await ordersService.listOrders({
      status,
      source,
      sort: sortField ? { field: String(sortField), direction: String(sortDir) } : undefined,
      page: Number(page),
      limit: Number(limit),
      todayOnly: todayOnly === "true" ? true : false,
    });

    res.status(200).json(result);

  } catch (err) {
    next(err);
  }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id);
    const order = await ordersService.getOrderByIdService(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
      return res.status(400).json({ success: false, message: "At least one item is required" });
    }

    const data = await ordersService.createOrderService(payload);
    res.status(201).json({ success: true, ...data});
  } catch (err) {
    next(err);
  }
};




export const createOrderProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    
    const data  = await ordersService.createOrderProductsService(payload);
    res.status(201).json({ success: true, data: data });
  } catch (err) {
    next(err);
  }
};

export const payOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id);
    // Aquí solo marcamos como pagado. En producción verifica webhook MercadoPago.
    const updated = await ordersService.markOrderPaidService(orderId);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "Status is required" });

    const updated = await ordersService.updateOrderStatusService(orderId, status);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/* Order Items controllers */

export const addOrderItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.orderId);
    const item = req.body;
    const created = await ordersService.addOrderItemService(orderId, item);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

export const updateOrderItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderItemId = Number(req.params.id);
    const updates = req.body;
    const updated = await ordersService.updateOrderItemService(orderItemId, updates);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const markOrderPaidService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id);
    const updates = req.body;
      console.log("Updates received:", updates);
    const updated = await ordersService.markOrderPaidService(orderId);
    const order = await ordersService.getOrderByIdService(orderId);
    const itemsForSocket = order.items.map((item: any) => ({
    qty: item.quantity,
    name: (item.is_combo ? '(C) ' : '') + item.product_name,
    price: item.subtotal,
   
}));

  io.emit("payment_update", {
    // Metadatos (opcionales, pero útiles si tu app los usa para filtrar)
    action: "payment.updated",
    type: "payment",

    // Datos que Kotlin está buscando directamente:
    orderId: orderId,  // Kotlin busca "orderId"
    status: "paid",
    total: order.total,           // Kotlin busca "total"
    items: itemsForSocket         // Kotlin busca "items"
});
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteOrderItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderItemId = Number(req.params.id);
    const deleted = await ordersService.deleteOrderItemService(orderItemId);
    res.status(200).json({ success: true, data: deleted });
  } catch (err) {
    next(err);
  }
};
