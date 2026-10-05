import React from 'react';
import { Briefcase, Car, Plane, PiggyBank, Utensils, type LucideIcon } from 'lucide-react-native';
import { Text } from 'react-native';

const bucketIcons: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  car: Car,
  plane: Plane,
  'piggy-bank': PiggyBank,
  utensils: Utensils,
  '💼': Briefcase,
  '🚗': Car,
  '✈️': Plane,
  '💰': PiggyBank,
  '🍽️': Utensils,
};

interface BucketIconProps {
  name: string;
  size?: number;
  color?: string;
}

export function BucketIcon({ name, size = 20, color = '#334155' }: BucketIconProps) {
  const Icon = bucketIcons[name];
  if (Icon) return <Icon size={size} color={color} strokeWidth={2} />;
  return <Text style={{ fontSize: size, color }}>{name}</Text>;
}

export function normalizeBucketIcon(name: string): string {
  const legacyNames: Record<string, string> = {
    '💼': 'briefcase',
    '🚗': 'car',
    '✈️': 'plane',
    '💰': 'piggy-bank',
    '🍽️': 'utensils',
  };
  return legacyNames[name] ?? name;
}