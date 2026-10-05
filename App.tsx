import React, { useMemo, useState } from 'react';
import { BarChart3, Briefcase, Camera, Home, Plus, Receipt, type LucideIcon } from 'lucide-react-native';
import {
  Alert as NativeAlert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { AnalyticsPanel } from './src/components/AnalyticsPanel';
import { BucketIcon, normalizeBucketIcon } from './src/components/BucketIcon';
import { BucketDashboard } from './src/components/BucketDashboard';
import { parseSlipImage } from './src/services/ocrParser';
import { useKongMoneyStore } from './src/store/useKongMoneyStore';
import type { AppPalette } from './src/types';

const Alert = {
  alert(title: string, message?: string, buttons?: Parameters<typeof NativeAlert.alert>[2]) {
    if (Platform.OS === 'web') {
      const content = [title, message].filter(Boolean).join('\n\n');
      if (buttons?.length) {
        const confirmButton = buttons.find((button) => button.style !== 'cancel');
        if (window.confirm(content)) {
          confirmButton?.onPress?.();
        }
        return;
      }

      window.alert(content);
      return;
    }

    NativeAlert.alert(title, message, buttons);
  },
};

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getDaysUntil(date: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function getDueLabel(date: string): string {
  const days = getDaysUntil(date);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

type TabKey = 'dashboard' | 'scanner' | 'recurring' | 'shared' | 'analytics';

interface BucketPickerProps {
  label: string;
  buckets: { id: string; name: string; icon: string }[];
  value: string;
  onChange: (value: string) => void;
  palette: AppPalette;
}

function BucketPicker({ label, buckets, value, onChange, palette }: BucketPickerProps) {
  if (!buckets.length) {
    return (
      <View style={styles.pickerGroup}>
        <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>{label}</Text>
        <Text style={[styles.fieldHint, { color: palette.textMuted }]}>No buckets available yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.pickerGroup}>
      <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerOptions}>
        {buckets.map((bucket) => (
          <Pressable
            key={bucket.id}
            onPress={() => onChange(bucket.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === bucket.id }}
            accessibilityLabel={`Select ${bucket.name} for ${label}`}
            style={[styles.pickerOption, { backgroundColor: value === bucket.id ? palette.navActiveSoft : palette.cardSoft, borderColor: value === bucket.id ? palette.primary : palette.border }]}
          >
            <BucketIcon name={bucket.icon} size={18} color={value === bucket.id ? palette.navActive : palette.textMuted} />
            <Text style={[styles.pickerOptionText, { color: value === bucket.id ? palette.navActive : palette.text }]}>{bucket.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function App() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const isDark = colorScheme === 'dark';
  const palette: AppPalette = isDark
    ? {
        background: '#0f172a',
        card: '#111827',
        cardSoft: '#1f2937',
        border: '#334155',
        text: '#f8fafc',
        textMuted: '#cbd5e1',
        navBar: '#0b1220',
        navText: '#94a3b8',
        navActive: '#1d4ed8',
        navActiveSoft: '#1e3a8a',
        primary: '#60a5fa',
        primaryText: '#f8fafc',
        secondary: '#1f2937',
        secondaryText: '#cbd5e1',
        placeholder: '#94a3b8',
        shadow: '#020617',
        success: '#34d399',
        warning: '#fbbf24',
        danger: '#fb7185',
      }
    : {
        background: '#f4f7fb',
        card: '#ffffff',
        cardSoft: '#f8fafc',
        border: '#dfe7f1',
        text: '#0f172a',
        textMuted: '#475569',
        navBar: '#ffffff',
        navText: '#64748b',
        navActive: '#1d4ed8',
        navActiveSoft: '#dbeafe',
        primary: '#2563eb',
        primaryText: '#ffffff',
        secondary: '#eef2ff',
        secondaryText: '#1d4ed8',
        placeholder: '#94a3b8',
        shadow: '#0f172a',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
      };
  const buckets = useKongMoneyStore((state) => state.buckets);
  const transactions = useKongMoneyStore((state) => state.transactions);
  const sharedBuckets = useKongMoneyStore((state) => state.sharedBuckets);
  const recurringDeductions = useKongMoneyStore((state) => state.recurringDeductions);
  const transferFunds = useKongMoneyStore((state) => state.transferFunds);
  const addBucket = useKongMoneyStore((state) => state.addBucket);
  const updateBucket = useKongMoneyStore((state) => state.updateBucket);
  const deleteBucket = useKongMoneyStore((state) => state.deleteBucket);
  const addTransaction = useKongMoneyStore((state) => state.addTransaction);
  const updateTransaction = useKongMoneyStore((state) => state.updateTransaction);
  const deleteTransaction = useKongMoneyStore((state) => state.deleteTransaction);
  const addRecurringDeduction = useKongMoneyStore((state) => state.addRecurringDeduction);
  const updateRecurringDeduction = useKongMoneyStore((state) => state.updateRecurringDeduction);
  const removeRecurringDeduction = useKongMoneyStore((state) => state.removeRecurringDeduction);
  const addSharedBucket = useKongMoneyStore((state) => state.addSharedBucket);
  const addSharedMember = useKongMoneyStore((state) => state.addSharedMember);
  const removeSharedMember = useKongMoneyStore((state) => state.removeSharedMember);
  const updateBucketBalance = useKongMoneyStore((state) => state.updateBucketBalance);
  const applyRecurringDeductions = useKongMoneyStore((state) => state.applyRecurringDeductions);
  const resetMonth = useKongMoneyStore((state) => state.resetMonth);
  const lockBucket = useKongMoneyStore((state) => state.lockBucket);
  const getBucketAccessForUser = useKongMoneyStore((state) => state.getBucketAccessForUser);

  const totalBalance = useMemo(() => buckets.reduce((sum, bucket) => sum + bucket.currentBalance, 0), [buckets]);
  const totalBudget = useMemo(() => buckets.reduce((sum, bucket) => sum + bucket.allocatedBudget, 0), [buckets]);
  const spentThisMonth = useMemo(
    () => transactions.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0),
    [transactions],
  );
  const lockedCount = buckets.filter((bucket) => bucket.isLocked).length;
  const firstName = 'Sir';
  const isWideLayout = width >= 760;
  const budgetHealth = totalBudget > 0 ? Math.max(0, Math.round(((totalBudget - spentThisMonth) / totalBudget) * 100)) : 0;
  const spendingAlerts = useMemo(
    () => buckets
      .map((bucket) => ({
        bucket,
        spentRate: Math.max(0, ((bucket.allocatedBudget - bucket.currentBalance) / Math.max(bucket.allocatedBudget, 1)) * 100),
      }))
      .filter(({ spentRate }) => spentRate >= 50)
      .sort((a, b) => b.spentRate - a.spentRate),
    [buckets],
  );
  const upcomingBills = useMemo(
    () => recurringDeductions
      .filter((deduction) => getDaysUntil(deduction.nextRunDate) <= 7)
      .sort((a, b) => new Date(a.nextRunDate).getTime() - new Date(b.nextRunDate).getTime()),
    [recurringDeductions],
  );
  const billsDueSoon = upcomingBills.reduce((sum, deduction) => sum + deduction.amount, 0);
  const safeToSpend = Math.max(totalBalance - billsDueSoon, 0);
  const averageDailySpend = spentThisMonth / Math.max(new Date().getDate(), 1);

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [detailBucketName, setDetailBucketName] = useState('');
  const [detailBucketIcon, setDetailBucketIcon] = useState('briefcase');
  const [detailBucketBudget, setDetailBucketBudget] = useState('0');
  const [detailAllowRollover, setDetailAllowRollover] = useState(true);
  const [dragTransfer, setDragTransfer] = useState<{ fromBucketId: string; toBucketId: string } | null>(null);
  const [dragTransferAmount, setDragTransferAmount] = useState('');
  const selectedBucket = selectedBucketId ? buckets.find((bucket) => bucket.id === selectedBucketId) : undefined;
  const dragFromBucket = dragTransfer ? buckets.find((bucket) => bucket.id === dragTransfer.fromBucketId) : undefined;
  const dragToBucket = dragTransfer ? buckets.find((bucket) => bucket.id === dragTransfer.toBucketId) : undefined;

  const openBucketDetails = (bucketId: string) => {
    const bucket = buckets.find((item) => item.id === bucketId);
    if (!bucket) return;
    setSelectedBucketId(bucket.id);
    setDetailBucketName(bucket.name);
    setDetailBucketIcon(normalizeBucketIcon(bucket.icon));
    setDetailBucketBudget(String(bucket.allocatedBudget));
    setDetailAllowRollover(bucket.allowRollover);
  };

  const handleSaveBucketDetails = () => {
    if (!selectedBucket) return;
    const name = detailBucketName.trim();
    const budget = Number(detailBucketBudget);

    if (!name) {
      Alert.alert('Invalid bucket name', 'Please enter a name for this bucket.');
      return;
    }
    if (!Number.isFinite(budget) || budget <= 0) {
      Alert.alert('Invalid budget', 'Please enter a budget greater than zero.');
      return;
    }
    if (buckets.some((bucket) => bucket.id !== selectedBucket.id && bucket.name.trim().toLowerCase() === name.toLowerCase())) {
      Alert.alert('Duplicate bucket', 'Another bucket already uses this name.');
      return;
    }

    updateBucket(selectedBucket.id, {
      name,
      icon: detailBucketIcon.trim() || 'briefcase',
      allocatedBudget: budget,
      allowRollover: detailAllowRollover,
    });
    Alert.alert('Bucket updated', `${name} was saved successfully.`);
  };

  const handleDeleteBucket = () => {
    if (!selectedBucket) return;

    const bucketName = selectedBucket.name;
    Alert.alert(
      `Delete ${bucketName}?`,
      'This permanently removes the bucket, its activity history, recurring bills, and sharing settings.',
      [
        { text: 'Keep bucket', style: 'cancel' },
        {
          text: 'Delete bucket',
          style: 'destructive',
          onPress: () => {
            deleteBucket(selectedBucket.id);
            setSelectedBucketId(null);
            Alert.alert('Bucket deleted', `${bucketName} and its related records were removed.`);
          },
        },
      ],
    );
  };
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [manualBucketId, setManualBucketId] = useState('food');
  const [manualAmount, setManualAmount] = useState('100');
  const [manualMerchant, setManualMerchant] = useState('Coffee');
  const [scanResult, setScanResult] = useState<{ amount?: number; merchantName?: string; date?: string; referenceNo?: string; bucketId?: string; error?: string } | null>(null);
  const [scanBucketId, setScanBucketId] = useState('food');
  const [scanNote, setScanNote] = useState('');
  const [newBucketName, setNewBucketName] = useState('Travel');
  const [newBucketBudget, setNewBucketBudget] = useState('1500');
  const [newBucketIcon, setNewBucketIcon] = useState('plane');
  const [newRecurringBucketId, setNewRecurringBucketId] = useState('food');
  const [newRecurringName, setNewRecurringName] = useState('Spotify');
  const [newRecurringAmount, setNewRecurringAmount] = useState('149');
  const [newRecurringCadence, setNewRecurringCadence] = useState<'monthly' | 'weekly'>('monthly');
  const [newRecurringNextRunDate, setNewRecurringNextRunDate] = useState(new Date().toISOString().slice(0, 10));
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [editRecurringBucketId, setEditRecurringBucketId] = useState('food');
  const [editRecurringName, setEditRecurringName] = useState('');
  const [editRecurringAmount, setEditRecurringAmount] = useState('');
  const [editRecurringCadence, setEditRecurringCadence] = useState<'monthly' | 'weekly'>('monthly');
  const [editRecurringNextRunDate, setEditRecurringNextRunDate] = useState(new Date().toISOString().slice(0, 10));
  const [newSharedBucketId, setNewSharedBucketId] = useState('food');
  const [newSharedOwnerId, setNewSharedOwnerId] = useState('user-1');
  const [newSharedMembers, setNewSharedMembers] = useState('user-2,user-3');
  const [newSharedMemberBucketId, setNewSharedMemberBucketId] = useState('food');
  const [newSharedMemberId, setNewSharedMemberId] = useState('user-2');
  const [newSharedMemberRole, setNewSharedMemberRole] = useState<'owner' | 'member'>('member');
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const [transactionQuery, setTransactionQuery] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [transactionEditBucketId, setTransactionEditBucketId] = useState('food');
  const [transactionEditAmount, setTransactionEditAmount] = useState('');
  const [transactionEditMerchant, setTransactionEditMerchant] = useState('');
  const [transactionEditNote, setTransactionEditNote] = useState('');

  const navigateToTab = (tab: TabKey) => {
    setSelectedBucketId(null);
    setActiveTab(tab);
  };

  const filteredTransactions = useMemo(() => {
    const query = transactionQuery.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const bucketName = buckets.find((bucket) => bucket.id === transaction.bucketId)?.name ?? '';
      const matchesFilter = transactionFilter === 'all' || transaction.type === transactionFilter;
      const matchesQuery = !query || [transaction.merchantName, transaction.note, bucketName, transaction.amount.toString()]
        .some((value) => value.toLowerCase().includes(query));
      return matchesFilter && matchesQuery;
    });
  }, [buckets, transactionFilter, transactionQuery, transactions]);

  const editingTransaction = editingTransactionId ? transactions.find((transaction) => transaction.id === editingTransactionId) : undefined;

  const openTransactionEditor = (transactionId: string) => {
    const transaction = transactions.find((item) => item.id === transactionId);
    if (!transaction) return;
    if (transaction.type === 'transfer') {
      Alert.alert('Transfer locked', 'Transfers stay in the record for accuracy. Create an offsetting transfer if you need to correct one.');
      return;
    }
    setEditingTransactionId(transaction.id);
    setTransactionEditBucketId(transaction.bucketId);
    setTransactionEditAmount(String(transaction.amount));
    setTransactionEditMerchant(transaction.merchantName);
    setTransactionEditNote(transaction.note);
  };

  const handleSaveTransaction = () => {
    if (!editingTransaction) return;
    const amount = Number(transactionEditAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter an amount greater than zero.');
      return;
    }
    if (!transactionEditMerchant.trim()) {
      Alert.alert('Merchant required', 'Add a merchant or description to this transaction.');
      return;
    }

    try {
      updateTransaction(editingTransaction.id, {
        bucketId: transactionEditBucketId,
        amount,
        merchantName: transactionEditMerchant.trim(),
        note: transactionEditNote.trim() || 'No note',
      });
      setEditingTransactionId(null);
      Alert.alert('Transaction updated', 'Your bucket balance was updated to match.');
    } catch (error) {
      Alert.alert('Unable to update transaction', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleDeleteTransaction = () => {
    if (!editingTransaction) return;
    const transactionId = editingTransaction.id;
    Alert.alert('Delete transaction?', 'This will permanently remove the transaction and restore its effect on the bucket balance.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          try {
            deleteTransaction(transactionId);
            setEditingTransactionId(null);
            Alert.alert('Transaction deleted', 'The related bucket balance was updated.');
          } catch (error) {
            Alert.alert('Unable to delete transaction', error instanceof Error ? error.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  const handleQuickAdd = (action: 'expense' | 'scanner') => {
    setQuickAddVisible(false);
    if (action === 'expense') {
      setManualEntryVisible(true);
    } else {
      navigateToTab(action);
    }
  };

  const handleToggleLock = (bucketId: string, nextState: boolean) => {
    if (nextState) {
      Alert.alert('Lock bucket', 'This will prevent deductions and transfers from this bucket. Continue?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Lock', style: 'destructive', onPress: () => lockBucket(bucketId, true) },
      ]);
      return;
    }

    lockBucket(bucketId, false);
  };

  const handleAddBucket = () => {
    const trimmedName = newBucketName.trim();
    const budget = Number(newBucketBudget);

    if (!trimmedName) {
      Alert.alert('Invalid bucket', 'Please enter a bucket name.');
      return;
    }

    if (!Number.isFinite(budget) || budget <= 0) {
      Alert.alert('Invalid budget', 'Please enter a valid budget amount.');
      return;
    }

    const bucketId = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (buckets.some((bucket) => bucket.id === bucketId)) {
      Alert.alert('Duplicate bucket', 'A bucket with this name already exists.');
      return;
    }

    addBucket({
      id: bucketId,
      name: trimmedName,
      icon: newBucketIcon || 'briefcase',
      allocatedBudget: budget,
      currentBalance: budget,
      categoryColor: '#6366F1',
      isLocked: false,
      allowRollover: true,
    });

    setNewBucketName('');
    setNewBucketBudget('');
    setNewBucketIcon('briefcase');
    Alert.alert('Bucket added', `${trimmedName} was added successfully.`);
  };

  const handleAddRecurringDeduction = () => {
    const amount = Number(newRecurringAmount);
    const bucket = buckets.find((item) => item.id === newRecurringBucketId);
    const nextRunDate = new Date(`${newRecurringNextRunDate}T09:00:00.000Z`);

    if (!bucket) {
      Alert.alert('Invalid bucket', 'Please choose a valid bucket.');
      return;
    }

    if (!newRecurringName.trim()) {
      Alert.alert('Invalid deduction', 'Please provide a deduction name.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid deduction amount.');
      return;
    }

    if (Number.isNaN(nextRunDate.getTime())) {
      Alert.alert('Invalid date', 'Use the YYYY-MM-DD format for the next run date.');
      return;
    }

    addRecurringDeduction({
      id: `rec-${Date.now()}`,
      bucketId: bucket.id,
      name: newRecurringName.trim(),
      amount,
      cadence: newRecurringCadence,
      nextRunDate: nextRunDate.toISOString(),
    });

    setNewRecurringName('');
    setNewRecurringAmount('');
    setNewRecurringCadence('monthly');
    setNewRecurringNextRunDate(new Date().toISOString().slice(0, 10));
    Alert.alert('Recurring deduction added', 'The recurrence was saved.');
  };

  const handleRemoveRecurringDeduction = (deductionId: string) => {
    const deduction = recurringDeductions.find((item) => item.id === deductionId);
    if (!deduction) return;
    Alert.alert('Remove recurring bill?', `${deduction.name} will no longer be processed automatically.`, [
      { text: 'Keep bill', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeRecurringDeduction(deductionId) },
    ]);
  };

  const openRecurringEditor = (deductionId: string) => {
    const deduction = recurringDeductions.find((item) => item.id === deductionId);
    if (!deduction) return;
    setEditingRecurringId(deduction.id);
    setEditRecurringBucketId(deduction.bucketId);
    setEditRecurringName(deduction.name);
    setEditRecurringAmount(String(deduction.amount));
    setEditRecurringCadence(deduction.cadence);
    setEditRecurringNextRunDate(new Date(deduction.nextRunDate).toISOString().slice(0, 10));
  };

  const handleSaveRecurringEdit = () => {
    if (!editingRecurringId) return;
    const amount = Number(editRecurringAmount);
    const nextRunDate = new Date(`${editRecurringNextRunDate}T09:00:00.000Z`);

    if (!editRecurringName.trim()) {
      Alert.alert('Invalid bill name', 'Please provide a name for this recurring bill.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter an amount greater than zero.');
      return;
    }
    if (!buckets.some((bucket) => bucket.id === editRecurringBucketId)) {
      Alert.alert('Invalid bucket', 'Please choose an existing bucket.');
      return;
    }
    if (Number.isNaN(nextRunDate.getTime())) {
      Alert.alert('Invalid date', 'Use the YYYY-MM-DD format for the next run date.');
      return;
    }

    updateRecurringDeduction(editingRecurringId, {
      bucketId: editRecurringBucketId,
      name: editRecurringName.trim(),
      amount,
      cadence: editRecurringCadence,
      nextRunDate: nextRunDate.toISOString(),
    });
    setEditingRecurringId(null);
    Alert.alert('Recurring bill updated', 'The new schedule will be used for future deductions.');
  };

  const handleAddSharedBucket = () => {
    const bucket = buckets.find((item) => item.id === newSharedBucketId);
    if (!bucket) {
      Alert.alert('Invalid bucket', 'Please choose an existing bucket to share.');
      return;
    }

    if (!newSharedOwnerId.trim()) {
      Alert.alert('Invalid owner', 'Please enter the owner user ID.');
      return;
    }

    const sharedMemberIds = newSharedMembers
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => item !== newSharedOwnerId.trim());

    addSharedBucket(bucket.id, newSharedOwnerId.trim(), sharedMemberIds);

    setNewSharedMemberBucketId(bucket.id);
    setNewSharedMembers('');
    Alert.alert('Shared bucket created', 'The bucket is now shareable.');
  };

  const handleAddSharedMember = () => {
    if (!newSharedMemberBucketId.trim() || !newSharedMemberId.trim()) {
      Alert.alert('Invalid member', 'Please provide a bucket and member ID.');
      return;
    }

    const bucket = sharedBuckets.find((item) => item.bucketId === newSharedMemberBucketId);
    if (!bucket) {
      Alert.alert('Shared bucket missing', 'Create the shared bucket first.');
      return;
    }

    addSharedMember(newSharedMemberBucketId, newSharedMemberId.trim(), newSharedMemberRole);
    setNewSharedMemberId('');
    Alert.alert('Member added', `${newSharedMemberId.trim()} was added to the shared bucket.`);
  };

  const handleRemoveSharedMember = (bucketId: string, userId: string) => {
    removeSharedMember(bucketId, userId);
  };

  const openDragTransferPrompt = (fromBucketId: string, toBucketId: string) => {
    setDragTransfer({ fromBucketId, toBucketId });
    setDragTransferAmount('');
  };

  const handleConfirmDragTransfer = () => {
    if (!dragTransfer) return;
    try {
      transferFunds({
        ...dragTransfer,
        amount: Number(dragTransferAmount),
      });
      setDragTransfer(null);
      setDragTransferAmount('');
      Alert.alert('Success', 'Transfer completed.');
    } catch (error) {
      Alert.alert('Transfer failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleScan = async () => {
    try {
      const parsed = await parseSlipImage('mock-image-uri');
      setScanResult(parsed);
      setScanBucketId(parsed.bucketId ?? 'food');
      setScanNote(parsed.merchantName ?? '');
      setScanModalVisible(true);
    } catch (error) {
      Alert.alert('Scan failed', error instanceof Error ? error.message : 'Unable to parse slip.');
    }
  };

  const handleAddManualExpense = () => {
    const amount = Number(manualAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }

    const sourceBucket = buckets.find((bucket) => bucket.id === manualBucketId);
    if (!sourceBucket) {
      Alert.alert('Invalid bucket', 'Please select a valid bucket.');
      return;
    }

    if (sourceBucket.isLocked) {
      Alert.alert('Locked bucket', 'This bucket is locked. Unlock it first.');
      return;
    }

    if (sourceBucket.currentBalance < amount) {
      Alert.alert('Insufficient funds', 'This bucket does not have enough balance for this expense.');
      return;
    }

    updateBucketBalance(manualBucketId, -amount);
    addTransaction({
      id: `manual-${Date.now()}`,
      bucketId: manualBucketId,
      amount,
      type: 'expense',
      date: new Date().toISOString(),
      note: 'Manual entry',
      merchantName: manualMerchant,
    });
    setManualAmount('');
    setManualMerchant('');
    setManualEntryVisible(false);
    Alert.alert('Expense added', 'Manual transaction saved successfully.');
  };

  const handleApplyRecurring = () => {
    try {
      applyRecurringDeductions();
      Alert.alert('Recurring deductions processed', 'Scheduled deductions were applied.');
    } catch (error) {
      Alert.alert('Recurring deduction error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleResetMonth = () => {
    try {
      const result = resetMonth('savings');
      Alert.alert('Month reset', `Reset completed with ${result.transactions.length} rollover transaction(s).`);
    } catch (error) {
      Alert.alert('Reset failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleConfirmScan = () => {
    if (!scanResult?.amount || !scanBucketId) {
      Alert.alert('Scan incomplete', 'The scan result is missing required details.');
      return;
    }

    const bucket = buckets.find((item) => item.id === scanBucketId);
    if (!bucket) {
      Alert.alert('Unknown bucket', 'The selected bucket does not exist.');
      return;
    }

    if (bucket.isLocked) {
      Alert.alert('Locked bucket', 'This bucket is locked; unlock it first.');
      return;
    }

    if (bucket.currentBalance < scanResult.amount) {
      Alert.alert('Insufficient funds', 'This bucket does not have enough available balance.');
      return;
    }

    updateBucketBalance(scanBucketId, -scanResult.amount);
    addTransaction({
      id: `scan-${Date.now()}`,
      bucketId: scanBucketId,
      amount: scanResult.amount,
      type: 'expense',
      date: scanResult.date ?? new Date().toISOString(),
      note: scanNote || `OCR scan: ${scanResult.referenceNo ?? 'No reference'}`,
      merchantName: scanResult.merchantName ?? 'Unknown Merchant',
    });

    setScanModalVisible(false);
    Alert.alert('Scan accepted', 'Deduction added to the selected bucket.');
  };

  const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
    { key: 'dashboard', label: 'Home', icon: Home },
    { key: 'scanner', label: 'Scan', icon: Camera },
    { key: 'recurring', label: 'Bills', icon: Receipt },
    { key: 'analytics', label: 'Reports', icon: BarChart3 },
  ];
  const tabIntro: Partial<Record<TabKey, { eyebrow: string; title: string; description: string }>> = {
    scanner: { eyebrow: 'SMART CAPTURE', title: 'Capture an expense', description: 'Review every scanned detail before it affects your balance.' },
    recurring: { eyebrow: 'UPCOMING BILLS', title: 'Plan for recurring costs', description: 'Save routine payments and process them when they are due.' },
    shared: { eyebrow: 'COLLABORATION', title: 'Share a plan securely', description: 'Choose exactly which bucket a trusted person can view.' },
    analytics: { eyebrow: 'INSIGHTS', title: 'See the bigger picture', description: 'Understand how your available money is distributed.' },
  };

  const renderBucketDetail = () => {
    if (!selectedBucket) return null;
    const bucketTransactions = transactions.filter((transaction) => transaction.bucketId === selectedBucket.id).slice(0, 6);
    const remainingRate = Math.max((selectedBucket.currentBalance / Math.max(selectedBucket.allocatedBudget, 1)) * 100, 0);

    return (
      <>
        <Pressable
          onPress={() => setSelectedBucketId(null)}
          accessibilityRole="button"
          accessibilityLabel="Back to all buckets"
          style={styles.backButton}
        >
          <Text style={[styles.backButtonText, { color: palette.primary }]}>‹  All buckets</Text>
        </Pressable>

        <View style={[styles.detailHero, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
          <View style={styles.detailHeroTop}>
            <View style={[styles.detailIcon, { backgroundColor: `${selectedBucket.categoryColor}20` }]}>
              <BucketIcon name={selectedBucket.icon} size={28} color={selectedBucket.categoryColor} />
            </View>
            <View style={styles.detailHeroCopy}>
              <Text style={[styles.detailEyebrow, { color: palette.textMuted }]}>BUCKET DETAILS</Text>
              <Text style={[styles.detailTitle, { color: palette.text }]}>{selectedBucket.name}</Text>
              <Text style={[styles.detailBalance, { color: palette.textMuted }]}>{formatCurrency(selectedBucket.currentBalance)} available</Text>
            </View>
            <Pressable
              onPress={() => handleToggleLock(selectedBucket.id, !selectedBucket.isLocked)}
              accessibilityRole="button"
              accessibilityLabel={`${selectedBucket.isLocked ? 'Unlock' : 'Lock'} ${selectedBucket.name} bucket`}
              style={[styles.detailLockButton, { backgroundColor: selectedBucket.isLocked ? `${palette.danger}18` : palette.cardSoft }]}
            >
              <Text style={[styles.detailLockText, { color: selectedBucket.isLocked ? palette.danger : palette.textMuted }]}>{selectedBucket.isLocked ? 'Locked' : 'Lock'}</Text>
            </Pressable>
          </View>
          <View style={[styles.detailProgressTrack, { backgroundColor: palette.border }]}>
            <View style={[styles.progressFill, { width: `${Math.min(remainingRate, 100)}%`, backgroundColor: selectedBucket.categoryColor }]} />
          </View>
          <View style={styles.detailStatsRow}>
            <View>
              <Text style={[styles.detailStatLabel, { color: palette.textMuted }]}>Budget</Text>
              <Text style={[styles.detailStatValue, { color: palette.text }]}>{formatCurrency(selectedBucket.allocatedBudget)}</Text>
            </View>
            <View>
              <Text style={[styles.detailStatLabel, { color: palette.textMuted }]}>Remaining</Text>
              <Text style={[styles.detailStatValue, { color: palette.text }]}>{remainingRate.toFixed(0)}%</Text>
            </View>
            <View>
              <Text style={[styles.detailStatLabel, { color: palette.textMuted }]}>Rollover</Text>
              <Text style={[styles.detailStatValue, { color: palette.text }]}>{selectedBucket.allowRollover ? 'On' : 'Off'}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Edit bucket</Text>
          <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Update how this plan appears and how much it can hold.</Text>
          <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
            value={detailBucketName}
            onChangeText={setDetailBucketName}
            placeholder="Bucket name"
            placeholderTextColor={palette.placeholder}
          />
          <View style={styles.detailEditRow}>
            <View style={styles.detailIconField}>
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Icon</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={detailBucketIcon}
                onChangeText={setDetailBucketIcon}
                placeholder="briefcase"
                placeholderTextColor={palette.placeholder}
              />
            </View>
            <View style={styles.detailBudgetField}>
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Budget</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={detailBucketBudget}
                onChangeText={setDetailBucketBudget}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={palette.placeholder}
              />
            </View>
          </View>
          <View style={[styles.preferenceRow, { borderColor: palette.border }]}>
            <View style={styles.preferenceCopy}>
              <Text style={[styles.preferenceTitle, { color: palette.text }]}>Allow rollover</Text>
              <Text style={[styles.preferenceDescription, { color: palette.textMuted }]}>Move unused money into the next month.</Text>
            </View>
            <Pressable
              onPress={() => setDetailAllowRollover((value) => !value)}
              accessibilityRole="switch"
              accessibilityState={{ checked: detailAllowRollover }}
              style={[styles.toggle, { backgroundColor: detailAllowRollover ? palette.primary : palette.border }]}
            >
              <View style={[styles.toggleThumb, detailAllowRollover && styles.toggleThumbOn]} />
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleSaveBucketDetails}>
            <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Save changes</Text>
          </Pressable>
        </View>

        <View style={[styles.dangerZone, { backgroundColor: `${palette.danger}0d`, borderColor: `${palette.danger}35` }]}>
          <View style={styles.preferenceCopy}>
            <Text style={[styles.preferenceTitle, { color: palette.danger }]}>Delete this bucket</Text>
            <Text style={[styles.preferenceDescription, { color: palette.textMuted }]}>This cannot be undone. Related activity, bills, and sharing settings will also be removed.</Text>
          </View>
          <Pressable
            onPress={handleDeleteBucket}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${selectedBucket.name} bucket`}
            style={[styles.deleteBucketButton, { borderColor: palette.danger }]}
          >
            <Text style={[styles.deleteBucketText, { color: palette.danger }]}>Delete</Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent activity</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Only activity from this bucket</Text>
            </View>
          </View>
          {bucketTransactions.length > 0 ? bucketTransactions.map((transaction) => (
            <View key={transaction.id} style={[styles.transactionItem, { borderColor: palette.border }]}>
              <View style={[styles.transactionIcon, { backgroundColor: `${selectedBucket.categoryColor}18` }]}>
                <Text>{transaction.type === 'income' ? '↗' : transaction.type === 'transfer' ? '↔' : '−'}</Text>
              </View>
              <View style={styles.transactionCopy}>
                <Text style={[styles.transactionMerchant, { color: palette.text }]}>{transaction.merchantName}</Text>
                <Text style={[styles.transactionNote, { color: palette.textMuted }]}>{transaction.note} · {formatShortDate(transaction.date)}</Text>
              </View>
              <Text style={[styles.transactionAmount, { color: transaction.type === 'income' ? palette.success : palette.text }]}>{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</Text>
            </View>
          )) : (
            <Text style={[styles.fieldHint, { color: palette.textMuted }]}>No activity in this bucket yet.</Text>
          )}
        </View>
      </>
    );
  };

  const renderTabContent = () => {
    if (selectedBucketId) return renderBucketDetail();

    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <View style={styles.greetingRow}>
              <View>
                <Text style={[styles.eyebrow, { color: palette.primary }]}>PERSONAL FINANCE</Text>
                <Text style={[styles.greeting, { color: palette.text }]}>{getGreeting()}, {firstName}</Text>
                <Text style={[styles.greetingSubtitle, { color: palette.textMuted }]}>Here is your money snapshot for today.</Text>
              </View>
              <View style={[styles.avatar, { backgroundColor: palette.navActiveSoft }]}>
                <Text style={[styles.avatarText, { color: palette.navActive }]}>L</Text>
              </View>
            </View>

            <View style={[styles.balanceCard, { backgroundColor: palette.primary, shadowColor: palette.primary }]}>
              <View style={styles.balanceCardTop}>
                <View>
                  <Text style={styles.balanceLabel}>TOTAL AVAILABLE</Text>
                  <Text style={styles.balanceValue}>{formatCurrency(totalBalance)}</Text>
                </View>
                <View style={styles.onTrackPill}>
                  <Text style={styles.onTrackText}>{budgetHealth >= 50 ? '● On track' : '● Review budget'}</Text>
                </View>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceStats}>
                <View>
                  <Text style={styles.balanceStatLabel}>Planned budget</Text>
                  <Text style={styles.balanceStatValue}>{formatCurrency(totalBudget)}</Text>
                </View>
                <View>
                  <Text style={styles.balanceStatLabel}>Spent this month</Text>
                  <Text style={styles.balanceStatValue}>{formatCurrency(spentThisMonth)}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.moneyGuide, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Money guide</Text>
                  <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>A quick read on what is comfortable to spend.</Text>
                </View>
                <Text style={[styles.guideStatus, { color: budgetHealth >= 50 ? palette.success : palette.warning }]}>{budgetHealth >= 50 ? 'Healthy' : 'Review'}</Text>
              </View>
              <View style={styles.guideMetrics}>
                <View style={styles.guideMetric}>
                  <Text style={[styles.guideLabel, { color: palette.textMuted }]}>Safe to spend</Text>
                  <Text style={[styles.guideValue, { color: palette.text }]}>{formatCurrency(safeToSpend)}</Text>
                  <Text style={[styles.guideHint, { color: palette.textMuted }]}>after bills due soon</Text>
                </View>
                <View style={[styles.guideMetric, styles.guideMetricDivider, { borderLeftColor: palette.border }]}>
                  <Text style={[styles.guideLabel, { color: palette.textMuted }]}>Daily spending</Text>
                  <Text style={[styles.guideValue, { color: palette.text }]}>{formatCurrency(averageDailySpend)}</Text>
                  <Text style={[styles.guideHint, { color: palette.textMuted }]}>average this month</Text>
                </View>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Spending alerts</Text>
                  <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>We will flag buckets once they are half used.</Text>
                </View>
                <Text style={[styles.alertCount, { color: spendingAlerts.length ? palette.warning : palette.success }]}>{spendingAlerts.length ? `${spendingAlerts.length} to review` : 'All clear'}</Text>
              </View>
              {spendingAlerts.length ? spendingAlerts.slice(0, 3).map(({ bucket, spentRate }) => {
                const severity = spentRate >= 100 ? palette.danger : spentRate >= 80 ? palette.warning : palette.primary;
                const message = spentRate >= 100 ? 'Budget fully used' : spentRate >= 80 ? 'Nearly at your limit' : 'More than half used';
                return (
                  <Pressable key={bucket.id} onPress={() => openBucketDetails(bucket.id)} style={[styles.alertRow, { backgroundColor: `${severity}12` }]}>
                    <View style={styles.alertIcon}><BucketIcon name={bucket.icon} size={20} color={severity} /></View>
                    <View style={styles.alertCopy}>
                      <Text style={[styles.alertTitle, { color: palette.text }]}>{bucket.name} · {message}</Text>
                      <Text style={[styles.alertDescription, { color: palette.textMuted }]}>{Math.min(spentRate, 100).toFixed(0)}% used · {formatCurrency(bucket.currentBalance)} left</Text>
                    </View>
                    <Text style={[styles.alertChevron, { color: severity }]}>›</Text>
                  </Pressable>
                );
              }) : (
                <View style={[styles.inlineEmptyState, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                  <Text style={[styles.inlineEmptyTitle, { color: palette.text }]}>Your buckets look healthy</Text>
                  <Text style={[styles.inlineEmptyCopy, { color: palette.textMuted }]}>Alerts will show here as a bucket reaches 50%, 80%, or 100% spent.</Text>
                </View>
              )}
            </View>

            <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Upcoming bills</Text>
                  <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Due in the next seven days.</Text>
                </View>
                <Pressable onPress={() => navigateToTab('recurring')} accessibilityRole="button">
                  <Text style={[styles.viewAllText, { color: palette.primary }]}>Manage</Text>
                </Pressable>
              </View>
              {upcomingBills.length ? upcomingBills.slice(0, 3).map((deduction) => {
                const billBucket = buckets.find((bucket) => bucket.id === deduction.bucketId);
                const dueSoon = getDaysUntil(deduction.nextRunDate) <= 1;
                return (
                  <View key={deduction.id} style={[styles.billRow, { borderColor: palette.border }]}>
                    <View style={[styles.billIcon, { backgroundColor: `${billBucket?.categoryColor ?? palette.primary}18` }]}><BucketIcon name={billBucket?.icon ?? 'briefcase'} size={18} color={billBucket?.categoryColor ?? palette.primary} /></View>
                    <View style={styles.transactionCopy}>
                      <Text style={[styles.transactionMerchant, { color: palette.text }]}>{deduction.name}</Text>
                      <Text style={[styles.transactionNote, { color: dueSoon ? palette.warning : palette.textMuted }]}>{getDueLabel(deduction.nextRunDate)} · {billBucket?.name ?? deduction.bucketId}</Text>
                    </View>
                    <Text style={[styles.transactionAmount, { color: palette.text }]}>{formatCurrency(deduction.amount)}</Text>
                  </View>
                );
              }) : (
                <Text style={[styles.fieldHint, { color: palette.textMuted }]}>Nothing is due in the next seven days.</Text>
              )}
            </View>

            <View style={styles.quickActionsHeader}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Quick actions</Text>
              <Text style={[styles.quickActionsHint, { color: palette.textMuted }]}>{lockedCount} locked</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActions}>
              {[
                { icon: Plus, label: 'Add expense', action: 'expense' as const, color: '#F97364' },
                { icon: Camera, label: 'Scan slip', action: 'scanner' as const, color: '#0EA5A4' },
                { icon: BarChart3, label: 'View report', action: 'analytics' as const, color: '#E19A2B' },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Pressable
                    key={action.label}
                    onPress={() => action.action === 'expense' ? setManualEntryVisible(true) : navigateToTab(action.action)}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    style={[styles.quickAction, { backgroundColor: palette.card, borderColor: palette.border }]}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}18` }]}>
                      <Icon size={19} color={action.color} strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.quickActionLabel, { color: palette.text }]}>{action.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <BucketDashboard
              buckets={buckets}
              onToggleLock={handleToggleLock}
              onSelectBucket={openBucketDetails}
              onTransfer={openDragTransferPrompt}
              palette={palette}
            />

            <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent activity</Text>
                  <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Your latest money movements</Text>
                </View>
                <Pressable onPress={() => navigateToTab('analytics')}>
                  <Text style={[styles.viewAllText, { color: palette.primary }]}>View all</Text>
                </Pressable>
              </View>
              {transactions.slice(0, 5).map((transaction) => {
                const bucket = buckets.find((item) => item.id === transaction.bucketId);
                const isIncome = transaction.type === 'income';
                return (
                  <View key={transaction.id} style={[styles.transactionItem, { borderColor: palette.border }]}>
                    <View style={[styles.transactionIcon, { backgroundColor: `${bucket?.categoryColor ?? palette.primary}18` }]}>
                      <BucketIcon name={bucket?.icon ?? 'briefcase'} size={18} color={bucket?.categoryColor ?? palette.primary} />
                    </View>
                    <View style={styles.transactionCopy}>
                      <Text style={[styles.transactionMerchant, { color: palette.text }]}>{transaction.merchantName}</Text>
                      <Text style={[styles.transactionNote, { color: palette.textMuted }]}>{transaction.note} · {formatShortDate(transaction.date)}</Text>
                    </View>
                    <Text style={[styles.transactionAmount, { color: isIncome ? palette.success : palette.text }]}>{isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}</Text>
                  </View>
                );
              })}
            </View>

            <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={handleResetMonth}>
              <Text style={[styles.secondaryButtonText, { color: palette.secondaryText }]}>↻  Run month reset</Text>
            </Pressable>
          </>
        );
      case 'scanner':
        return (
          <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
            <View style={[styles.scannerIllustration, { backgroundColor: palette.navActiveSoft }]}>
              <Camera size={28} color={palette.primary} strokeWidth={2} />
            </View>
            <Text style={[styles.scannerTitle, { color: palette.text }]}>Turn a slip into an expense</Text>
            <Text style={[styles.scannerCopy, { color: palette.textMuted }]}>We will read the merchant and amount, then let you check the bucket before anything is saved.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Scan a payment slip" style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleScan}>
              <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Scan a slip</Text>
            </Pressable>
            <Text style={[styles.privacyHint, { color: palette.textMuted }]}>Your receipt details stay on this device.</Text>
          </View>
        );
      case 'recurring':
        return (
          <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Recurring Deductions</Text>
            <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Stay ahead of subscriptions and bills</Text>
            <Text style={[styles.formHeading, { color: palette.text }]}>Add a bill</Text>
            <BucketPicker label="Charge this bucket" buckets={buckets} value={newRecurringBucketId} onChange={setNewRecurringBucketId} palette={palette} />
            <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Bill name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={newRecurringName}
              onChangeText={setNewRecurringName}
              placeholder="Deduction name"
              placeholderTextColor={palette.placeholder}
            />
            <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={newRecurringAmount}
              onChangeText={setNewRecurringAmount}
              placeholder="Amount"
              keyboardType="numeric"
              placeholderTextColor={palette.placeholder}
            />
              <View style={styles.row}>
                <View style={styles.dateField}>
                  <Text style={[styles.inputLabel, { color: palette.textMuted }]}>First charge date</Text>
                <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={newRecurringNextRunDate}
                onChangeText={setNewRecurringNextRunDate}
                placeholder="Next run date"
                placeholderTextColor={palette.placeholder}
              />
                </View>
                <View style={styles.cadencePicker}>
                  <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Repeats</Text>
                  <View style={styles.cadenceOptions}>
                  {(['monthly', 'weekly'] as const).map((cadence) => (
                    <Pressable key={cadence} onPress={() => setNewRecurringCadence(cadence)} style={[styles.cadenceOption, { backgroundColor: newRecurringCadence === cadence ? palette.navActiveSoft : palette.cardSoft }]}>
                      <Text style={{ color: newRecurringCadence === cadence ? palette.navActive : palette.textMuted, fontSize: 12, fontWeight: '700' }}>{cadence === 'monthly' ? 'Monthly' : 'Weekly'}</Text>
                    </Pressable>
                  ))}
                  </View>
                </View>
            </View>
            <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleAddRecurringDeduction}>
              <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Add Recurring Deduction</Text>
            </Pressable>

            {recurringDeductions.length > 0 && (
              <View style={styles.listContainer}>
                {recurringDeductions.map((deduction) => (
                  <View key={deduction.id} style={[styles.listItem, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                    <View style={styles.listTextWrap}>
                      <Text style={[styles.listTitle, { color: palette.text }]}>{deduction.name}</Text>
                      <Text style={[styles.listMeta, { color: palette.textMuted }]}>{buckets.find((bucket) => bucket.id === deduction.bucketId)?.name ?? deduction.bucketId} • {deduction.cadence}</Text>
                      <Text style={[styles.listMeta, { color: palette.textMuted }]}>Next run: {new Date(deduction.nextRunDate).toLocaleDateString()}</Text>
                      <Text style={[styles.listMeta, { color: palette.textMuted }]}>Amount: {formatCurrency(deduction.amount)}</Text>
                    </View>
                    <View style={styles.listActions}>
                      <Pressable onPress={() => openRecurringEditor(deduction.id)} accessibilityRole="button" accessibilityLabel={`Edit ${deduction.name}`} style={[styles.editButton, { backgroundColor: palette.navActiveSoft }]}>
                        <Text style={[styles.editButtonText, { color: palette.navActive }]}>Edit</Text>
                      </Pressable>
                      <Pressable onPress={() => handleRemoveRecurringDeduction(deduction.id)} accessibilityRole="button" accessibilityLabel={`Remove ${deduction.name}`} style={[styles.deleteButton, { backgroundColor: `${palette.danger}18` }]}>
                        <Text style={[styles.deleteButtonText, { color: palette.danger }]}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={handleApplyRecurring}>
              <Text style={[styles.secondaryButtonText, { color: palette.secondaryText }]}>Run Scheduled Deductions</Text>
            </Pressable>
          </View>
        );
      case 'shared':
        return (
          <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Shared Buckets</Text>
            <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Give trusted people visibility into a plan. Member IDs stay private to this device.</Text>
            <Text style={[styles.formHeading, { color: palette.text }]}>Share a bucket</Text>
            <BucketPicker label="Bucket to share" buckets={buckets} value={newSharedBucketId} onChange={setNewSharedBucketId} palette={palette} />
            <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Owner ID</Text>
            <TextInput
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={newSharedOwnerId}
              onChangeText={setNewSharedOwnerId}
              placeholder="Owner user id"
              placeholderTextColor={palette.placeholder}
            />
            <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Invite members</Text>
            <TextInput
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={newSharedMembers}
              onChangeText={setNewSharedMembers}
              placeholder="Shared users (comma separated)"
              placeholderTextColor={palette.placeholder}
            />
            <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleAddSharedBucket}>
              <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Create Shared Bucket</Text>
            </Pressable>

            {sharedBuckets.length > 0 ? (
              <View style={styles.listContainer}>
                {sharedBuckets.map((bucket) => (
                  <View key={bucket.bucketId} style={[styles.listItem, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                    <View style={styles.listTextWrap}>
                      <Text style={[styles.listTitle, { color: palette.text }]}>{buckets.find((item) => item.id === bucket.bucketId)?.name ?? bucket.bucketId}</Text>
                      <Text style={[styles.listMeta, { color: palette.textMuted }]}>Owner: {bucket.ownerId}</Text>
                      {bucket.sharedWithUserIds.length > 0 ? (
                        <View style={styles.memberList}>
                          {bucket.sharedWithUserIds.map((userId) => (
                            <View key={userId} style={[styles.memberPill, { borderColor: palette.border, backgroundColor: palette.card }]}>
                              <Text style={[styles.memberName, { color: palette.text }]}>{userId}</Text>
                              <Text style={[styles.memberRole, { color: palette.textMuted }]}>{bucket.memberRoles?.[userId] ?? 'member'}</Text>
                              <Pressable onPress={() => handleRemoveSharedMember(bucket.bucketId, userId)} accessibilityRole="button" accessibilityLabel={`Remove ${userId} from this bucket`} hitSlop={8}>
                                <Text style={[styles.memberRemove, { color: palette.danger }]}>Remove</Text>
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={[styles.listMeta, { color: palette.textMuted }]}>No members invited yet.</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.inlineEmptyState, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                <Text style={[styles.inlineEmptyTitle, { color: palette.text }]}>No shared buckets</Text>
                <Text style={[styles.inlineEmptyCopy, { color: palette.textMuted }]}>Choose a bucket and invite people when you are ready.</Text>
              </View>
            )}

            {sharedBuckets.length > 0 && (
              <>
                <Text style={[styles.formHeading, { color: palette.text }]}>Manage members</Text>
                <BucketPicker label="Add member to" buckets={buckets.filter((bucket) => sharedBuckets.some((shared) => shared.bucketId === bucket.id))} value={newSharedMemberBucketId} onChange={setNewSharedMemberBucketId} palette={palette} />
                <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Member ID</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                  value={newSharedMemberId}
                  onChangeText={setNewSharedMemberId}
                  placeholder="Member user id"
                  placeholderTextColor={palette.placeholder}
                />
                <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Role</Text>
                <View style={styles.rolePicker}>
                  {(['member', 'owner'] as const).map((role) => (
                    <Pressable
                      key={role}
                      onPress={() => setNewSharedMemberRole(role)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: newSharedMemberRole === role }}
                      style={[styles.roleOption, { backgroundColor: newSharedMemberRole === role ? palette.navActiveSoft : palette.cardSoft, borderColor: newSharedMemberRole === role ? palette.primary : palette.border }]}
                    >
                      <Text style={[styles.roleOptionText, { color: newSharedMemberRole === role ? palette.navActive : palette.textMuted }]}>{role === 'owner' ? 'Owner' : 'Member'}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={handleAddSharedMember}>
                  <Text style={[styles.secondaryButtonText, { color: palette.secondaryText }]}>Add Shared Member</Text>
                </Pressable>
              </>
            )}
          </View>
        );
      case 'analytics':
        return (
          <>
            <AnalyticsPanel buckets={buckets} palette={palette} />
            <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>All activity</Text>
                  <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Search, filter, or correct an expense or income entry.</Text>
                </View>
                <Text style={[styles.activityCount, { color: palette.textMuted }]}>{filteredTransactions.length}</Text>
              </View>
              <TextInput
                style={[styles.searchInput, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={transactionQuery}
                onChangeText={setTransactionQuery}
                placeholder="Search merchant, note, bucket, or amount"
                placeholderTextColor={palette.placeholder}
                accessibilityLabel="Search transactions"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptions}>
                {(['all', 'expense', 'income', 'transfer'] as const).map((filter) => (
                  <Pressable
                    key={filter}
                    onPress={() => setTransactionFilter(filter)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: transactionFilter === filter }}
                    style={[styles.filterOption, { backgroundColor: transactionFilter === filter ? palette.navActiveSoft : palette.cardSoft, borderColor: transactionFilter === filter ? palette.primary : palette.border }]}
                  >
                    <Text style={[styles.filterOptionText, { color: transactionFilter === filter ? palette.navActive : palette.textMuted }]}>{filter === 'all' ? 'All' : `${filter[0].toUpperCase()}${filter.slice(1)}s`}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.historyList}>
                {filteredTransactions.length ? filteredTransactions.map((transaction) => {
                  const bucket = buckets.find((item) => item.id === transaction.bucketId);
                  const isIncome = transaction.type === 'income';
                  const isTransfer = transaction.type === 'transfer';
                  return (
                    <Pressable
                      key={transaction.id}
                      onPress={() => openTransactionEditor(transaction.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${isTransfer ? 'View' : 'Edit'} ${transaction.merchantName} transaction`}
                      style={[styles.historyItem, { borderColor: palette.border }]}
                    >
                      <View style={[styles.transactionIcon, { backgroundColor: `${bucket?.categoryColor ?? palette.primary}18` }]}>
                        <BucketIcon name={bucket?.icon ?? 'briefcase'} size={18} color={bucket?.categoryColor ?? palette.primary} />
                      </View>
                      <View style={styles.transactionCopy}>
                        <Text style={[styles.transactionMerchant, { color: palette.text }]}>{transaction.merchantName}</Text>
                        <Text style={[styles.transactionNote, { color: palette.textMuted }]}>{bucket?.name ?? 'Deleted bucket'} · {transaction.note} · {formatShortDate(transaction.date)}</Text>
                      </View>
                      <View style={styles.historyAmountWrap}>
                        <Text style={[styles.transactionAmount, { color: isIncome ? palette.success : palette.text }]}>{isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}</Text>
                        <Text style={[styles.historyAction, { color: isTransfer ? palette.textMuted : palette.primary }]}>{isTransfer ? 'Locked' : 'Edit'}</Text>
                      </View>
                    </Pressable>
                  );
                }) : (
                  <View style={[styles.inlineEmptyState, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                    <Text style={[styles.inlineEmptyTitle, { color: palette.text }]}>No matching activity</Text>
                    <Text style={[styles.inlineEmptyCopy, { color: palette.textMuted }]}>Try a different keyword or transaction type.</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Create a bucket</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Give every spending goal a home, so your available balance stays meaningful.</Text>
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Bucket name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={newBucketName}
                onChangeText={setNewBucketName}
                placeholder="Bucket name"
                placeholderTextColor={palette.placeholder}
              />
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Icon</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={newBucketIcon}
                onChangeText={setNewBucketIcon}
                placeholder="Bucket icon"
                placeholderTextColor={palette.placeholder}
              />
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Starting budget</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={newBucketBudget}
                onChangeText={setNewBucketBudget}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={palette.placeholder}
              />
              <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleAddBucket}>
                <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Add Bucket</Text>
              </Pressable>
            </View>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }] }>
      <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.border }] }>
        <View style={styles.brandLockup}>
          <View style={[styles.brandMark, { backgroundColor: palette.primary }]}>
            <Text style={styles.brandMarkText}>K</Text>
          </View>
          <Text style={[styles.title, { color: palette.text }]}>KongMoney</Text>
        </View>
        <Pressable style={[styles.headerAction, { backgroundColor: palette.cardSoft }]} onPress={() => navigateToTab('analytics')}>
          <Text style={{ color: palette.text, fontSize: 16 }}>⋯</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.contentArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentFrame, isWideLayout && styles.contentFrameWide]}>
            {tabIntro[activeTab] && (
              <View style={styles.pageIntro}>
                <Text style={[styles.eyebrow, { color: palette.primary }]}>{tabIntro[activeTab].eyebrow}</Text>
                <Text style={[styles.pageTitle, { color: palette.text }]}>{tabIntro[activeTab].title}</Text>
                <Text style={[styles.pageDescription, { color: palette.textMuted }]}>{tabIntro[activeTab].description}</Text>
              </View>
            )}
            {renderTabContent()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Pressable
        onPress={() => setQuickAddVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Add money activity"
        style={[styles.floatingAddButton, { backgroundColor: palette.primary, shadowColor: palette.shadow }]}
      >
        <Plus size={18} color={palette.primaryText} strokeWidth={2.4} />
        <Text style={styles.floatingAddText}>Add</Text>
      </Pressable>

      <View style={[styles.navBar, { backgroundColor: palette.navBar, borderTopColor: palette.border }] }>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Pressable
              key={tab.key}
              onPress={() => navigateToTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab.key }}
              accessibilityLabel={`${tab.label} tab`}
              style={[
                styles.navItem,
                activeTab === tab.key && [styles.navItemActive, { backgroundColor: palette.navActiveSoft }],
              ]}
            >
              <Icon size={19} color={activeTab === tab.key ? palette.navActive : palette.navText} strokeWidth={2} />
              <Text style={[styles.navText, { color: activeTab === tab.key ? palette.navActive : palette.navText }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Modal transparent visible={manualEntryVisible} animationType="fade" onRequestClose={() => setManualEntryVisible(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(15, 23, 42, 0.45)' }]}>
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Add expense</Text>
            <BucketPicker label="Bucket" buckets={buckets} value={manualBucketId} onChange={setManualBucketId} palette={palette} />
            <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Amount</Text>
            <TextInput
              autoFocus
              accessibilityLabel="Expense amount"
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={manualAmount}
              onChangeText={setManualAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={palette.placeholder}
            />
            <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Merchant or description</Text>
            <TextInput
              accessibilityLabel="Merchant or description"
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={manualMerchant}
              onChangeText={setManualMerchant}
              placeholder="Merchant"
              placeholderTextColor={palette.placeholder}
            />
            <Pressable accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleAddManualExpense}>
              <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Add expense</Text>
            </Pressable>
            <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={() => setManualEntryVisible(false)}>
              <Text style={[styles.secondaryButtonText, { color: palette.secondaryText }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={Boolean(dragTransfer)} animationType="fade" onRequestClose={() => setDragTransfer(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(15, 23, 42, 0.45)' }]}>
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Transfer amount</Text>
            <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>
              {dragFromBucket?.name} to {dragToBucket?.name}
            </Text>
            <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Amount</Text>
            <TextInput
              autoFocus
              accessibilityLabel="Transfer amount"
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={dragTransferAmount}
              onChangeText={setDragTransferAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={palette.placeholder}
            />
            <Pressable accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleConfirmDragTransfer}>
              <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Transfer funds</Text>
            </Pressable>
            <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={() => setDragTransfer(null)}>
              <Text style={[styles.secondaryButtonText, { color: palette.secondaryText }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={scanModalVisible} animationType="slide">
        <View style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(15, 23, 42, 0.45)' }]}>
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Scan Confirmation</Text>
            {scanResult?.error ? (
              <Text style={styles.errorText}>{scanResult.error}</Text>
            ) : (
              <>
                <Text style={{ color: palette.text }}>Merchant: {scanResult?.merchantName}</Text>
                <Text style={{ color: palette.text }}>Amount: {scanResult?.amount ? formatCurrency(scanResult.amount) : '--'}</Text>
                <Text style={{ color: palette.text }}>Date: {scanResult?.date ?? '--'}</Text>
                <Text style={{ color: palette.text }}>Reference: {scanResult?.referenceNo ?? '--'}</Text>
                <BucketPicker label="Charge this bucket" buckets={buckets} value={scanBucketId} onChange={setScanBucketId} palette={palette} />
                <TextInput
                  style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                  value={scanNote}
                  onChangeText={setScanNote}
                  placeholder="Override note"
                  placeholderTextColor={palette.placeholder}
                />
              </>
            )}
            <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleConfirmScan}>
              <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Confirm Deduction</Text>
            </Pressable>
            <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={() => setScanModalVisible(false)}>
              <Text style={[styles.secondaryButtonText, { color: palette.secondaryText }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={Boolean(editingRecurringId)} animationType="slide" onRequestClose={() => setEditingRecurringId(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(15, 23, 42, 0.45)' }]}>
          <ScrollView contentContainerStyle={styles.editorModalScroll} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Edit recurring bill</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Update the next charge without changing past deductions.</Text>
              <BucketPicker label="Charge this bucket" buckets={buckets} value={editRecurringBucketId} onChange={setEditRecurringBucketId} palette={palette} />
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Bill name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={editRecurringName}
                onChangeText={setEditRecurringName}
                placeholder="Bill name"
                placeholderTextColor={palette.placeholder}
              />
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Amount</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={editRecurringAmount}
                onChangeText={setEditRecurringAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={palette.placeholder}
              />
              <View style={styles.row}>
                <View style={styles.dateField}>
                  <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Next charge date</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                    value={editRecurringNextRunDate}
                    onChangeText={setEditRecurringNextRunDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={palette.placeholder}
                  />
                </View>
                <View style={styles.cadencePicker}>
                  <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Repeats</Text>
                  <View style={styles.cadenceOptions}>
                    {(['monthly', 'weekly'] as const).map((cadence) => (
                      <Pressable key={cadence} onPress={() => setEditRecurringCadence(cadence)} style={[styles.cadenceOption, { backgroundColor: editRecurringCadence === cadence ? palette.navActiveSoft : palette.cardSoft }]}>
                        <Text style={{ color: editRecurringCadence === cadence ? palette.navActive : palette.textMuted, fontSize: 12, fontWeight: '700' }}>{cadence === 'monthly' ? 'Monthly' : 'Weekly'}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleSaveRecurringEdit}>
                <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Save bill</Text>
              </Pressable>
              <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={() => setEditingRecurringId(null)}>
                <Text style={[styles.secondaryButtonText, { color: palette.secondaryText }]}>Cancel</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal transparent visible={quickAddVisible} animationType="fade" onRequestClose={() => setQuickAddVisible(false)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(15, 23, 42, 0.45)' }]} onPress={() => setQuickAddVisible(false)}>
          <Pressable style={[styles.quickAddCard, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Add activity</Text>
            <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Choose the quickest way to keep your money up to date.</Text>
            {[
              { icon: Plus, title: 'Expense', copy: 'Record a purchase manually', action: 'expense' as const, color: '#F97364' },
              { icon: Camera, title: 'Scan a slip', copy: 'Capture receipt details', action: 'scanner' as const, color: '#0EA5A4' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Pressable key={action.title} onPress={() => handleQuickAdd(action.action)} style={[styles.quickAddOption, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}>
                  <View style={[styles.quickAddOptionIcon, { backgroundColor: `${action.color}18` }]}><Icon size={19} color={action.color} strokeWidth={2.2} /></View>
                  <View style={styles.transactionCopy}>
                    <Text style={[styles.transactionMerchant, { color: palette.text }]}>{action.title}</Text>
                    <Text style={[styles.transactionNote, { color: palette.textMuted }]}>{action.copy}</Text>
                  </View>
                  <Text style={[styles.alertChevron, { color: palette.textMuted }]}>›</Text>
                </Pressable>
              );
            })}
            <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={() => setQuickAddVisible(false)}>
              <Text style={[styles.secondaryButtonText, { color: palette.secondaryText }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={Boolean(editingTransactionId)} animationType="slide" onRequestClose={() => setEditingTransactionId(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.72)' : 'rgba(15, 23, 42, 0.45)' }]}>
          <ScrollView contentContainerStyle={styles.editorModalScroll} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Edit transaction</Text>
              <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>Changes automatically update the bucket balance.</Text>
              <BucketPicker label="Category bucket" buckets={buckets} value={transactionEditBucketId} onChange={setTransactionEditBucketId} palette={palette} />
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Amount</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={transactionEditAmount}
                onChangeText={setTransactionEditAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={palette.placeholder}
              />
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Merchant or description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={transactionEditMerchant}
                onChangeText={setTransactionEditMerchant}
                placeholder="Merchant"
                placeholderTextColor={palette.placeholder}
              />
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>Note</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={transactionEditNote}
                onChangeText={setTransactionEditNote}
                placeholder="Optional note"
                placeholderTextColor={palette.placeholder}
                multiline
              />
              <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleSaveTransaction}>
                <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Save transaction</Text>
              </Pressable>
              <Pressable style={[styles.modalDeleteButton, { borderColor: palette.danger }]} onPress={handleDeleteTransaction}>
                <Text style={[styles.deleteBucketText, { color: palette.danger }]}>Delete transaction</Text>
              </Pressable>
              <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={() => setEditingTransactionId(null)}>
                <Text style={[styles.secondaryButtonText, { color: palette.secondaryText }]}>Cancel</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f4f0',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
    flexGrow: 1,
  },
  contentArea: {
    flex: 1,
  },
  contentFrame: {
    width: '100%',
    alignSelf: 'center',
  },
  contentFrameWide: {
    maxWidth: 680,
  },
  pageIntro: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  pageDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
  headerAction: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: '#fff',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  formHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 1,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  greetingSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
  },
  balanceCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 22,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  balanceCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 7,
  },
  onTrackPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  onTrackText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  balanceDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical: 17,
  },
  balanceStats: {
    flexDirection: 'row',
    gap: 36,
  },
  balanceStatLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11,
  },
  balanceStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  quickActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  quickActionsHint: {
    fontSize: 12,
  },
  quickActions: {
    gap: 10,
    paddingBottom: 20,
  },
  quickAction: {
    width: 104,
    borderWidth: 1,
    borderRadius: 16,
    padding: 11,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  quickActionIconText: {
    fontSize: 20,
    fontWeight: '600',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  navItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: '#dbeafe',
  },
  navText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  navTextActive: {
    color: '#1d4ed8',
  },
  flexInput: {
    flex: 1,
  },
  listContainer: {
    marginTop: 12,
  },
  listItem: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  listActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  listTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  listMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 12,
  },
  editButton: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  editButtonText: {
    fontWeight: '700',
    fontSize: 12,
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
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  pickerGroup: {
    marginTop: 14,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 13,
    marginBottom: 7,
  },
  availableHint: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: -1,
  },
  pickerOptions: {
    gap: 8,
    paddingBottom: 5,
  },
  pickerOption: {
    minWidth: 84,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pickerIcon: {
    fontSize: 15,
  },
  pickerOptionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cadencePicker: {
    flex: 1,
  },
  dateField: {
    flex: 1.15,
  },
  cadenceOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cadenceOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 13,
  },
  input: {
    borderColor: '#d9d9d9',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#1f6feb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#1f6feb',
    fontWeight: '700',
  },
  transactionItem: {
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  transactionCopy: {
    flex: 1,
  },
  transactionMerchant: {
    fontWeight: '700',
    fontSize: 13,
  },
  transactionNote: {
    marginTop: 4,
    fontSize: 11,
  },
  transactionAmount: {
    fontWeight: '800',
    fontSize: 13,
    marginLeft: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 14,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 12,
  },
  scannerIllustration: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  scannerIcon: {
    fontSize: 28,
    color: '#2563eb',
  },
  scannerTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  scannerCopy: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  privacyHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
  inlineEmptyState: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  inlineEmptyTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  inlineEmptyCopy: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  rolePicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  memberList: {
    gap: 6,
    marginTop: 9,
  },
  memberPill: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  memberRole: {
    fontSize: 11,
    marginRight: 9,
  },
  memberRemove: {
    fontSize: 11,
    fontWeight: '800',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  detailHero: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  detailHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailIconText: {
    fontSize: 26,
  },
  detailHeroCopy: {
    flex: 1,
  },
  detailEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  detailTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginTop: 2,
  },
  detailBalance: {
    fontSize: 12,
    marginTop: 3,
  },
  detailLockButton: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailLockText: {
    fontSize: 11,
    fontWeight: '800',
  },
  detailProgressTrack: {
    height: 9,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 18,
  },
  detailStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  detailStatLabel: {
    fontSize: 11,
  },
  detailStatValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },
  detailEditRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailIconField: {
    width: 88,
  },
  detailBudgetField: {
    flex: 1,
  },
  preferenceRow: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceCopy: {
    flex: 1,
    paddingRight: 14,
  },
  preferenceTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  preferenceDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  toggle: {
    width: 45,
    height: 26,
    borderRadius: 999,
    padding: 3,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#fff',
    transform: [{ translateX: 0 }],
  },
  toggleThumbOn: {
    transform: [{ translateX: 19 }],
  },
  dangerZone: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBucketButton: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  deleteBucketText: {
    fontSize: 12,
    fontWeight: '800',
  },
  moneyGuide: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  guideStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
  guideMetrics: {
    flexDirection: 'row',
  },
  guideMetric: {
    flex: 1,
  },
  guideMetricDivider: {
    borderLeftWidth: 1,
    paddingLeft: 14,
  },
  guideLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  guideValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  guideHint: {
    fontSize: 10,
    marginTop: 3,
  },
  alertCount: {
    fontSize: 11,
    fontWeight: '800',
  },
  alertRow: {
    borderRadius: 12,
    padding: 11,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 19,
    marginRight: 9,
  },
  alertCopy: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  alertDescription: {
    fontSize: 11,
    marginTop: 3,
  },
  alertChevron: {
    fontSize: 21,
    fontWeight: '500',
    marginLeft: 8,
  },
  billRow: {
    borderBottomWidth: 1,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  billIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityCount: {
    fontSize: 12,
    fontWeight: '800',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
  },
  filterOptions: {
    gap: 7,
    paddingVertical: 11,
  },
  filterOption: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterOptionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  historyList: {
    marginTop: 1,
  },
  historyItem: {
    borderTopWidth: 1,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyAmountWrap: {
    alignItems: 'flex-end',
  },
  historyAction: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  floatingAddButton: {
    position: 'absolute',
    right: 18,
    bottom: 84,
    zIndex: 10,
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  floatingAddIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '500',
    marginRight: 5,
  },
  floatingAddText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  quickAddCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  quickAddOption: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickAddOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  editorModalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  multilineInput: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  modalDeleteButton: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    marginTop: 10,
  },
});
