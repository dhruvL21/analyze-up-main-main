/**
 * Ingestion: Excel (.xlsx / .xls) Parser
 * Converts Excel binary buffers into structured tabular dataset records.
 */
import * as XLSX from 'xlsx';
import { ParsedTabularData } from './csv-parser';

export function parseExcelBuffer(buffer: ArrayBuffer | Uint8Array): ParsedTabularData {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    
    if (!firstSheetName) {
      return {
        headers: [],
        rows: [],
        rowCount: 0,
        rawText: '',
        delimiter: ',',
      };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
    });

    const csvText = XLSX.utils.sheet_to_csv(worksheet);

    if (rawRows.length === 0) {
      return {
        headers: [],
        rows: [],
        rowCount: 0,
        rawText: csvText,
        delimiter: ',',
      };
    }

    const headers = Object.keys(rawRows[0]).map(h => h.trim()).filter(Boolean);

    return {
      headers,
      rows: rawRows,
      rowCount: rawRows.length,
      rawText: csvText,
      delimiter: ',',
    };
  } catch (error) {
    console.error('Error parsing Excel buffer:', error);
    throw new Error('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls spreadsheet.');
  }
}
