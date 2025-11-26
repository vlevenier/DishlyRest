import UploadsService from "../files/files.service";
import InvoicesService from "./invoices.service";
import { Request, Response } from "express";

class InvoicesController {
  async create(req: Request, res: Response) {
    try {
      const invoiceData = JSON.parse(req.body.data);
      let fileKey = null;

      if (req.file) {
        const uploaded = await UploadsService.uploadFile(req.file);
        fileKey = uploaded.key;
      }

      const invoice = await InvoicesService.createInvoice({
        ...invoiceData,
        file_key: fileKey
      });

      res.status(201).json({ success: true, invoice });
    } catch (err) {
      console.error("Error creating invoice:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
async getInvoices(req: Request, res: Response) {
    try {
      const invoices = await InvoicesService.getInvoices();
      return res.json(invoices);
    } catch (err) {
      console.error("Error getting invoices:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }



  async getById(req: Request, res: Response) {
    const invoice = await InvoicesService.getInvoiceById(Number(req.params.id));
    res.json(invoice);
  }

  async delete(req: Request, res: Response) {
    await InvoicesService.deleteInvoice(Number(req.params.id));
    res.json({ success: true });
  }



    async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const invoiceData = JSON.parse(req.body.data);
      let fileKey = null;

      if (req.file) {
        const uploaded = await UploadsService.uploadFile(req.file);
        fileKey = uploaded.key;
      }

      const updatedInvoice = await InvoicesService.updateInvoice(id, {
        ...invoiceData,
        file_key: fileKey
      });

      res.json({ success: true, invoice: updatedInvoice });
    } catch (err) {
      console.error("Error updating invoice:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }
}

export default new InvoicesController();
