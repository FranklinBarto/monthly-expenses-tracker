import React, { useState, useEffect } from 'react';
import { PlusCircle, TrendingUp, Calendar, DollarSign, Trash2, Settings, Download } from 'lucide-react';

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

// Data structure
const INITIAL_DATA = {
  categories: [],
  actualExpenses: [],
  settings: {
    currency: 'USD',
    userName: ''
  }
};

export default function App() {
  const [data, setData] = useState(INITIAL_DATA);
  const [view, setView] = useState('track');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
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
    userName: ''
  });

  // Load data from memory on mount
  useEffect(() => {
    const saved = localStorage.getItem('expenseData');
    if (saved) {
      const loadedData = JSON.parse(saved);
      setData(loadedData);
      setSettingsForm(loadedData.settings || { currency: 'USD', userName: '' });
    }
  }, []);

  // Save data to memory whenever it changes
  useEffect(() => {
    localStorage.setItem('expenseData', JSON.stringify(data));
  }, [data]);

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
      actualExpenses: prev.actualExpenses.filter(e => e.categoryId !== id)
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
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return data.actualExpenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= weekAgo && expenseDate <= now;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Expense Planner</h1>
              {data?.settings?.userName && (
                <p className="text-gray-600 mt-1">Welcome, {data?.settings?.userName}!</p>
              )}
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setView('track')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'track' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Track Expenses
            </button>
            <button
              onClick={() => setView('plan')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'plan' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Plan Budget
            </button>
            <button
              onClick={() => setView('summary')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'summary' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setView('settings')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                view === 'settings' 
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
                    onChange={(e) => setSettingsForm({...settingsForm, userName: e.target.value})}
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
                    onChange={(e) => setSettingsForm({...settingsForm, currency: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {Object.entries(CURRENCIES).map(([code, curr]) => (
                      <option key={code} value={code}>
                        {curr.symbol} - {curr.name} ({code})
                      </option>
                    ))}
                  </select>
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
                  • <strong>Chrome/Edge:</strong> Menu → Install app<br />
                  • <strong>Safari (iOS):</strong> Share → Add to Home Screen<br />
                  • <strong>Firefox:</strong> Menu → Install
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
              <div className="grid gap-4">
                <input
                  type="text"
                  placeholder="Category name (e.g., Groceries)"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Target amount"
                  value={newCategory.target}
                  onChange={(e) => setNewCategory({...newCategory, target: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <select
                  value={newCategory.frequency}
                  onChange={(e) => setNewCategory({...newCategory, frequency: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <button
                  onClick={addCategory}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <PlusCircle size={20} />
                  Add Category
                </button>
              </div>
            </div>

            {/* Categories List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Budget Categories</h2>
              {data.categories.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No categories yet. Add one above!</p>
              ) : (
                <div className="space-y-3">
                  {data.categories.map(cat => (
                    <div key={cat.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-800">{cat.name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{cat.frequency} - {currencySymbol}{cat.target.toFixed(2)}</p>
                        </div>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div className="bg-blue-50 p-2 rounded">
                          <p className="text-gray-600">Weekly Forecast</p>
                          <p className="font-semibold text-blue-700">{currencySymbol}{calculateWeeklyForecast(cat).toFixed(2)}</p>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded">
                          <p className="text-gray-600">Monthly Forecast</p>
                          <p className="font-semibold text-indigo-700">{currencySymbol}{calculateMonthlyForecast(cat).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
                    onChange={(e) => setNewExpense({...newExpense, categoryId: e.target.value})}
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
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
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

            {/* Recent Expenses */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Expenses</h2>
              {data.actualExpenses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No expenses recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {[...data.actualExpenses].reverse().slice(0, 10).map(expense => {
                    const category = data.categories.find(c => c.id === expense.categoryId);
                    return (
                      <div key={expense.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center">
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
          </div>
        )}

        {/* Summary View */}
        {view === 'summary' && (
          <div className="space-y-6">
            {/* Overall Totals */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar size={24} />
                  Weekly Summary
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Budget:</span>
                    <span className="font-bold text-lg">{currencySymbol}{totalWeeklyBudget.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Spent:</span>
                    <span className="font-bold text-lg text-indigo-600">{currencySymbol}{totalWeeklySpent.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Remaining:</span>
                    <span className={`font-bold text-lg ${
                      totalWeeklyBudget - totalWeeklySpent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currencySymbol}{(totalWeeklyBudget - totalWeeklySpent).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                    <div 
                      className={`h-3 rounded-full ${
                        totalWeeklySpent / totalWeeklyBudget > 1 ? 'bg-red-500' : 'bg-indigo-600'
                      }`}
                      style={{width: `${Math.min((totalWeeklySpent / totalWeeklyBudget) * 100, 100)}%`}}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={24} />
                  Monthly Summary
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Budget:</span>
                    <span className="font-bold text-lg">{currencySymbol}{totalMonthlyBudget.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Spent:</span>
                    <span className="font-bold text-lg text-indigo-600">{currencySymbol}{totalMonthlySpent.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Remaining:</span>
                    <span className={`font-bold text-lg ${
                      totalMonthlyBudget - totalMonthlySpent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currencySymbol}{(totalMonthlyBudget - totalMonthlySpent).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                    <div 
                      className={`h-3 rounded-full ${
                        totalMonthlySpent / totalMonthlyBudget > 1 ? 'bg-red-500' : 'bg-indigo-600'
                      }`}
                      style={{width: `${Math.min((totalMonthlySpent / totalMonthlyBudget) * 100, 100)}%`}}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Category Breakdown</h2>
              {data.categories.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No categories to display.</p>
              ) : (
                <div className="space-y-4">
                  {data.categories.map(cat => {
                    const weeklyBudget = calculateWeeklyForecast(cat);
                    const monthlyBudget = calculateMonthlyForecast(cat);
                    const weeklySpent = weekTotals[cat.id] || 0;
                    const monthlySpent = monthTotals[cat.id] || 0;
                    
                    return (
                      <div key={cat.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-lg text-gray-800 mb-3">{cat.name}</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Weekly</p>
                            <div className="flex justify-between text-sm mb-1">
                              <span>{currencySymbol}{weeklySpent.toFixed(2)} / {currencySymbol}{weeklyBudget.toFixed(2)}</span>
                              <span className={weeklySpent > weeklyBudget ? 'text-red-600' : 'text-green-600'}>
                                {weeklySpent > weeklyBudget ? '+' : ''}{currencySymbol}{(weeklySpent - weeklyBudget).toFixed(2)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  weeklySpent / weeklyBudget > 1 ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                                style={{width: `${Math.min((weeklySpent / weeklyBudget) * 100, 100)}%`}}
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Monthly</p>
                            <div className="flex justify-between text-sm mb-1">
                              <span>{currencySymbol}{monthlySpent.toFixed(2)} / {currencySymbol}{monthlyBudget.toFixed(2)}</span>
                              <span className={monthlySpent > monthlyBudget ? 'text-red-600' : 'text-green-600'}>
                                {monthlySpent > monthlyBudget ? '+' : ''}{currencySymbol}{(monthlySpent - monthlyBudget).toFixed(2)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  monthlySpent / monthlyBudget > 1 ? 'bg-red-500' : 'bg-indigo-500'
                                }`}
                                style={{width: `${Math.min((monthlySpent / monthlyBudget) * 100, 100)}%`}}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}