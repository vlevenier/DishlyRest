import { Request, Response, NextFunction } from "express";
import * as ordersService from "./orders.service";

export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, source } = req.query as any;
    const orders = await ordersService.getOrdersService({ status, source });
    res.status(200).json({ success: true, count: orders.length, data: orders });
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

    const order = await ordersService.createOrderService(payload);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const payOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = Number(req.params.id);
    // Aquí solo marcamos como pagado. En producción verifica webhook MercadoPago.
    const updated = await ordersService.markOrderPaidService(orderId, { method: req.body.method });
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

export const deleteOrderItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderItemId = Number(req.params.id);
    const deleted = await ordersService.deleteOrderItemService(orderItemId);
    res.status(200).json({ success: true, data: deleted });
  } catch (err) {
    next(err);
  }
};
