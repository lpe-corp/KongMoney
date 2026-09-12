export type TransactionType = 'expense' | 'income' | 'transfer';
export type BucketRole = 'owner' | 'member';

export interface Bucket {
  id: string;
  name: string;
  icon: string;
  allocatedBudget: number;
  currentBalance: number;
  categoryColor: string;
  isLocked: boolean;
  allowRollover: boolean;
}

export interface Transaction {
  id: string;
  bucketId: string;
  amount: number;
  type: TransactionType;
  date: string;
  note: string;
  merchantName: string;
  slipImageUrl?: string;
}

export interface SharedBucket {
  bucketId: string;
  sharedWithUserIds: string[];
  ownerId: string;
  memberRoles?: Record<string, BucketRole>;
}

export interface TransferInput {
  fromBucketId: string;
  toBucketId: string;
  amount: number;
}

export interface ScanResult {
  amount?: number;
  date?: string;
  merchantName?: string;
  referenceNo?: string;
  bucketId?: string;
  error?: string;
}

export interface RecurringDeduction {
  id: string;
  bucketId: string;
  name: string;
  amount: number;
  nextRunDate: string;
  cadence: 'monthly' | 'weekly';
}

export interface SharedBucketAccess {
  bucketId: string;
  role: BucketRole;
}
