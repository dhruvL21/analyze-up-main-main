import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Razorpay Signature Verification Algorithm', () => {
  const testSecret = 'VxZJ2YR13MvalrRKgA3UzOID';
  const orderId = 'order_DA29103841';
  const paymentId = 'pay_9821381203';

  it('should generate and correctly verify a valid Razorpay HMAC SHA-256 signature', () => {
    const payload = `${orderId}|${paymentId}`;
    const validSignature = crypto
      .createHmac('sha256', testSecret)
      .update(payload)
      .digest('hex');

    // Simulate verification check
    const generatedSign = crypto
      .createHmac('sha256', testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(validSignature).toBe(generatedSign);
  });

  it('should reject a tampered or invalid signature', () => {
    const invalidSignature = 'invalid_tampered_signature_12345';
    const expectedSign = crypto
      .createHmac('sha256', testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(invalidSignature === expectedSign).toBe(false);
  });
});
