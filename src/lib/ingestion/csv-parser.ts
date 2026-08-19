/**
 * Ingestion: CSV Parser
 * Robust CSV parser with auto-delimiter sniffing, BOM handling, and raw preservation.
 */
import Papa from 'papaparse';

export interface ParsedTabularData {
  headers: string[];
  rows: Record<string, any>[];
  rowCount: number;
  rawText: string;
  delimiter: string;
}

export function parseCSV(content: string): ParsedTabularData {
  if (!content || content.trim().length === 0) {
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      rawText: '',
      delimiter: ',',
    };
  }

  // Remove potential UTF-8 BOM
  const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;

  const result = Papa.parse(cleanContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h: string) => h.trim(),
  });

  const rows = (result.data as Record<string, any>[]).filter(r => {
    return Object.values(r).some(v => v !== undefined && v !== null && String(v).trim() !== '');
  });

  const headers = result.meta.fields ? result.meta.fields.map(f => f.trim()).filter(Boolean) : (rows[0] ? Object.keys(rows[0]) : []);

  return {
    headers,
    rows,
    rowCount: rows.length,
    rawText: cleanContent,
    delimiter: result.meta.delimiter || ',',
  };
}
