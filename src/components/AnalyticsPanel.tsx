import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import type { Bucket } from '../types';

const screenWidth = Dimensions.get('window').width;

interface AnalyticsPanelProps {
  buckets: Bucket[];
}

export function AnalyticsPanel({ buckets }: AnalyticsPanelProps) {
  const chartData = useMemo(
    () =>
      buckets.map((bucket) => ({
        name: bucket.name,
        population: Math.max(bucket.currentBalance, 0),
        color: bucket.categoryColor,
        legendFontColor: '#333',
        legendFontSize: 12,
      })),
    [buckets],
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Monthly Report</Text>
      <PieChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          color: (opacity = 1) => `rgba(0,0,0, ${opacity})`,
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
});
