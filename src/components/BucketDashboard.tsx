import React from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { BucketIcon } from './BucketIcon';
import type { AppPalette, Bucket } from '../types';

interface BucketDashboardProps {
  buckets: Bucket[];
  onToggleLock: (bucketId: string, nextState: boolean) => void;
  onSelectBucket: (bucketId: string) => void;
  onTransfer: (fromBucketId: string, toBucketId: string) => void;
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

export function BucketDashboard({ buckets, onToggleLock, onSelectBucket, onTransfer, palette }: BucketDashboardProps) {
  const bucketRefs = React.useRef(new Map<string, View>());
  const dragArmedBucketId = React.useRef<string | null>(null);
  const [draggingBucketId, setDraggingBucketId] = React.useState<string | null>(null);
  const totalBalance = buckets.reduce((total, bucket) => total + bucket.currentBalance, 0);
  const totalBudget = buckets.reduce((total, bucket) => total + bucket.allocatedBudget, 0);

  const finishDrag = (fromBucketId: string, x: number, y: number) => {
    setDraggingBucketId(null);
    const measurements = buckets.map((bucket) => new Promise<{ bucketId: string; x: number; y: number; width: number; height: number } | null>((resolve) => {
      const ref = bucketRefs.current.get(bucket.id);
      if (!ref) {
        resolve(null);
        return;
      }
      ref.measureInWindow((left, top, width, height) => resolve({ bucketId: bucket.id, x: left, y: top, width, height }));
    }));

    void Promise.all(measurements).then((positions) => {
      const destination = positions.find((position) =>
        position && position.bucketId !== fromBucketId && x >= position.x && x <= position.x + position.width && y >= position.y && y <= position.y + position.height,
      );
      if (destination) onTransfer(fromBucketId, destination.bucketId);
    });
  };

  return (
    <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Your buckets</Text>
          <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Hold and drag a bucket to another to start a transfer.</Text>
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
          <Pressable
            key={bucket.id}
            ref={(ref) => {
              if (ref) bucketRefs.current.set(bucket.id, ref);
              else bucketRefs.current.delete(bucket.id);
            }}
            onPress={() => {
              if (dragArmedBucketId.current === bucket.id) {
                dragArmedBucketId.current = null;
                setDraggingBucketId(null);
                return;
              }
              onSelectBucket(bucket.id);
            }}
            delayLongPress={250}
            onLongPress={() => {
              if (!bucket.isLocked) {
                dragArmedBucketId.current = bucket.id;
                setDraggingBucketId(bucket.id);
              }
            }}
            {...PanResponder.create({
              onMoveShouldSetPanResponder: (_, gesture) => dragArmedBucketId.current === bucket.id && (Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8),
              onPanResponderGrant: () => setDraggingBucketId(bucket.id),
              onPanResponderRelease: (_, gesture) => finishDrag(bucket.id, gesture.moveX, gesture.moveY),
              onPanResponderTerminate: () => {
                dragArmedBucketId.current = null;
                setDraggingBucketId(null);
              },
            }).panHandlers}
            accessibilityRole="button"
            accessibilityLabel={`Open ${bucket.name} bucket details`}
            accessibilityHint="Drop onto another bucket to choose a transfer amount"
            style={[styles.bucketCard, { backgroundColor: palette.cardSoft, borderColor: draggingBucketId && draggingBucketId !== bucket.id ? palette.primary : palette.border, opacity: draggingBucketId === bucket.id ? 0.65 : 1 }]}
          >
            <View style={styles.bucketHeader}>
              <View style={[styles.bucketIconWrap, { backgroundColor: `${bucket.categoryColor}20` }]}>
                <BucketIcon name={bucket.icon} size={20} color={bucket.categoryColor} />
              </View>
              <View style={styles.bucketMeta}>
                <Text style={[styles.bucketName, { color: palette.text }]}>{bucket.name}</Text>
                <Text style={[styles.balanceText, { color: palette.textMuted }]}>
                  {formatCurrency(bucket.currentBalance)} / {formatCurrency(bucket.allocatedBudget)}
                </Text>
              </View>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onToggleLock(bucket.id, !bucket.isLocked);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${bucket.isLocked ? 'Unlock' : 'Lock'} ${bucket.name} bucket`}
                accessibilityHint={bucket.isLocked ? 'Allows deductions and transfers again' : 'Prevents deductions and transfers'}
                style={[styles.lockButton, { backgroundColor: bucket.isLocked ? `${palette.danger}18` : palette.card }, bucket.isLocked && styles.lockButtonActive]}
              >
                <Text style={[styles.lockButtonText, { color: bucket.isLocked ? palette.danger : palette.textMuted }]}>
                  {bucket.isLocked ? 'Locked' : 'Lock'}
                </Text>
              </Pressable>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: bucket.categoryColor }]} />
            </View>

            <View style={styles.bucketFooter}>
              <Text style={[styles.statusPill, { backgroundColor: bucket.isLocked ? `${palette.danger}18` : `${status.color}20`, color: bucket.isLocked ? palette.danger : status.color }]}>
                {bucket.isLocked ? 'Protected' : status.label}
              </Text>
              <Text style={[styles.remainingText, { color: palette.textMuted }]}>{Math.max(remainingRate, 0).toFixed(0)}% remaining</Text>
            </View>
            <Text style={[styles.editHint, { color: palette.primary }]}>View details and edit ›</Text>
          </Pressable>
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
    minWidth: 52,
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
    fontSize: 11,
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
  editHint: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 9,
    textAlign: 'right',
  },
});
