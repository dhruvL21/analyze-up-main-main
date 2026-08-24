/**
 * Ingestion: Google Drive Adapter
 * Processes content fetched from Google Drive (CSV or Excel) into tabular rows.
 */
import { parseCSV, ParsedTabularData } from './csv-parser';
import { parseExcelBuffer } from './excel-parser';

export function parseGoogleDriveContent(filename: string, content: string | ArrayBuffer): ParsedTabularData {
  const isExcel = filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls');

  if (isExcel && typeof content !== 'string') {
    return parseExcelBuffer(content);
  }

  if (typeof content === 'string') {
    return parseCSV(content);
  }

  // If buffer was passed for a CSV, convert to string
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(content);
  return parseCSV(text);
}
