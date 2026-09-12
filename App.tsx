import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { AnalyticsPanel } from './src/components/AnalyticsPanel';
import { BucketDashboard } from './src/components/BucketDashboard';
import { parseSlipImage } from './src/services/ocrParser';
import { useKongMoneyStore } from './src/store/useKongMoneyStore';

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

type TabKey = 'dashboard' | 'transfer' | 'scanner' | 'recurring' | 'shared' | 'analytics';

export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const palette = isDark
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
      };
  const buckets = useKongMoneyStore((state) => state.buckets);
  const transactions = useKongMoneyStore((state) => state.transactions);
  const sharedBuckets = useKongMoneyStore((state) => state.sharedBuckets);
  const recurringDeductions = useKongMoneyStore((state) => state.recurringDeductions);
  const transferFunds = useKongMoneyStore((state) => state.transferFunds);
  const addBucket = useKongMoneyStore((state) => state.addBucket);
  const addTransaction = useKongMoneyStore((state) => state.addTransaction);
  const addRecurringDeduction = useKongMoneyStore((state) => state.addRecurringDeduction);
  const removeRecurringDeduction = useKongMoneyStore((state) => state.removeRecurringDeduction);
  const addSharedBucket = useKongMoneyStore((state) => state.addSharedBucket);
  const addSharedMember = useKongMoneyStore((state) => state.addSharedMember);
  const removeSharedMember = useKongMoneyStore((state) => state.removeSharedMember);
  const updateBucketBalance = useKongMoneyStore((state) => state.updateBucketBalance);
  const applyRecurringDeductions = useKongMoneyStore((state) => state.applyRecurringDeductions);
  const resetMonth = useKongMoneyStore((state) => state.resetMonth);
  const lockBucket = useKongMoneyStore((state) => state.lockBucket);
  const getBucketAccessForUser = useKongMoneyStore((state) => state.getBucketAccessForUser);

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [selectedFrom, setSelectedFrom] = useState('food');
  const [selectedTo, setSelectedTo] = useState('savings');
  const [transferAmount, setTransferAmount] = useState('100');
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [manualBucketId, setManualBucketId] = useState('food');
  const [manualAmount, setManualAmount] = useState('100');
  const [manualMerchant, setManualMerchant] = useState('Coffee');
  const [scanResult, setScanResult] = useState<{ amount?: number; merchantName?: string; date?: string; referenceNo?: string; bucketId?: string; error?: string } | null>(null);
  const [scanBucketId, setScanBucketId] = useState('food');
  const [scanNote, setScanNote] = useState('');
  const [newBucketName, setNewBucketName] = useState('Travel');
  const [newBucketBudget, setNewBucketBudget] = useState('1500');
  const [newBucketIcon, setNewBucketIcon] = useState('✈️');
  const [newRecurringBucketId, setNewRecurringBucketId] = useState('food');
  const [newRecurringName, setNewRecurringName] = useState('Spotify');
  const [newRecurringAmount, setNewRecurringAmount] = useState('149');
  const [newRecurringCadence, setNewRecurringCadence] = useState<'monthly' | 'weekly'>('monthly');
  const [newRecurringNextRunDate, setNewRecurringNextRunDate] = useState(new Date().toISOString().slice(0, 10));
  const [newSharedBucketId, setNewSharedBucketId] = useState('food');
  const [newSharedOwnerId, setNewSharedOwnerId] = useState('user-1');
  const [newSharedMembers, setNewSharedMembers] = useState('user-2,user-3');
  const [newSharedMemberBucketId, setNewSharedMemberBucketId] = useState('food');
  const [newSharedMemberId, setNewSharedMemberId] = useState('user-2');
  const [newSharedMemberRole, setNewSharedMemberRole] = useState<'owner' | 'member'>('member');

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
      icon: newBucketIcon || '💼',
      allocatedBudget: budget,
      currentBalance: budget,
      categoryColor: '#6366F1',
      isLocked: false,
      allowRollover: true,
    });

    setNewBucketName('');
    setNewBucketBudget('');
    setNewBucketIcon('💼');
    Alert.alert('Bucket added', `${trimmedName} was added successfully.`);
  };

  const handleAddRecurringDeduction = () => {
    const amount = Number(newRecurringAmount);
    const bucket = buckets.find((item) => item.id === newRecurringBucketId);

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

    addRecurringDeduction({
      id: `rec-${Date.now()}`,
      bucketId: bucket.id,
      name: newRecurringName.trim(),
      amount,
      cadence: newRecurringCadence,
      nextRunDate: new Date(`${newRecurringNextRunDate}T09:00:00.000Z`).toISOString(),
    });

    setNewRecurringName('');
    setNewRecurringAmount('');
    setNewRecurringCadence('monthly');
    setNewRecurringNextRunDate(new Date().toISOString().slice(0, 10));
    Alert.alert('Recurring deduction added', 'The recurrence was saved.');
  };

  const handleRemoveRecurringDeduction = (deductionId: string) => {
    removeRecurringDeduction(deductionId);
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

  const handleTransfer = () => {
    try {
      transferFunds({
        fromBucketId: selectedFrom,
        toBucketId: selectedTo,
        amount: Number(transferAmount),
      });
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

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Home', icon: '🏠' },
    { key: 'transfer', label: 'Transfer', icon: '🔄' },
    { key: 'scanner', label: 'Scan', icon: '📸' },
    { key: 'recurring', label: 'Bills', icon: '🧾' },
    { key: 'shared', label: 'Share', icon: '🤝' },
    { key: 'analytics', label: 'Reports', icon: '📊' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <BucketDashboard buckets={buckets} onToggleLock={handleToggleLock} />

            <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Transactions</Text>
              {transactions.map((transaction) => (
                <View key={transaction.id} style={[styles.transactionItem, { borderColor: palette.border }]}>
                  <Text style={[styles.transactionMerchant, { color: palette.text }]}>{transaction.merchantName}</Text>
                  <Text style={[styles.transactionNote, { color: palette.textMuted }]}>{transaction.note}</Text>
                  <Text style={[styles.transactionAmount, { color: palette.text }]}>{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</Text>
                </View>
              ))}
            </View>

            <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleResetMonth}>
              <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Run Month Reset</Text>
            </Pressable>
          </>
        );
      case 'transfer':
        return (
          <>
            <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Smart Transfer</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                  value={selectedFrom}
                  onChangeText={setSelectedFrom}
                  placeholder="From bucket"
                  placeholderTextColor={palette.placeholder}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                  value={selectedTo}
                  onChangeText={setSelectedTo}
                  placeholder="To bucket"
                  placeholderTextColor={palette.placeholder}
                />
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={transferAmount}
                onChangeText={setTransferAmount}
                placeholder="Amount"
                keyboardType="numeric"
                placeholderTextColor={palette.placeholder}
              />
              <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleTransfer}>
                <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Transfer Funds</Text>
              </Pressable>
            </View>

            <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Manual Entry</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={manualBucketId}
                onChangeText={setManualBucketId}
                placeholder="Bucket Id"
                placeholderTextColor={palette.placeholder}
              />
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={manualAmount}
                onChangeText={setManualAmount}
                placeholder="Amount"
                keyboardType="numeric"
                placeholderTextColor={palette.placeholder}
              />
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={manualMerchant}
                onChangeText={setManualMerchant}
                placeholder="Merchant"
                placeholderTextColor={palette.placeholder}
              />
              <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleAddManualExpense}>
                <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Add Expense</Text>
              </Pressable>
            </View>
          </>
        );
      case 'scanner':
        return (
          <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Slip Scanner</Text>
            <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleScan}>
              <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Scan Slip</Text>
            </Pressable>
          </View>
        );
      case 'recurring':
        return (
          <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Recurring Deductions</Text>
            <TextInput
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={newRecurringBucketId}
              onChangeText={setNewRecurringBucketId}
              placeholder="Bucket id"
              placeholderTextColor={palette.placeholder}
            />
            <TextInput
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={newRecurringName}
              onChangeText={setNewRecurringName}
              placeholder="Deduction name"
              placeholderTextColor={palette.placeholder}
            />
            <TextInput
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={newRecurringAmount}
              onChangeText={setNewRecurringAmount}
              placeholder="Amount"
              keyboardType="numeric"
              placeholderTextColor={palette.placeholder}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flexInput, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={newRecurringNextRunDate}
                onChangeText={setNewRecurringNextRunDate}
                placeholder="Next run date"
                placeholderTextColor={palette.placeholder}
              />
              <TextInput
                style={[styles.input, styles.flexInput, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={newRecurringCadence}
                onChangeText={(value) => setNewRecurringCadence(value === 'weekly' ? 'weekly' : 'monthly')}
                placeholder="Cadence"
                placeholderTextColor={palette.placeholder}
              />
            </View>
            <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleAddRecurringDeduction}>
              <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Add Recurring Deduction</Text>
            </Pressable>

            {recurringDeductions.length > 0 && (
              <View style={styles.listContainer}>
                {recurringDeductions.map((deduction) => (
                  <View key={deduction.id} style={styles.listItem}>
                    <View style={styles.listTextWrap}>
                      <Text style={styles.listTitle}>{deduction.name}</Text>
                      <Text style={styles.listMeta}>{deduction.bucketId} • {deduction.cadence}</Text>
                      <Text style={styles.listMeta}>Next run: {new Date(deduction.nextRunDate).toLocaleDateString()}</Text>
                      <Text style={styles.listMeta}>Amount: {formatCurrency(deduction.amount)}</Text>
                    </View>
                    <Pressable onPress={() => handleRemoveRecurringDeduction(deduction.id)} style={styles.deleteButton}>
                      <Text style={styles.deleteButtonText}>Remove</Text>
                    </Pressable>
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
            <TextInput
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={newSharedBucketId}
              onChangeText={setNewSharedBucketId}
              placeholder="Bucket id to share"
              placeholderTextColor={palette.placeholder}
            />
            <TextInput
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={newSharedOwnerId}
              onChangeText={setNewSharedOwnerId}
              placeholder="Owner user id"
              placeholderTextColor={palette.placeholder}
            />
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

            {sharedBuckets.length > 0 && (
              <View style={styles.listContainer}>
                {sharedBuckets.map((bucket) => (
                  <View key={bucket.bucketId} style={styles.listItem}>
                    <View style={styles.listTextWrap}>
                      <Text style={styles.listTitle}>{bucket.bucketId}</Text>
                      <Text style={styles.listMeta}>Owner: {bucket.ownerId}</Text>
                      <Text style={styles.listMeta}>Users: {bucket.sharedWithUserIds.join(', ') || 'None'}</Text>
                      <Text style={styles.listMeta}>Access: {Object.entries(bucket.memberRoles ?? {}).map(([user, role]) => `${user} (${role})`).join(', ') || 'No roles set'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <TextInput
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={newSharedMemberBucketId}
              onChangeText={setNewSharedMemberBucketId}
              placeholder="Bucket id"
              placeholderTextColor={palette.placeholder}
            />
            <TextInput
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={newSharedMemberId}
              onChangeText={setNewSharedMemberId}
              placeholder="Member user id"
              placeholderTextColor={palette.placeholder}
            />
            <TextInput
              style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
              value={newSharedMemberRole}
              onChangeText={(value) => setNewSharedMemberRole(value === 'owner' ? 'owner' : 'member')}
              placeholder="Role"
              placeholderTextColor={palette.placeholder}
            />
            <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={handleAddSharedMember}>
              <Text style={[styles.secondaryButtonText, { color: palette.secondaryText }]}>Add Shared Member</Text>
            </Pressable>
          </View>
        );
      case 'analytics':
        return (
          <>
            <AnalyticsPanel buckets={buckets} />
            <View style={[styles.section, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }] }>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Bucket Setup</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={newBucketName}
                onChangeText={setNewBucketName}
                placeholder="Bucket name"
                placeholderTextColor={palette.placeholder}
              />
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={newBucketIcon}
                onChangeText={setNewBucketIcon}
                placeholder="Bucket icon"
                placeholderTextColor={palette.placeholder}
              />
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                value={newBucketBudget}
                onChangeText={setNewBucketBudget}
                placeholder="Allocated budget"
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
        <Text style={[styles.title, { color: palette.text }]}>KongMoney</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
        {renderTabContent()}
      </ScrollView>

      <View style={[styles.navBar, { backgroundColor: palette.navBar, borderTopColor: palette.border }] }>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.navItem,
              activeTab === tab.key && [styles.navItemActive, { backgroundColor: palette.navActiveSoft }],
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={{ fontSize: 18, marginBottom: 2 }}>{tab.icon}</Text>
            <Text style={[styles.navText, { color: activeTab === tab.key ? palette.navActive : palette.navText }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

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
                <TextInput
                  style={[styles.input, { backgroundColor: palette.cardSoft, borderColor: palette.border, color: palette.text }]}
                  value={scanBucketId}
                  onChangeText={setScanBucketId}
                  placeholder="Bucket ID"
                  placeholderTextColor={palette.placeholder}
                />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f4f0',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    paddingVertical: 8,
  },
  navItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
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
  },
  input: {
    borderColor: '#d9d9d9',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
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
    paddingVertical: 12,
  },
  transactionMerchant: {
    fontWeight: '700',
  },
  transactionNote: {
    color: '#666',
    marginTop: 4,
  },
  transactionAmount: {
    marginTop: 4,
    fontWeight: '600',
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
});
