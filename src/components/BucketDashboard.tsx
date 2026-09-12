import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Bucket } from '../types';

interface BucketDashboardProps {
  buckets: Bucket[];
  onToggleLock: (bucketId: string, nextState: boolean) => void;
}

function getProgressStatus(remainingRate: number): { label: string; color: string } {
  if (remainingRate > 50) {
    return { label: 'Healthy', color: '#4CAF50' };
  }

  if (remainingRate >= 20) {
    return { label: 'Watchlist', color: '#FFB300' };
  }

  return { label: 'Critical', color: '#F44336' };
}

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function BucketDashboard({ buckets, onToggleLock }: BucketDashboardProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Bucket Dashboard</Text>
      {buckets.map((bucket) => {
        const progress = Math.min((bucket.currentBalance / bucket.allocatedBudget) * 100, 100);
        const remainingRate = Math.max(((bucket.allocatedBudget - bucket.currentBalance) / bucket.allocatedBudget) * 100, 0);
        const status = getProgressStatus(remainingRate);

        return (
          <View key={bucket.id} style={[styles.bucketCard, { borderColor: bucket.categoryColor }]}>
            <View style={styles.bucketHeader}>
              <Text style={styles.bucketIcon}>{bucket.icon}</Text>
              <View style={styles.bucketMeta}>
                <Text style={styles.bucketName}>{bucket.name}</Text>
                <Text style={styles.balanceText}>
                  {formatCurrency(bucket.currentBalance)} / {formatCurrency(bucket.allocatedBudget)}
                </Text>
              </View>
              <Pressable
                onPress={() => onToggleLock(bucket.id, !bucket.isLocked)}
                style={[styles.lockButton, bucket.isLocked && styles.lockButtonActive]}
              >
                <Text style={styles.lockButtonText}>{bucket.isLocked ? 'Locked' : 'Unlocked'}</Text>
              </Pressable>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: bucket.categoryColor }]} />
            </View>

            <View style={styles.bucketFooter}>
              <Text style={[styles.statusPill, { backgroundColor: `${status.color}20`, color: status.color }]}>
                {status.label}
              </Text>
              <Text style={styles.remainingText}>{Math.max(remainingRate, 0).toFixed(0)}% left</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  bucketCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bucketIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  bucketMeta: {
    flex: 1,
  },
  bucketName: {
    fontSize: 18,
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 13,
    color: '#666',
  },
  lockButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#e6e6e6',
  },
  lockButtonActive: {
    backgroundColor: '#f8d7da',
  },
  lockButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#e6e6e6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  bucketFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: '700',
    fontSize: 12,
  },
  remainingText: {
    fontSize: 12,
    color: '#666',
  },
});
