import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppPalette, Bucket } from '../types';

interface BucketDashboardProps {
  buckets: Bucket[];
  onToggleLock: (bucketId: string, nextState: boolean) => void;
  palette: AppPalette;
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

export function BucketDashboard({ buckets, onToggleLock, palette }: BucketDashboardProps) {
  const totalBalance = buckets.reduce((total, bucket) => total + bucket.currentBalance, 0);
  const totalBudget = buckets.reduce((total, bucket) => total + bucket.allocatedBudget, 0);

  return (
    <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Your buckets</Text>
          <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Keep every plan on track</Text>
        </View>
        <View style={[styles.totalPill, { backgroundColor: palette.cardSoft }]}>
          <Text style={[styles.totalPillLabel, { color: palette.textMuted }]}>Available</Text>
          <Text style={[styles.totalPillValue, { color: palette.text }]}>{formatCurrency(totalBalance)}</Text>
        </View>
      </View>
      {buckets.map((bucket) => {
        const progress = Math.min((bucket.currentBalance / Math.max(bucket.allocatedBudget, 1)) * 100, 100);
        const remainingRate = Math.max((bucket.currentBalance / Math.max(bucket.allocatedBudget, 1)) * 100, 0);
        const status = getProgressStatus(remainingRate);

        return (
          <View key={bucket.id} style={[styles.bucketCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
            <View style={styles.bucketHeader}>
              <View style={[styles.bucketIconWrap, { backgroundColor: `${bucket.categoryColor}20` }]}>
                <Text style={styles.bucketIcon}>{bucket.icon}</Text>
              </View>
              <View style={styles.bucketMeta}>
                <Text style={[styles.bucketName, { color: palette.text }]}>{bucket.name}</Text>
                <Text style={[styles.balanceText, { color: palette.textMuted }]}>
                  {formatCurrency(bucket.currentBalance)} / {formatCurrency(bucket.allocatedBudget)}
                </Text>
              </View>
              <Pressable
                onPress={() => onToggleLock(bucket.id, !bucket.isLocked)}
                style={[styles.lockButton, { backgroundColor: bucket.isLocked ? `${palette.danger}18` : palette.card }, bucket.isLocked && styles.lockButtonActive]}
              >
                <Text style={[styles.lockButtonText, { color: bucket.isLocked ? palette.danger : palette.textMuted }]}>
                  {bucket.isLocked ? '🔒' : '🔓'}
                </Text>
              </Pressable>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: bucket.categoryColor }]} />
            </View>

            <View style={styles.bucketFooter}>
              <Text style={[styles.statusPill, { backgroundColor: `${status.color}20`, color: status.color }]}>
                {status.label}
              </Text>
              <Text style={[styles.remainingText, { color: palette.textMuted }]}>{Math.max(remainingRate, 0).toFixed(0)}% remaining</Text>
            </View>
          </View>
        );
      })}
      <Text style={[styles.budgetFootnote, { color: palette.textMuted }]}>Total planned budget: {formatCurrency(totalBudget)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  totalPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'flex-end',
  },
  totalPillLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  totalPillValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  bucketCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bucketIcon: {
    fontSize: 20,
  },
  bucketIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
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
  },
  budgetFootnote: {
    fontSize: 12,
    marginTop: 2,
  },
});
