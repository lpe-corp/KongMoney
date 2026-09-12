import type { ScanResult } from '../types';

const merchantKeywordToBucket: Record<string, string> = {
  '7-eleven': 'Food',
  'lotus': 'Food',
  'grabfood': 'Food',
  'netflix': 'Entertainment',
  'internet': 'Bills',
  'ais': 'Bills',
  'petrol': 'Transport',
  'shell': 'Transport',
  'tesco': 'Groceries',
  'makro': 'Groceries',
  'hospital': 'Health',
};

export function inferBucketFromMerchant(merchantName: string): string | undefined {
  const normalized = merchantName.toLowerCase();
  const matchedKey = Object.keys(merchantKeywordToBucket).find((keyword) => normalized.includes(keyword));

  return matchedKey ? merchantKeywordToBucket[matchedKey] : undefined;
}

export function parseSlipScanText(text: string): ScanResult {
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  if (!normalizedText) {
    return { error: 'No text detected in scan result.' };
  }

  const amountMatch = normalizedText.match(/(?:total|amount|paid|sum)\s*[:$]?\s*([0-9]+(?:\.[0-9]{2})?)/i);
  const dateMatch = normalizedText.match(/(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/);
  const refMatch = normalizedText.match(/(ref|reference|invoice|receipt)\s*[:#-]?\s*([A-Za-z0-9-]+)/i);

  const merchantName = normalizedText
    .split(/\s+/)
    .slice(0, 4)
    .join(' ')
    .replace(/[0-9]/g, '')
    .trim();

  const inferredBucketId = inferBucketFromMerchant(merchantName || '');

  if (!amountMatch) {
    return {
      merchantName: merchantName || 'Unknown Merchant',
      date: dateMatch?.[1] ?? new Date().toISOString(),
      referenceNo: refMatch?.[2],
      bucketId: inferredBucketId,
      error: 'Unable to detect amount from scanned slip.',
    };
  }

  return {
    amount: Number(amountMatch[1]),
    date: dateMatch?.[1] ?? new Date().toISOString(),
    merchantName: merchantName || 'Unknown Merchant',
    referenceNo: refMatch?.[2],
    bucketId: inferredBucketId,
  };
}

export async function parseSlipImage(_imageUri: string): Promise<ScanResult> {
  // This is intentionally mock/OCR-ready. Replace this with Tesseract.js or Google Vision integration if needed.
  const mockText = `
    Lotus 7-Eleven
    Total: 245.00
    Date: 2026-09-13
    Ref: INV-2048
  `;

  return parseSlipScanText(mockText);
}
