import { Router } from "express";
import { testSocketEmit } from "./testSocket";
import { Request, Response } from "express"; // Importamos Request y Response

const router = Router();

// Endpoint para el HOME de la ruta de desarrollo
router.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "Development route is active.",
        available_endpoint: "/api/dev/test-socket-emit",
        purpose: "Use the available endpoint to force a 'payment_update' socket emission."
    });
});


// Endpoint de prueba que puedes llamar desde tu navegador o Postman
// para forzar la emisión de un evento Socket.
router.get("/test-socket-emit", testSocketEmit); 

export default router;