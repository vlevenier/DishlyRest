import { Router } from "express";
import {
  getOrders,
  getOrder,
  createOrder,
  payOrder,
  updateOrderStatus,
  addOrderItem,
  updateOrderItem,
  deleteOrderItem,
  createOrderProducts,
  getOrdersFilters
} from "./orders.controller";

const router = Router();




// Orders
router.get("/", getOrders);
router.get("/filters", getOrdersFilters);
router.get("/:id", getOrder);
// router.post("/", createOrder);
router.post("/", createOrderProducts);

// Payment (placeholder)
router.post("/:id/pay", payOrder);

// Status update
router.put("/:id/status", updateOrderStatus);

// Order items
router.post("/:orderId/items", addOrderItem);
router.put("/items/:id", updateOrderItem);
router.delete("/items/:id", deleteOrderItem);

export default router;
