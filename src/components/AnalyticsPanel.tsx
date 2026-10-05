import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import type { AppPalette, Bucket } from '../types';

interface AnalyticsPanelProps {
  buckets: Bucket[];
  palette: AppPalette;
}

export function AnalyticsPanel({ buckets, palette }: AnalyticsPanelProps) {
  const { width } = useWindowDimensions();
  const availableTotal = buckets.reduce((sum, bucket) => sum + Math.max(bucket.currentBalance, 0), 0);
  const chartWidth = Math.min(Math.max(width - 64, 260), 460);
  const chartData = useMemo(
    () =>
      buckets.map((bucket) => ({
        name: bucket.name,
        population: Math.max(bucket.currentBalance, 0),
        color: bucket.categoryColor,
        legendFontColor: palette.textMuted,
        legendFontSize: 12,
      })),
    [buckets, palette.textMuted],
  );

  return (
    <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>Monthly report</Text>
      <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>A clear view of where your available money is sitting.</Text>
      {availableTotal > 0 ? (
        <PieChart
          data={chartData}
          width={chartWidth}
          height={210}
          chartConfig={{
            backgroundColor: palette.card,
            backgroundGradientFrom: palette.card,
            backgroundGradientTo: palette.card,
            color: (opacity = 1) => `${palette.text}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="8"
          absolute
        />
      ) : (
        <View style={[styles.emptyState, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>No money to chart yet</Text>
          <Text style={[styles.emptyCopy, { color: palette.textMuted }]}>Add money to a bucket to see its distribution here.</Text>
        </View>
      )}
      <View style={styles.breakdown}>
        {buckets.map((bucket) => {
          const share = availableTotal > 0 ? Math.round((Math.max(bucket.currentBalance, 0) / availableTotal) * 100) : 0;
          return (
            <View key={bucket.id} style={styles.breakdownRow}>
              <View style={[styles.legendDot, { backgroundColor: bucket.categoryColor }]} />
              <Text numberOfLines={1} style={[styles.breakdownName, { color: palette.text }]}>{bucket.name}</Text>
              <Text style={[styles.breakdownValue, { color: palette.textMuted }]}>{share}%</Text>
            </View>
          );
        })}
      </View>
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
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  emptyState: {
    minHeight: 148,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginVertical: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyCopy: {
    marginTop: 5,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
  breakdown: {
    gap: 8,
    marginTop: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  breakdownName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '700',
  },
});
