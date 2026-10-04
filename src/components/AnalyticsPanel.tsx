import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import type { AppPalette, Bucket } from '../types';

const screenWidth = Dimensions.get('window').width;

interface AnalyticsPanelProps {
  buckets: Bucket[];
  palette: AppPalette;
}

export function AnalyticsPanel({ buckets, palette }: AnalyticsPanelProps) {
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
      <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Where your available money is sitting</Text>
      <PieChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          backgroundColor: palette.card,
          backgroundGradientFrom: palette.card,
          backgroundGradientTo: palette.card,
          color: (opacity = 1) => `${palette.text}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
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
    marginBottom: 4,
  },
});
