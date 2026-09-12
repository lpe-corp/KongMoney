import type { Bucket, Transaction } from '../types';

export function applyMonthlyReset(
  buckets: Bucket[],
  savingsBucketId: string,
  monthLabel: string,
): { buckets: Bucket[]; transactions: Transaction[] } {
  const updatedBuckets = buckets.map((bucket) => {
    if (bucket.id === savingsBucketId) {
      return bucket;
    }

    if (bucket.allowRollover) {
      return {
        ...bucket,
        currentBalance: bucket.currentBalance,
      };
    }

    return {
      ...bucket,
      currentBalance: 0,
    };
  });

  const transactions: Transaction[] = [];

  for (const bucket of buckets) {
    if (bucket.id === savingsBucketId || bucket.allowRollover) {
      continue;
    }

    const rolloverAmount = Math.max(bucket.currentBalance, 0);
    if (rolloverAmount > 0) {
      transactions.push({
        id: `reset-${monthLabel}-${bucket.id}`,
        bucketId: savingsBucketId,
        amount: rolloverAmount,
        type: 'income',
        date: new Date().toISOString(),
        note: `Monthly leftover transfer from ${bucket.name}`,
        merchantName: 'Savings Transfer',
      });
    }
  }

  const savingsBucketIndex = updatedBuckets.findIndex((bucket) => bucket.id === savingsBucketId);
  if (savingsBucketIndex >= 0) {
    const savingsBucket = updatedBuckets[savingsBucketIndex];
    const totalTransferred = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    updatedBuckets[savingsBucketIndex] = {
      ...savingsBucket,
      currentBalance: savingsBucket.currentBalance + totalTransferred,
    };
  }

  return { buckets: updatedBuckets, transactions };
}
