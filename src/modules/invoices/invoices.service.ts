import { postgresPool } from "../../config/postgres";
import UploadsService from "../files/files.service";

class InvoicesService {
  async createInvoice(data: any) {
    const query = `
      INSERT INTO invoices (provider_id, amount, date, description, file_key)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [
      data.provider_id,
      data.amount,
      data.date,
      data.description,
      data.file_key,
    ];

    const result = await postgresPool.query(query, values);
    return result.rows[0];
  }


    async getInvoices() {
    const query = `
      SELECT 
        id,
        provider_id,
        amount,
        date,
        description,
        file_key,
        created_at
      FROM invoices
      ORDER BY created_at DESC
    `;

    const { rows } = await postgresPool.query(query);
    return rows;
  }


  async getInvoiceById(id: number) {
    const result = await postgresPool.query("SELECT * FROM invoices WHERE id = $1", [id]);
    return result.rows[0];
  }




  async deleteInvoice(id: number) {
    const invoice = await this.getInvoiceById(id);
    if (!invoice) return;

    if (invoice.file_key) {
      await UploadsService.deleteFile(invoice.file_key);
    }

    await postgresPool.query("DELETE FROM invoices WHERE id = $1", [id]);
  }



  async updateInvoice(id: number, data: any) {
    // Traemos la factura actual
    const invoice = await this.getInvoiceById(id);
    if (!invoice) throw new Error("Factura no encontrada");

    let fileKeyToUse = invoice.file_key;

    // Si viene un nuevo archivo, reemplazamos
    if (data.file_key) {
      // Eliminamos el archivo anterior si existía
      if (invoice.file_key) {
        await UploadsService.deleteFile(invoice.file_key);
      }
      fileKeyToUse = data.file_key;
    }

    const query = `
      UPDATE invoices
      SET
        provider_id = $1,
        amount = $2,
        date = $3,
        description = $4,
        file_key = $5
      WHERE id = $6
      RETURNING *;
    `;

    const values = [
      data.provider_id,
      data.amount,
      data.date,
      data.description,
      fileKeyToUse,
      id,
    ];

    const result = await postgresPool.query(query, values);
    return result.rows[0];
  }
}

export default new InvoicesService();
