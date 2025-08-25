import Razorpay from 'razorpay';
import { z } from 'zod';

// Payment gateway configurations
export const PAYMENT_GATEWAYS = {
  RAZORPAY: {
    keyId: process.env.RAZORPAY_KEY_ID!,
    keySecret: process.env.RAZORPAY_KEY_SECRET!,
  },
  PAYTM: {
    merchantId: process.env.PAYTM_MERCHANT_ID!,
    merchantKey: process.env.PAYTM_MERCHANT_KEY!,
    environment: process.env.PAYTM_ENVIRONMENT || 'TEST',
  },
  PHONEPE: {
    merchantId: process.env.PHONEPE_MERCHANT_ID!,
    saltKey: process.env.PHONEPE_SALT_KEY!,
    saltIndex: process.env.PHONEPE_SALT_INDEX!,
    environment: process.env.PHONEPE_ENVIRONMENT || 'UAT',
  },
} as const;

// Validation schemas
export const PayoutRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  method: z.enum(['UPI', 'RAZORPAY', 'PAYTM', 'PHONEPE', 'BANK_TRANSFER']),
  destinationRef: z.string(),
  description: z.string().optional(),
  userId: z.string(),
});

export type PayoutRequest = z.infer<typeof PayoutRequestSchema>;

// Razorpay Integration
export class RazorpayGateway {
  private client: Razorpay;

  constructor() {
    this.client = new Razorpay({
      key_id: PAYMENT_GATEWAYS.RAZORPAY.keyId,
      key_secret: PAYMENT_GATEWAYS.RAZORPAY.keySecret,
    });
  }

  async createPayout(request: PayoutRequest) {
    try {
      const payout = await this.client.payouts.create({
        account_number: request.destinationRef, // UPI ID or bank account
        fund_account_id: request.destinationRef,
        amount: request.amount * 100, // Convert to paise
        currency: request.currency,
        mode: 'UPI',
        purpose: 'payout',
        queue_if_low_balance: true,
        reference_id: `payout_${Date.now()}`,
        narration: request.description || 'Waste Management Reward',
      });

      return {
        success: true,
        gatewayTxnId: payout.id,
        status: payout.status,
        data: payout,
      };
    } catch (error) {
      console.error('Razorpay payout error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getPayoutStatus(payoutId: string) {
    try {
      const payout = await this.client.payouts.fetch(payoutId);
      return {
        success: true,
        status: payout.status,
        data: payout,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Paytm Integration
export class PaytmGateway {
  private baseUrl: string;
  private merchantId: string;
  private merchantKey: string;

  constructor() {
    this.merchantId = PAYMENT_GATEWAYS.PAYTM.merchantId;
    this.merchantKey = PAYMENT_GATEWAYS.PAYTM.merchantKey;
    this.baseUrl = PAYMENT_GATEWAYS.PAYTM.environment === 'PROD' 
      ? 'https://securegw.paytm.in' 
      : 'https://securegw-stage.paytm.in';
  }

  async createPayout(request: PayoutRequest) {
    try {
      const payload = {
        mid: this.merchantId,
        orderId: `payout_${Date.now()}`,
        amount: request.amount.toString(),
        currency: request.currency,
        beneficiaryAccount: request.destinationRef,
        beneficiaryIFSC: 'PAYT', // For UPI transfers
        beneficiaryName: 'User',
        purpose: request.description || 'Waste Management Reward',
        timestamp: new Date().toISOString(),
      };

      // In a real implementation, you'd need to implement proper signature generation
      const response = await fetch(`${this.baseUrl}/v3/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.merchantKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      return {
        success: data.status === 'SUCCESS',
        gatewayTxnId: data.txnId,
        status: data.status,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// PhonePe Integration
export class PhonePeGateway {
  private baseUrl: string;
  private merchantId: string;
  private saltKey: string;
  private saltIndex: string;

  constructor() {
    this.merchantId = PAYMENT_GATEWAYS.PHONEPE.merchantId;
    this.saltKey = PAYMENT_GATEWAYS.PHONEPE.saltKey;
    this.saltIndex = PAYMENT_GATEWAYS.PHONEPE.saltIndex;
    this.baseUrl = PAYMENT_GATEWAYS.PHONEPE.environment === 'PROD' 
      ? 'https://api.phonepe.com' 
      : 'https://api-preprod.phonepe.com';
  }

  async createPayout(request: PayoutRequest) {
    try {
      const payload = {
        merchantId: this.merchantId,
        merchantTransactionId: `payout_${Date.now()}`,
        amount: request.amount * 100, // Convert to paise
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/phonepe`,
        redirectMode: 'POST',
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/phonepe`,
        paymentInstrument: {
          type: 'UPI_INTENT',
          targetApp: 'PAYTM',
          accountNumber: request.destinationRef,
        },
      };

      // In a real implementation, you'd need to implement proper signature generation
      const response = await fetch(`${this.baseUrl}/apis/hermes/pg/v1/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': 'dummy-signature', // Replace with actual signature
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      return {
        success: data.code === 'SUCCESS',
        gatewayTxnId: data.data?.transactionId,
        status: data.code,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// UPI Integration (Direct bank transfer)
export class UPIGateway {
  async createPayout(request: PayoutRequest) {
    try {
      // For UPI, we'll simulate the process
      // In a real implementation, you'd integrate with a UPI payment aggregator
      const upiId = request.destinationRef;
      
      // Validate UPI ID format
      if (!this.isValidUPI(upiId)) {
        throw new Error('Invalid UPI ID format');
      }

      // Simulate successful payout
      return {
        success: true,
        gatewayTxnId: `upi_${Date.now()}`,
        status: 'SUCCESS',
        data: {
          upiId,
          amount: request.amount,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private isValidUPI(upiId: string): boolean {
    // Basic UPI ID validation (username@bank)
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/;
    return upiRegex.test(upiId);
  }
}

// Payment Gateway Factory
export class PaymentGatewayFactory {
  static createGateway(method: PayoutRequest['method']) {
    switch (method) {
      case 'RAZORPAY':
        return new RazorpayGateway();
      case 'PAYTM':
        return new PaytmGateway();
      case 'PHONEPE':
        return new PhonePeGateway();
      case 'UPI':
        return new UPIGateway();
      default:
        throw new Error(`Unsupported payment method: ${method}`);
    }
  }
}

// Utility functions
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

export const validateUPI = (upiId: string): boolean => {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/;
  return upiRegex.test(upiId);
};

export const validateBankAccount = (accountNumber: string): boolean => {
  // Basic validation - in production, use proper bank account validation
  return /^\d{9,18}$/.test(accountNumber);
};