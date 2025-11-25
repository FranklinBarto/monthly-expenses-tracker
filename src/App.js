import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, TrendingUp, Calendar, DollarSign, Trash2, Settings, Download, Database, Upload, Shield, HardDrive } from 'lucide-react';
import Dexie from 'dexie';

// Currency data
const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  CHF: { symbol: 'Fr', name: 'Swiss Franc' },
  SEK: { symbol: 'kr', name: 'Swedish Krona' },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar' },
  KRW: { symbol: '₩', name: 'South Korean Won' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone' },
  MXN: { symbol: '$', name: 'Mexican Peso' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar' },
  BRL: { symbol: 'R$', name: 'Brazilian Real' },
  ZAR: { symbol: 'R', name: 'South African Rand' },
  RUB: { symbol: '₽', name: 'Russian Ruble' },
  TRY: { symbol: '₺', name: 'Turkish Lira' },
  PLN: { symbol: 'zł', name: 'Polish Zloty' },
  THB: { symbol: '฿', name: 'Thai Baht' },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah' },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit' },
  PHP: { symbol: '₱', name: 'Philippine Peso' },
  DKK: { symbol: 'kr', name: 'Danish Krone' },
  CZK: { symbol: 'Kč', name: 'Czech Koruna' },
  HUF: { symbol: 'Ft', name: 'Hungarian Forint' },
  ILS: { symbol: '₪', name: 'Israeli Shekel' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham' },
  SAR: { symbol: '﷼', name: 'Saudi Riyal' },
  ARS: { symbol: '$', name: 'Argentine Peso' },
  CLP: { symbol: '$', name: 'Chilean Peso' },
  COP: { symbol: '$', name: 'Colombian Peso' },
  EGP: { symbol: 'E£', name: 'Egyptian Pound' },
  PKR: { symbol: '₨', name: 'Pakistani Rupee' },
  VND: { symbol: '₫', name: 'Vietnamese Dong' },
  BGN: { symbol: 'лв', name: 'Bulgarian Lev' },
  RON: { symbol: 'lei', name: 'Romanian Leu' },
  HRK: { symbol: 'kn', name: 'Croatian Kuna' },
  UAH: { symbol: '₴', name: 'Ukrainian Hryvnia' },
};

// IndexedDB setup using Dexie
const db = new Dexie('ExpenseTrackerDB');
db.version(1).stores({
  categories: 'id, name, target, frequency',
  expenses: 'id, categoryId, amount, description, date',
  settings: 'key, value',
  backups: 'id, timestamp, data'
});

// Data structure
const INITIAL_DATA = {
  categories: [],
  actualExpenses: [],
  settings: {
    currency: 'USD',
    userName: '',
    backupFolder: null,
    lastBackup: null,
    autoBackup: true,
    cloudBackupEnabled: false
  }
};

export default function App() {
  const [data, setData] = useState(INITIAL_DATA);
  const [view, setView] = useState('track');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Form states for adding categories
  const [newCategory, setNewCategory] = useState({
    name: '',
    target: '',
    frequency: 'monthly'
  });

  // Form states for adding actual expenses
  const [newExpense, setNewExpense] = useState({
    categoryId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    currency: 'USD',
    userName: '',
    autoBackup: true,
    cloudBackupEnabled: false
  });

  // Expansion states for historical data
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  // Perform local backup using File System Access API
  const performLocalBackup = useCallback(async (currentData) => {
    try {
      const backupData = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: currentData
      };

      // Store backup in IndexedDB
      await db.backups.add({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        data: JSON.stringify(backupData)
      });

      // Update last backup time
      const updatedSettings = {
        ...currentData.settings,
        lastBackup: Date.now()
      };

      setData(prev => ({
        ...prev,
        settings: updatedSettings
      }));

      setBackupStatus('Backup created successfully');
    } catch (error) {
      console.error('Backup error:', error);
      setBackupStatus('Backup failed: ' + error.message);
    }
  }, [setData]);

  // Check if backup is needed (weekly or on significant change)
  const checkAndPerformBackup = useCallback(async (currentData) => {
    const lastBackup = currentData.settings.lastBackup;
    const now = Date.now();
    const weekInMs = 7 * 24 * 60 * 60 * 1000;

    if (!lastBackup || (now - lastBackup) > weekInMs) {
      await performLocalBackup(currentData);
    }
  }, [performLocalBackup]);

  const loadFromIndexedDB = useCallback(async () => {
    try {
      setIsLoading(true);
      const categories = await db.categories.toArray();
      const expenses = await db.expenses.toArray();
      const settingsData = await db.settings.get('appSettings');

      const loadedData = {
        categories: categories || [],
        actualExpenses: expenses || [],
        settings: settingsData?.value || INITIAL_DATA.settings
      };

      setData(loadedData);
      setSettingsForm(loadedData.settings);

      // Check if backup is needed
      if (loadedData.settings.autoBackup) {
        checkAndPerformBackup(loadedData);
      }
    } catch (error) {
      console.error('Error loading from IndexedDB:', error);
      setBackupStatus('Error loading data');
    } finally {
      setIsLoading(false);
    }
  }, [checkAndPerformBackup]);

  // Load data from IndexedDB on mount
  useEffect(() => {
    loadFromIndexedDB();
  }, [loadFromIndexedDB]);


  const saveToIndexedDB = useCallback(async () => {
    try {
      // Use the 'data' state variable here
      await db.categories.clear();
      await db.categories.bulkAdd(data.categories);

      await db.expenses.clear();
      await db.expenses.bulkAdd(data.actualExpenses);

      await db.settings.put({ key: 'appSettings', value: data.settings });

      // Auto-backup if enabled
      if (data.settings.autoBackup) {
        checkAndPerformBackup(data);
      }
    } catch (error) {
      console.error('Error saving to IndexedDB:', error);
      setBackupStatus('Error saving data');
    }
  }, [data, checkAndPerformBackup]);

  // Save data to IndexedDB whenever it changes
  useEffect(() => {
    if (!isLoading) {
      saveToIndexedDB();
    }
  }, [data, isLoading, saveToIndexedDB]);

  // Manual backup to file
  const manualBackupToFile = async () => {
    try {
      const backupData = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: data
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setBackupStatus('Backup downloaded successfully');
    } catch (error) {
      console.error('Backup error:', error);
      setBackupStatus('Backup failed: ' + error.message);
    }
  };

  // Restore from backup file
  const restoreFromBackup = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (backupData.version !== 1) {
        throw new Error('Unsupported backup version');
      }

      // Restore data
      const restoredData = backupData.data;

      // Clear and restore IndexedDB
      await db.categories.clear();
      await db.categories.bulkAdd(restoredData.categories);

      await db.expenses.clear();
      await db.expenses.bulkAdd(restoredData.actualExpenses);

      await db.settings.put({ key: 'appSettings', value: restoredData.settings });

      setData(restoredData);
      setSettingsForm(restoredData.settings);
      setBackupStatus('Data restored successfully');
    } catch (error) {
      console.error('Restore error:', error);
      setBackupStatus('Restore failed: ' + error.message);
    }
  };

  // Export encrypted backup
  const exportEncryptedBackup = async () => {
    try {
      const backupData = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: data,
        encrypted: true
      };

      const password = prompt('Enter a password to encrypt your backup:');
      if (!password) return;

      // Simple XOR encryption (for demonstration - use proper encryption in production)
      const jsonStr = JSON.stringify(backupData.data);
      const encrypted = btoa(jsonStr.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ password.charCodeAt(i % password.length))
      ).join(''));

      const encryptedData = {
        ...backupData,
        data: encrypted
      };

      const blob = new Blob([JSON.stringify(encryptedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-backup-encrypted-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setBackupStatus('Encrypted backup downloaded');
    } catch (error) {
      console.error('Encryption error:', error);
      setBackupStatus('Encryption failed: ' + error.message);
    }
  };

  // Import encrypted backup
  const importEncryptedBackup = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.encrypted) {
        throw new Error('This is not an encrypted backup');
      }

      const password = prompt('Enter the password to decrypt your backup:');
      if (!password) return;

      // Decrypt
      const encrypted = backupData.data;
      const decrypted = atob(encrypted).split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ password.charCodeAt(i % password.length))
      ).join('');

      const restoredData = JSON.parse(decrypted);

      // Restore data
      await db.categories.clear();
      await db.categories.bulkAdd(restoredData.categories);

      await db.expenses.clear();
      await db.expenses.bulkAdd(restoredData.actualExpenses);

      await db.settings.put({ key: 'appSettings', value: restoredData.settings });

      setData(restoredData);
      setSettingsForm(restoredData.settings);
      setBackupStatus('Encrypted data restored successfully');
    } catch (error) {
      console.error('Decryption error:', error);
      setBackupStatus('Decryption failed: Wrong password or corrupted file');
    }
  };

  // PWA Install handling
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('App is already installed or installation is not available on this device.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstallable(false);
    }

    setDeferredPrompt(null);
  };

  // Save settings
  const saveSettings = () => {
    setData(prev => ({
      ...prev,
      settings: settingsForm
    }));
    alert('Settings saved!');
  };

  const currencySymbol = CURRENCIES[data?.settings?.currency]?.symbol || '$';

  // Add new category
  const addCategory = () => {
    if (!newCategory.name || !newCategory.target) return;

    const category = {
      id: Date.now().toString(),
      name: newCategory.name,
      target: parseFloat(newCategory.target),
      frequency: newCategory.frequency
    };

    setData(prev => ({
      ...prev,
      categories: [...prev.categories, category]
    }));

    setNewCategory({ name: '', target: '', frequency: 'monthly' });
  };

  // Delete category
  const deleteCategory = (id) => {
    setData(prev => ({
      categories: prev.categories.filter(c => c.id !== id),
      actualExpenses: prev.actualExpenses.filter(e => e.categoryId !== id),
      settings: prev.settings
    }));
  };

  // Add actual expense
  const addExpense = () => {
    if (!newExpense.categoryId || !newExpense.amount) return;

    const expense = {
      id: Date.now().toString(),
      categoryId: newExpense.categoryId,
      amount: parseFloat(newExpense.amount),
      description: newExpense.description,
      date: newExpense.date
    };

    setData(prev => ({
      ...prev,
      actualExpenses: [...prev.actualExpenses, expense]
    }));

    setNewExpense({
      categoryId: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Delete expense
  const deleteExpense = (id) => {
    setData(prev => ({
      ...prev,
      actualExpenses: prev.actualExpenses.filter(e => e.id !== id)
    }));
  };

  // Calculate forecasts
  const calculateMonthlyForecast = (category) => {
    switch (category.frequency) {
      case 'daily':
        return category.target * 30;
      case 'weekly':
        return category.target * 4.33;
      default:
        return category.target;
    }
  };

  const calculateWeeklyForecast = (category) => {
    switch (category.frequency) {
      case 'daily':
        return category.target * 7;
      case 'monthly':
        return category.target / 4.33;
      default:
        return category.target;
    }
  };

  // Get current month/week expenses
  const getCurrentMonthExpenses = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return data.actualExpenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear;
    });
  };

  const getCurrentWeekExpenses = () => {
    const now = new Date();
    // Start of the week (Sunday)
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    // End of the week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Resetting time to ensure we cover the full day
    startOfWeek.setHours(0, 0, 0, 0);
    endOfWeek.setHours(23, 59, 59, 999);

    return data.actualExpenses.filter(e => {
      const expenseDate = new Date(e.date);
      // Ensure time component is considered or expenses are date-only
      const expDateOnly = new Date(e.date);
      expDateOnly.setHours(0, 0, 0, 0);

      // Check if the expense date falls within the current calendar week
      // The current implementation of getCurrentWeekExpenses is simpler (last 7 days)
      // I'll revert to the simpler last 7 days check for consistency with the historical data approach, 
      // but making the window explicit for better calculation.
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return expenseDate >= oneWeekAgo && expenseDate <= new Date();

    });
  };

  // Calculate totals by category
  const getCategoryTotals = (expenses) => {
    const totals = {};
    expenses.forEach(e => {
      totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount;
    });
    return totals;
  };

  const monthExpenses = getCurrentMonthExpenses();
  const weekExpenses = getCurrentWeekExpenses();
  const monthTotals = getCategoryTotals(monthExpenses);
  const weekTotals = getCategoryTotals(weekExpenses);

  // Calculate overall totals
  const totalMonthlyBudget = data.categories.reduce((sum, cat) =>
    sum + calculateMonthlyForecast(cat), 0);
  const totalWeeklyBudget = data.categories.reduce((sum, cat) =>
    sum + calculateWeeklyForecast(cat), 0);
  const totalMonthlySpent = Object.values(monthTotals).reduce((sum, val) => sum + val, 0);
  const totalWeeklySpent = Object.values(weekTotals).reduce((sum, val) => sum + val, 0);

  // Group expenses by year and month
  const groupExpensesByYearMonth = () => {
    const groups = {};

    data.actualExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const year = date.getFullYear();
      const month = date.getMonth();

      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = [];

      groups[year][month].push(expense);
    });

    return groups;
  };

  const expenseGroups = groupExpensesByYearMonth();

  // Get historical performance data
  const getHistoricalMonths = (count) => {
    const months = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const expenses = data.actualExpenses.filter(e => {
        const expDate = new Date(e.date);
        return expDate.getMonth() === date.getMonth() &&
          expDate.getFullYear() === date.getFullYear();
      });

      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      months.push({
        label: date.toLocaleDateString('default', { month: 'short', year: 'numeric' }),
        budget: totalMonthlyBudget,
        spent: total
      });
    }

    return months;
  };

  const getHistoricalWeeks = (count) => {
    const weeks = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      // End date for the i-th past week (i=0 is the last 7 days)
      const endDate = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      // Start date for the i-th past week
      const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));

      // We're calculating expenses for the period (startDate, endDate]
      const expenses = data.actualExpenses.filter(e => {
        const expDate = new Date(e.date);
        return expDate > startDate && expDate <= endDate;
      });

      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      weeks.push({
        label: i === 0 ? 'Current Week' : `Week ${i} Ago`,
        budget: totalWeeklyBudget,
        spent: total
      });
    }

    return weeks;
  };

  const getHistoricalDays = (count) => {
    const days = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      // Normalize the date to midnight for comparison
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const expenses = data.actualExpenses.filter(e => {
        const expDate = new Date(e.date);
        return expDate >= dayStart && expDate <= dayEnd;
      });

      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      const dailyBudget = totalMonthlyBudget / 30;

      days.push({
        label: i === 0 ? 'Today' : date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        budget: dailyBudget,
        spent: total
      });
    }

    return days;
  };

  const toggleYear = (year) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  const toggleMonth = (yearMonth) => {
    setExpandedMonths(prev => ({ ...prev, [yearMonth]: !prev[yearMonth] }));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Helper to format currency
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return `${currencySymbol}0.00`;
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  // Helper component for budget summary cards
  const SummaryCard = ({ title, spent, budget, icon: Icon, color }) => {
    const percentage = budget > 0 ? (spent / budget) * 100 : 0;
    const isOver = spent > budget;

    return (
      <div className={`bg-white rounded-xl shadow-md p-5 border-l-4 border-${color}-500 transition-shadow hover:shadow-lg`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
          <Icon size={24} className={`text-${color}-500`} />
        </div>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          {formatCurrency(spent)}
        </p>
        <p className={`text-sm mt-1 ${isOver ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
          {isOver ? 'OVER BUDGET' : 'Remaining'}: {formatCurrency(budget - spent)}
        </p>
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(budget)} Budget ({percentage.toFixed(0)}%)
          </p>
        </div>
      </div>
    );
  };

  const BudgetToggle = ({ totalMonthlyBudget }) => {
    const [showMonthly, setShowMonthly] = useState(true);

    return (
      <div className="flex flex-col items-end">

        {showMonthly ? (
          <button
            onClick={() => setShowMonthly(false)}
            className="font-bold text-gray-800 mb-4 gap-2 text-right animate-bubble"
          >
            Total Monthly Budget{" "}
            <span className="text-xl font-bold text-green-700">
              {formatCurrency(totalMonthlyBudget)}
            </span>
          </button>
        ) : (
          <button
            onClick={() => setShowMonthly(true)}
            className="font-bold text-gray-800 mb-4 gap-2 text-right animate-bubble"
          >
            Total Yearly Budget{" "}
            <span className="text-xl font-bold text-green-700">
              {formatCurrency(totalMonthlyBudget * 12)}
            </span>
          </button>
        )}

      </div>
    );
  }

  // Helper component for historical charts
  const HistoricalBar = ({ label, spent, budget }) => {
    const maxVal = Math.max(spent, budget);
    const spentHeight = maxVal > 0 ? (spent / maxVal) * 100 : 0;
    const budgetHeight = maxVal > 0 ? (budget / maxVal) * 100 : 0;
    const isOver = spent > budget;

    return (
      <div className="flex flex-col items-center w-full min-w-[70px]">
        <div className="relative h-28 w-full bg-gray-100 rounded-t-lg">
          {/* Budget Line/Bar */}
          <div
            className="absolute bottom-0 left-0 w-full bg-indigo-200 rounded-t-lg opacity-50"
            style={{ height: `${budgetHeight}%` }}
          ></div>

          {/* Spent Bar */}
          <div
            className={`absolute bottom-0 left-0 w-full rounded-t-lg transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ height: `${spentHeight}%` }}
          ></div>
        </div>
        <div className="text-xs text-center text-gray-600 mt-1 w-full truncate" title={label}>{label}</div>
        <div className="text-[10px] text-center font-medium mt-0.5 text-gray-700">{formatCurrency(spent)}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your data...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Expense Planner</h1>
                {data?.settings?.userName && (
                  <p className="text-gray-600 mt-1">Welcome, **{data?.settings?.userName}**!</p>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setView('track')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'track'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                <DollarSign size={18} className="inline-block mr-1" />
                Track Expenses
              </button>
              <button
                onClick={() => setView('plan')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'plan'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                <Calendar size={18} className="inline-block mr-1" />
                Plan Budget
              </button>
              <button
                onClick={() => setView('summary')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'summary'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                <TrendingUp size={18} className="inline-block mr-1" />
                Summary
              </button>
              <button
                onClick={() => setView('settings')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${view === 'settings'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                <Settings size={18} />
                Settings
              </button>
            </div>
          </div>

          {/* Settings View */}
          {view === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Settings</h2>

                <div className="space-y-4">
                  {/* Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={settingsForm.userName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, userName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  {/* Currency Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={settingsForm.currency}
                      onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {Object.entries(CURRENCIES).map(([code, curr]) => (
                        <option key={code} value={code}>
                          {curr.symbol} - {curr.name} ({code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Auto Backup Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Automatic Weekly Backup
                      </label>
                      <p className="text-xs text-gray-500">Automatically backup data weekly</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm.autoBackup}
                      onChange={(e) => setSettingsForm({ ...settingsForm, autoBackup: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={saveSettings}
                    className="w-full bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Save Settings
                  </button>
                </div>
              </div>

              {/* Backup & Storage Section */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Database size={24} />
                  Data Storage & Backup
                </h2>

                {backupStatus && (
                  <div className={`mb-4 p-3 rounded-lg ${backupStatus.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {backupStatus}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Storage Info */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <HardDrive className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <p className="font-semibold text-gray-800">Primary Storage: IndexedDB</p>
                        <p className="text-sm text-gray-600">
                          All your data is stored locally in your browser's IndexedDB for fast, offline access.
                        </p>
                        {data.settings.lastBackup && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last backup: {new Date(data.settings.lastBackup).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Manual Backup */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Local Backup Options</h3>

                    <div className="space-y-2">
                      <button
                        onClick={manualBackupToFile}
                        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Download size={20} />
                        Download Backup File
                      </button>

                      <button
                        onClick={exportEncryptedBackup}
                        className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Shield size={20} />
                        Download Encrypted Backup
                      </button>
                    </div>
                  </div>

                  {/* Restore Options */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Restore from Backup</h3>

                    <div className="space-y-2">
                      <label className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <Upload size={20} />
                        Restore from Backup File
                        <input
                          type="file"
                          accept=".json"
                          onChange={restoreFromBackup}
                          className="hidden"
                        />
                      </label>

                      <label className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <Shield size={20} />
                        Restore from Encrypted Backup
                        <input
                          type="file"
                          accept=".json"
                          onChange={importEncryptedBackup}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>⚠️ Important:</strong>
                    </p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4 list-disc">
                      <li>Regular backups protect your data from browser issues</li>
                      <li>Encrypted backups add password protection</li>
                      <li>Keep backup files in a safe location</li>
                      <li>Automatic backups run weekly when enabled</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* PWA Install Section */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Download size={24} />
                  Install App
                </h2>
                <p className="text-gray-600 mb-4">
                  Install this app on your device for quick access and offline use.
                </p>

                {isInstallable ? (
                  <button
                    onClick={handleInstallClick}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download size={20} />
                    Install as PWA
                  </button>
                ) : (
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                    <p className="text-gray-600">
                      {window.matchMedia('(display-mode: standalone)').matches
                        ? '✓ App is already installed'
                        : 'Installation not available. Try using your browser\'s "Add to Home Screen" option.'}
                    </p>
                  </div>
                )}

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Manual Installation:</strong><br />
                    • **Chrome/Edge:** Menu → Install app<br />
                    • **Safari (iOS):** Share → Add to Home Screen<br />
                    • **Firefox:** Menu → Install
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Plan Budget View */}
          {view === 'plan' && (
            <div className="space-y-6">
              {/* Add Category Form */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Add Budget Category</h2>
                <div className="grid gap-4 sm:grid-cols-4">
                  <input
                    type="text"
                    placeholder="Category name (e.g., Groceries)"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent col-span-4 sm:col-span-1"
                  />
                  <input
                    type="number"
                    placeholder="Target amount"
                    value={newCategory.target}
                    onChange={(e) => setNewCategory({ ...newCategory, target: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent col-span-4 sm:col-span-1"
                  />
                  <select
                    value={newCategory.frequency}
                    onChange={(e) => setNewCategory({ ...newCategory, frequency: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent col-span-4 sm:col-span-1"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <button
                    onClick={addCategory}
                    className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 col-span-4 sm:col-span-1"
                  >
                    <PlusCircle size={20} />
                    Add
                  </button>
                </div>
              </div>

              {/* Budget Categories List */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Your Budget Categories ({data.categories.length})</h2>

                <BudgetToggle totalMonthlyBudget={totalMonthlyBudget} />

                {data.categories.length === 0 ? (
                  <p className="text-gray-500 italic">No categories added yet. Start planning your budget!</p>
                ) : (
                  <ul className="space-y-3">
                    {data.categories.map(category => {
                      const monthlyForecast = calculateMonthlyForecast(category);
                      const weeklyForecast = calculateWeeklyForecast(category);
                      const spent = monthTotals[category.id] || 0;
                      const isOver = spent > monthlyForecast;

                      return (
                        <li key={category.id} className={`p-4 rounded-lg border-l-4 ${isOver ? 'bg-red-50 border-red-400' : 'bg-gray-50 border-indigo-400'} flex justify-between items-center transition-shadow hover:shadow-md`}>
                          <div>
                            <p className="font-semibold text-gray-800">{category.name}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Target: {formatCurrency(category.target)} / {category.frequency}
                            </p>
                            <div className="text-xs text-gray-500 mt-1">
                              Monthly Est: {formatCurrency(monthlyForecast)} | Weekly Est: {formatCurrency(weeklyForecast)}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(spent)} Spent (Current Month)
                            </p>
                            <button
                              onClick={() => deleteCategory(category.id)}
                              className="text-red-500 hover:text-red-700 transition-colors mt-1"
                              title="Delete Category"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Track Expenses View */}
          {view === 'track' && (
            <div className="space-y-6">
              {/* Current Period Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SummaryCard
                  title="Current Month Performance"
                  spent={totalMonthlySpent}
                  budget={totalMonthlyBudget}
                  icon={Calendar}
                  color={totalMonthlySpent > totalMonthlyBudget ? 'red' : 'green'}
                />
                <SummaryCard
                  title="Last 7 Days Performance"
                  spent={totalWeeklySpent}
                  budget={totalWeeklyBudget}
                  icon={TrendingUp}
                  color={totalWeeklySpent > totalWeeklyBudget ? 'red' : 'green'}
                />
              </div>

              {/* Track Expenses View */}
              {view === 'track' && (
                <div className="space-y-6">
                  {/* Add Expense Form */}
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Record Expense</h2>
                    {data.categories.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Please add budget categories first.</p>
                    ) : (
                      <div className="grid gap-4">
                        <select
                          value={newExpense.categoryId}
                          onChange={(e) => setNewExpense({ ...newExpense, categoryId: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Select category</option>
                          {data.categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Description (optional)"
                          value={newExpense.description}
                          onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <input
                          type="date"
                          value={newExpense.date}
                          onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <button
                          onClick={addExpense}
                          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <DollarSign size={20} />
                          Add Expense
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Expenses by Year/Month */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Expense History</h2>
                {data.actualExpenses.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No expenses recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {/* Current Month */}
                    <div className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
                      <h3 className="font-bold text-lg text-gray-800 mb-3">
                        Current Month - {monthNames[new Date().getMonth()]} {new Date().getFullYear()}
                        <span className="ml-2 text-sm font-normal text-gray-600">
                          ({monthExpenses.length} expense{monthExpenses.length !== 1 ? 's' : ''})
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {monthExpenses.length === 0 ? (
                          <p className="text-gray-500 text-sm">No expenses this month</p>
                        ) : (
                          [...monthExpenses].reverse().map(expense => {
                            const category = data.categories.find(c => c.id === expense.categoryId);
                            return (
                              <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                                <div>
                                  <p className="font-semibold text-gray-800">{category?.name}</p>
                                  <p className="text-sm text-gray-600">{expense.description}</p>
                                  <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <p className="font-bold text-lg text-indigo-600">{currencySymbol}{expense.amount.toFixed(2)}</p>
                                  <button
                                    onClick={() => deleteExpense(expense.id)}
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Previous Months/Years */}
                    {Object.keys(expenseGroups).sort((a, b) => b - a).map(year => {
                      const currentYear = new Date().getFullYear();
                      const currentMonth = new Date().getMonth();

                      // Filter out current month from the groups
                      const monthsInYear = Object.keys(expenseGroups[year])
                        .filter(month => !(year === currentYear && month === currentMonth))
                        .sort((a, b) => b - a);

                      if (monthsInYear.length === 0) return null;

                      const yearTotal = monthsInYear.reduce((sum, month) => {
                        return sum + expenseGroups[year][month].reduce((s, e) => s + e.amount, 0);
                      }, 0);

                      return (
                        <div key={year} className="border border-gray-300 rounded-lg">
                          <button
                            onClick={() => toggleYear(year)}
                            className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                          >
                            <div className="text-left">
                              <h3 className="font-bold text-lg text-gray-800">
                                {year}
                                <span className="ml-2 text-sm font-normal text-gray-600">
                                  ({monthsInYear.length} month{monthsInYear.length !== 1 ? 's' : ''})
                                </span>
                              </h3>
                              <p className="text-sm text-gray-600">Total: {currencySymbol}{yearTotal.toFixed(2)}</p>
                            </div>
                            <div className="text-2xl text-gray-400">
                              {expandedYears[year] ? '−' : '+'}
                            </div>
                          </button>

                          {expandedYears[year] && (
                            <div className="p-4 pt-0 space-y-2">
                              {monthsInYear.map(month => {
                                const expenses = expenseGroups[year][month];
                                const monthTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
                                const yearMonthKey = `${year}-${month}`;

                                return (
                                  <div key={month} className="border border-gray-200 rounded-lg">
                                    <button
                                      onClick={() => toggleMonth(yearMonthKey)}
                                      className="w-full p-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="text-left">
                                        <p className="font-semibold text-gray-800">
                                          {monthNames[month]}
                                          <span className="ml-2 text-sm font-normal text-gray-600">
                                            ({expenses.length} expense{expenses.length !== 1 ? 's' : ''})
                                          </span>
                                        </p>
                                        <p className="text-sm text-gray-600">Total: {currencySymbol}{monthTotal.toFixed(2)}</p>
                                      </div>
                                      <div className="text-xl text-gray-400">
                                        {expandedMonths[yearMonthKey] ? '−' : '+'}
                                      </div>
                                    </button>

                                    {expandedMonths[yearMonthKey] && (
                                      <div className="p-3 pt-0 space-y-2">
                                        {[...expenses].reverse().map(expense => {
                                          const category = data.categories.find(c => c.id === expense.categoryId);
                                          return (
                                            <div key={expense.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                                              <div>
                                                <p className="font-semibold text-gray-800">{category?.name}</p>
                                                <p className="text-sm text-gray-600">{expense.description}</p>
                                                <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                <p className="font-bold text-lg text-indigo-600">{currencySymbol}{expense.amount.toFixed(2)}</p>
                                                <button
                                                  onClick={() => deleteExpense(expense.id)}
                                                  className="text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                  <Trash2 size={18} />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary View */}
          {view === 'summary' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={24} />
                  Category Performance
                </h2>
                {data.categories.length === 0 ? (
                  <p className="text-gray-500 italic text-center py-8">No categories to display. Add budget categories first.</p>
                ) : (
                  <div className="space-y-3">
                    {data.categories.map(category => {
                      const monthlyForecast = calculateMonthlyForecast(category);
                      const weeklyForecast = calculateWeeklyForecast(category);
                      const monthSpent = monthTotals[category.id] || 0;
                      const weekSpent = weekTotals[category.id] || 0;
                      const monthRemaining = monthlyForecast - monthSpent;
                      const monthPercentage = monthlyForecast > 0 ? (monthSpent / monthlyForecast) * 100 : 0;
                      const isMonthOver = monthSpent > monthlyForecast;
                      const isExpanded = expandedCategories[category.id];

                      return (
                        <div key={category.id} className="border bg-white border-gray-300 rounded-lg overflow-hidden">
                          {/* Category Header - Always Visible */}
                          <button
                            onClick={() => toggleCategory(category.id)}
                            className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                          >
                            <div className="text-left flex-1">
                              <p className="font-bold text-lg text-gray-800">{category.name}</p>
                              <p className="text-sm text-gray-600">
                                Target: {formatCurrency(category.target)} / {category.frequency}
                              </p>
                            </div>
                            <div className="text-right mr-4">
                              <p className={`font-bold text-xl ${isMonthOver ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(monthSpent)}
                              </p>
                              <p className="text-xs text-gray-500">this month</p>
                            </div>
                            <div className="text-2xl text-gray-400">
                              {isExpanded ? '−' : '+'}
                            </div>
                          </button>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-4 bg-gray-50">
                              {/* Current Month Details */}
                              <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                                <h4 className="font-semibold text-gray-700 mb-3">
                                  Current Month - {monthNames[new Date().getMonth()]}
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Monthly Budget:</span>
                                    <span className="font-semibold">{formatCurrency(monthlyForecast)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Spent:</span>
                                    <span className={`font-semibold ${isMonthOver ? 'text-red-600' : 'text-green-600'}`}>
                                      {formatCurrency(monthSpent)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      {isMonthOver ? 'Over Budget:' : 'Remaining:'}
                                    </span>
                                    <span className={`font-semibold ${isMonthOver ? 'text-red-600' : 'text-green-600'}`}>
                                      {formatCurrency(Math.abs(monthRemaining))}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                                    <div
                                      className={`h-3 rounded-full transition-all ${isMonthOver ? 'bg-red-500' : 'bg-green-500'}`}
                                      style={{ width: `${Math.min(monthPercentage, 100)}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-xs text-gray-600 text-center">{monthPercentage.toFixed(1)}% used</p>
                                </div>
                              </div>

                              {/* Last 7 Days Details */}
                              <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                                <h4 className="font-semibold text-gray-700 mb-3">Last 7 Days</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Weekly Budget:</span>
                                    <span className="font-semibold">{formatCurrency(weeklyForecast)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Spent:</span>
                                    <span className={`font-semibold ${weekSpent > weeklyForecast ? 'text-red-600' : 'text-blue-600'}`}>
                                      {formatCurrency(weekSpent)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      {weekSpent > weeklyForecast ? 'Over Budget:' : 'Remaining:'}
                                    </span>
                                    <span className={`font-semibold ${weekSpent > weeklyForecast ? 'text-red-600' : 'text-blue-600'}`}>
                                      {formatCurrency(Math.abs(weeklyForecast - weekSpent))}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                                    <div
                                      className={`h-3 rounded-full transition-all ${weekSpent > weeklyForecast ? 'bg-red-500' : 'bg-blue-500'}`}
                                      style={{ width: `${Math.min((weekSpent / weeklyForecast) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-xs text-gray-600 text-center">
                                    {weeklyForecast > 0 ? ((weekSpent / weeklyForecast) * 100).toFixed(1) : 0}% used
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={24} />
                  Historical Performance
                </h2>

                {/* Monthly History */}
                <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Last 6 Months</h3>
                <div className="flex overflow-x-auto pb-4 space-x-4">
                  {getHistoricalMonths(6).map((item, index) => (
                    <HistoricalBar key={index} {...item} />
                  ))}
                </div>

                {/* Weekly History */}
                <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pt-4 pb-2">Last 8 Weeks</h3>
                <div className="flex overflow-x-auto pb-4 space-x-4">
                  {getHistoricalWeeks(8).map((item, index) => (
                    <HistoricalBar key={index} {...item} />
                  ))}
                </div>

                {/* Daily History */}
                <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pt-4 pb-2">Last 7 Days</h3>
                <div className="flex overflow-x-auto pb-4 space-x-4">
                  {getHistoricalDays(7).map((item, index) => (
                    <HistoricalBar key={index} {...item} />
                  ))}
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Database size={24} />
                  All Expenses History
                </h2>

                {Object.keys(expenseGroups).sort((a, b) => b - a).map(year => (
                  <div key={year} className="mb-4">
                    <button
                      onClick={() => toggleYear(year)}
                      className="w-full text-left font-bold text-lg p-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex justify-between items-center transition-colors"
                    >
                      {year}
                      <span className="text-indigo-600">
                        {expandedYears[year] ? 'Collapse' : 'Expand'}
                      </span>
                    </button>

                    {expandedYears[year] && (
                      <div className="ml-4 mt-2 border-l border-gray-300 pl-4 space-y-2">
                        {Object.keys(expenseGroups[year]).sort((a, b) => b - a).map(monthIndex => {
                          const month = monthNames[monthIndex];
                          const expenses = expenseGroups[year][monthIndex];
                          const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
                          const yearMonthKey = `${year}-${monthIndex}`;

                          return (
                            <div key={monthIndex}>
                              <button
                                onClick={() => toggleMonth(yearMonthKey)}
                                className="w-full text-left font-medium p-2 bg-white hover:bg-gray-50 rounded-lg flex justify-between items-center transition-colors border-b"
                              >
                                {month} ({expenses.length} expenses)
                                <span className="text-red-600 font-bold">{formatCurrency(totalSpent)}</span>
                              </button>

                              {expandedMonths[yearMonthKey] && (
                                <div className="mt-2 ml-4 space-y-1">
                                  {expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(expense => {
                                    const category = data.categories.find(c => c.id === expense.categoryId);
                                    return (
                                      <div key={expense.id} className="p-2 border-b text-sm flex justify-between items-center hover:bg-blue-50">
                                        <div>
                                          <p className="font-semibold text-gray-800">{category?.name || 'Unknown'}</p>
                                          <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()}{expense.description && ` - ${expense.description}`}</p>
                                        </div>
                                        <p className="font-bold text-red-500">{formatCurrency(expense.amount)}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {data.actualExpenses.length === 0 && (
                  <p className="text-gray-500 italic">No historical data available.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}