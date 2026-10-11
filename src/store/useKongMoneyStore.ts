import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { applyMonthlyReset } from '../services/rollover';
import type {
  Bucket,
  BucketRole,
  RecurringDeduction,
  SharedBucket,
  SharedBucketAccess,
  Transaction,
  TransferInput,
} from '../types';

interface KongMoneyState {
  buckets: Bucket[];
  transactions: Transaction[];
  sharedBuckets: SharedBucket[];
  recurringDeductions: RecurringDeduction[];
  transferFunds: (input: TransferInput) => void;
  addBucket: (bucket: Bucket) => void;
  updateBucket: (bucketId: string, updates: Partial<Bucket>) => void;
  deleteBucket: (bucketId: string) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transactionId: string, updates: Pick<Transaction, 'bucketId' | 'amount' | 'merchantName' | 'note'>) => void;
  deleteTransaction: (transactionId: string) => void;
  addRecurringDeduction: (deduction: RecurringDeduction) => void;
  updateRecurringDeduction: (deductionId: string, updates: Pick<RecurringDeduction, 'bucketId' | 'name' | 'amount' | 'cadence' | 'nextRunDate'>) => void;
  removeRecurringDeduction: (deductionId: string) => void;
  lockBucket: (bucketId: string, isLocked: boolean) => void;
  updateBucketBalance: (bucketId: string, delta: number) => void;
  applyRecurringDeductions: () => void;
  resetMonth: (savingsBucketId: string) => { buckets: Bucket[]; transactions: Transaction[] };
  addSharedBucket: (bucketId: string, ownerId: string, sharedWithUserIds?: string[]) => void;
  addSharedMember: (bucketId: string, userId: string, role?: BucketRole) => void;
  removeSharedMember: (bucketId: string, userId: string) => void;
  getBucketAccessForUser: (bucketId: string, userId: string) => SharedBucketAccess | undefined;
}

const defaultBuckets: Bucket[] = [
  {
    id: 'food',
    name: 'Food',
    icon: 'utensils',
    allocatedBudget: 2500,
    currentBalance: 2400,
    categoryColor: '#4CAF50',
    isLocked: false,
    allowRollover: true,
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: 'car',
    allocatedBudget: 1200,
    currentBalance: 900,
    categoryColor: '#FFB300',
    isLocked: false,
    allowRollover: false,
  },
  {
    id: 'savings',
    name: 'Savings',
    icon: 'piggy-bank',
    allocatedBudget: 5000,
    currentBalance: 7000,
    categoryColor: '#2196F3',
    isLocked: false,
    allowRollover: true,
  },
];

const defaultTransactions: Transaction[] = [
  {
    id: 'tx-1',
    bucketId: 'food',
    amount: 120,
    type: 'expense',
    date: new Date().toISOString(),
    note: 'Groceries',
    merchantName: 'Lotus',
  },
  {
    id: 'tx-2',
    bucketId: 'savings',
    amount: 500,
    type: 'income',
    date: new Date().toISOString(),
    note: 'Monthly savings',
    merchantName: 'Auto Transfer',
  },
];

const defaultSharedBuckets: SharedBucket[] = [];
const defaultRecurringDeductions: RecurringDeduction[] = [
  {
    id: 'rec-1',
    bucketId: 'food',
    name: 'Netflix',
    amount: 169,
    nextRunDate: new Date().toISOString(),
    cadence: 'monthly',
  },
];

export const useKongMoneyStore = create<KongMoneyState>()(
  persist(
    (set, get) => ({
      buckets: defaultBuckets,
      transactions: defaultTransactions,
      sharedBuckets: defaultSharedBuckets,
      recurringDeductions: defaultRecurringDeductions,
      addBucket: (bucket) =>
        set((state) => ({
          buckets: [...state.buckets, bucket],
        })),
      updateBucket: (bucketId, updates) =>
        set((state) => ({
          buckets: state.buckets.map((bucket) => {
            if (bucket.id !== bucketId) return bucket;

            const updatedBucket = { ...bucket, ...updates };
            if (updates.allocatedBudget === undefined) return updatedBucket;

            return {
              ...updatedBucket,
              currentBalance: Math.max(0, bucket.currentBalance + updates.allocatedBudget - bucket.allocatedBudget),
            };
          }),
        })),
      deleteBucket: (bucketId) =>
        set((state) => ({
          buckets: state.buckets.filter((bucket) => bucket.id !== bucketId),
          transactions: state.transactions.filter((transaction) => transaction.bucketId !== bucketId),
          recurringDeductions: state.recurringDeductions.filter((deduction) => deduction.bucketId !== bucketId),
          sharedBuckets: state.sharedBuckets.filter((bucket) => bucket.bucketId !== bucketId),
        })),
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [transaction, ...state.transactions],
        })),
      updateTransaction: (transactionId, updates) => {
        const state = get();
        const existing = state.transactions.find((transaction) => transaction.id === transactionId);

        if (!existing) {
          throw new Error('Transaction not found.');
        }
        if (existing.type === 'transfer') {
          throw new Error('Transfers cannot be edited. Create a new transfer instead.');
        }
        if (!Number.isFinite(updates.amount) || updates.amount <= 0) {
          throw new Error('Enter an amount greater than zero.');
        }

        const oldBucket = state.buckets.find((bucket) => bucket.id === existing.bucketId);
        const nextBucket = state.buckets.find((bucket) => bucket.id === updates.bucketId);
        if (!oldBucket || !nextBucket) {
          throw new Error('The selected bucket no longer exists.');
        }
        if (oldBucket.isLocked || nextBucket.isLocked) {
          throw new Error('Unlock the affected bucket before editing this transaction.');
        }

        const oldEffect = existing.type === 'expense' ? -existing.amount : existing.amount;
        const nextEffect = existing.type === 'expense' ? -updates.amount : updates.amount;
        const deltas = new Map<string, number>();
        deltas.set(existing.bucketId, -oldEffect);
        deltas.set(updates.bucketId, (deltas.get(updates.bucketId) ?? 0) + nextEffect);

        const buckets = state.buckets.map((bucket) => {
          const delta = deltas.get(bucket.id) ?? 0;
          const nextBalance = bucket.currentBalance + delta;
          if (nextBalance < 0) {
            throw new Error(`${bucket.name} does not have enough balance for this change.`);
          }
          return delta === 0 ? bucket : { ...bucket, currentBalance: nextBalance };
        });

        set({
          buckets,
          transactions: state.transactions.map((transaction) =>
            transaction.id === transactionId ? { ...transaction, ...updates } : transaction,
          ),
        });
      },
      deleteTransaction: (transactionId) => {
        const state = get();
        const existing = state.transactions.find((transaction) => transaction.id === transactionId);

        if (!existing) {
          throw new Error('Transaction not found.');
        }
        if (existing.type === 'transfer') {
          throw new Error('Transfers cannot be deleted. Create an offsetting transfer instead.');
        }

        const effect = existing.type === 'expense' ? -existing.amount : existing.amount;
        const buckets = state.buckets.map((bucket) => {
          if (bucket.id !== existing.bucketId) return bucket;
          const nextBalance = bucket.currentBalance - effect;
          if (nextBalance < 0) {
            throw new Error(`${bucket.name} cannot go below zero.`);
          }
          return { ...bucket, currentBalance: nextBalance };
        });

        set({
          buckets,
          transactions: state.transactions.filter((transaction) => transaction.id !== transactionId),
        });
      },
      addRecurringDeduction: (deduction) =>
        set((state) => ({
          recurringDeductions: [...state.recurringDeductions, deduction],
        })),
      updateRecurringDeduction: (deductionId, updates) =>
        set((state) => ({
          recurringDeductions: state.recurringDeductions.map((deduction) =>
            deduction.id === deductionId ? { ...deduction, ...updates } : deduction,
          ),
        })),
      removeRecurringDeduction: (deductionId) =>
        set((state) => ({
          recurringDeductions: state.recurringDeductions.filter((deduction) => deduction.id !== deductionId),
        })),
      addSharedBucket: (bucketId, ownerId, sharedWithUserIds = []) =>
        set((state) => ({
          sharedBuckets: [
            ...state.sharedBuckets.filter((bucket) => bucket.bucketId !== bucketId),
            {
              bucketId,
              ownerId,
              sharedWithUserIds,
              memberRoles: sharedWithUserIds.reduce<Record<string, BucketRole>>((roles, userId) => {
                roles[userId] = 'member';
                return roles;
              }, {}),
            },
          ],
        })),
      addSharedMember: (bucketId, userId, role = 'member') =>
        set((state) => ({
          sharedBuckets: state.sharedBuckets.map((bucket) => {
            if (bucket.bucketId !== bucketId) {
              return bucket;
            }

            const exists = bucket.sharedWithUserIds.includes(userId);
            const sharedWithUserIds = exists ? bucket.sharedWithUserIds : [...bucket.sharedWithUserIds, userId];
            const memberRoles = { ...bucket.memberRoles, [userId]: role };

            return {
              ...bucket,
              sharedWithUserIds,
              memberRoles,
            };
          }),
        })),
      removeSharedMember: (bucketId, userId) =>
        set((state) => ({
          sharedBuckets: state.sharedBuckets.map((bucket) => {
            if (bucket.bucketId !== bucketId) {
              return bucket;
            }

            const sharedWithUserIds = bucket.sharedWithUserIds.filter((id) => id !== userId);
            const memberRoles = { ...bucket.memberRoles };
            delete memberRoles[userId];

            return {
              ...bucket,
              sharedWithUserIds,
              memberRoles,
            };
          }),
        })),
      getBucketAccessForUser: (bucketId, userId) => {
        const state = get();
        const sharedBucket = state.sharedBuckets.find((bucket) => bucket.bucketId === bucketId);

        if (!sharedBucket) {
          return undefined;
        }

        if (sharedBucket.ownerId === userId) {
          return { bucketId, role: 'owner' };
        }

        const role = sharedBucket.memberRoles?.[userId] ?? 'member';
        return sharedBucket.sharedWithUserIds.includes(userId) ? { bucketId, role } : undefined;
      },
      transferFunds: ({ fromBucketId, toBucketId, amount }) => {
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Transfer amount must be greater than zero.');
        }

        const state = get();
        const fromBucket = state.buckets.find((bucket) => bucket.id === fromBucketId);
        const toBucket = state.buckets.find((bucket) => bucket.id === toBucketId);

        if (!fromBucket || !toBucket) {
          throw new Error('Both source and destination buckets must exist.');
        }

        if (fromBucket.isLocked || toBucket.isLocked) {
          throw new Error('One of the selected buckets is locked.');
        }

        if (fromBucket.currentBalance < amount) {
          throw new Error('Not enough funds in the source bucket.');
        }

        const updatedBuckets = state.buckets.map((bucket) => {
          if (bucket.id === fromBucketId) {
            return { ...bucket, currentBalance: bucket.currentBalance - amount };
          }

          if (bucket.id === toBucketId) {
            return { ...bucket, currentBalance: bucket.currentBalance + amount };
          }

          return bucket;
        });

        const transferTransaction: Transaction = {
          id: `transfer-${Date.now()}`,
          bucketId: fromBucketId,
          amount,
          type: 'transfer',
          date: new Date().toISOString(),
          note: `Transferred to ${toBucket.name}`,
          merchantName: 'Internal Transfer',
        };

        set({
          buckets: updatedBuckets,
          transactions: [transferTransaction, ...state.transactions],
        });
      },
      lockBucket: (bucketId, isLocked) =>
        set((state) => ({
          buckets: state.buckets.map((bucket) => (bucket.id === bucketId ? { ...bucket, isLocked } : bucket)),
        })),
      updateBucketBalance: (bucketId, delta) =>
        set((state) => ({
          buckets: state.buckets.map((bucket) => {
            if (bucket.id !== bucketId) {
              return bucket;
            }

            const nextBalance = bucket.currentBalance + delta;
            if (nextBalance < 0) {
              throw new Error('Bucket balance cannot become negative.');
            }

            return { ...bucket, currentBalance: nextBalance };
          }),
        })),
      applyRecurringDeductions: () => {
        const state = get();
        const now = new Date();
        const scheduledTransactions: Transaction[] = [];
        const updatedBuckets = state.buckets.map((bucket) => ({ ...bucket }));
        const updatedRecurringDeductions = state.recurringDeductions.map((deduction) => ({ ...deduction }));

        for (const deduction of state.recurringDeductions) {
          const bucket = updatedBuckets.find((item) => item.id === deduction.bucketId);

          if (!bucket || bucket.isLocked || new Date(deduction.nextRunDate) > now) {
            continue;
          }

          const nextBalance = bucket.currentBalance - deduction.amount;
          if (nextBalance < 0) {
            throw new Error(`Recurring deduction failed: bucket ${bucket.name} would go negative.`);
          }

          scheduledTransactions.push({
            id: `rec-${Date.now()}-${deduction.id}`,
            bucketId: deduction.bucketId,
            amount: deduction.amount,
            type: 'expense',
            date: now.toISOString(),
            note: deduction.name,
            merchantName: deduction.name,
          });

          bucket.currentBalance = nextBalance;

          const deductionIndex = updatedRecurringDeductions.findIndex((item) => item.id === deduction.id);
          if (deductionIndex >= 0) {
            const nextRunDate = new Date(deduction.nextRunDate);
            if (deduction.cadence === 'weekly') {
              nextRunDate.setDate(nextRunDate.getDate() + 7);
            } else {
              nextRunDate.setMonth(nextRunDate.getMonth() + 1);
            }

            updatedRecurringDeductions[deductionIndex] = {
              ...updatedRecurringDeductions[deductionIndex],
              nextRunDate: nextRunDate.toISOString(),
            };
          }
        }

        set({
          buckets: updatedBuckets,
          transactions: [...scheduledTransactions, ...state.transactions],
          recurringDeductions: updatedRecurringDeductions,
        });
      },
      resetMonth: (savingsBucketId) => {
        const state = get();
        const savingsBucket = state.buckets.find((bucket) => bucket.id === savingsBucketId);

        if (!savingsBucket) {
          throw new Error('Savings bucket not found.');
        }

        const { buckets, transactions } = applyMonthlyReset(state.buckets, savingsBucketId, new Date().toISOString());

        set({
          buckets,
          transactions: [...state.transactions, ...transactions],
        });

        return { buckets, transactions: [...state.transactions, ...transactions] };
      },
    }),
    {
      name: 'kongmoney-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
