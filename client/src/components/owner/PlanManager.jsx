import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import {
  Utensils, Plus, Edit2, Trash2, CheckCircle2, XCircle,
  AlertCircle, ShieldCheck, Tag, DollarSign, Clock, Users,
  Check, X, RefreshCw
} from 'lucide-react';

const DEFAULT_MEAL_OPTIONS = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snacks',
  'Special Meals'
];

export const PlanManager = ({ messId }) => {
  const { showToast } = useNotification();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    durationDays: 30,
    mealsIncluded: ['Breakfast', 'Lunch', 'Dinner'],
    maxMembers: '',
    status: 'ACTIVE'
  });

  const loadPlans = async () => {
    if (!messId) return;
    setLoading(true);
    try {
      const res = await api.getMessPlans(messId);
      if (res && res.plans) {
        setPlans(res.plans);
      } else {
        setPlans([]);
      }
    } catch (e) {
      console.warn('[PlanManager] Error fetching plans:', e);
      showToast('Failed to load subscription plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [messId]);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      durationDays: 30,
      mealsIncluded: ['Breakfast', 'Lunch', 'Dinner'],
      maxMembers: '',
      status: 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || '',
      description: plan.description || '',
      price: plan.price || '',
      durationDays: plan.durationDays || plan.periodDays || 30,
      mealsIncluded: Array.isArray(plan.mealsIncluded)
        ? plan.mealsIncluded
        : ['Breakfast', 'Lunch', 'Dinner'],
      maxMembers: plan.maxMembers || '',
      status: plan.status || 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const toggleMeal = (meal) => {
    setFormData(prev => {
      const exists = prev.mealsIncluded.includes(meal);
      if (exists) {
        if (prev.mealsIncluded.length === 1) {
          showToast('At least one meal must be included in the plan', 'warning');
          return prev;
        }
        return {
          ...prev,
          mealsIncluded: prev.mealsIncluded.filter(m => m !== meal)
        };
      } else {
        return {
          ...prev,
          mealsIncluded: [...prev.mealsIncluded, meal]
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const priceNum = parseFloat(formData.price);
    if (!formData.name.trim()) {
      showToast('Plan name is required', 'warning');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Please enter a valid price greater than 0', 'warning');
      return;
    }
    if (formData.mealsIncluded.length === 0) {
      showToast('Please select at least one included meal', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: priceNum,
        durationDays: parseInt(formData.durationDays, 10) || 30,
        mealsIncluded: formData.mealsIncluded,
        maxMembers: formData.maxMembers ? parseInt(formData.maxMembers, 10) : null,
        status: formData.status
      };

      if (editingPlan) {
        const res = await api.updateMessPlan(messId, editingPlan.id, payload);
        if (res && res.success) {
          showToast(`Plan "${payload.name}" updated successfully!`, 'success', '✅ Plan Updated');
          setIsModalOpen(false);
          loadPlans();
        } else {
          showToast(res?.message || 'Failed to update plan', 'error');
        }
      } else {
        const res = await api.createMessPlan(messId, payload);
        if (res && res.success) {
          showToast(`Plan "${payload.name}" created successfully!`, 'success', '🎉 Plan Created');
          setIsModalOpen(false);
          loadPlans();
        } else {
          showToast(res?.message || 'Failed to create plan', 'error');
        }
      }
    } catch (e) {
      showToast(e.message || 'Error saving plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (plan) => {
    const newStatus = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.updateMessPlan(messId, plan.id, { status: newStatus });
      if (res && res.success) {
        showToast(
          `Plan is now ${newStatus === 'ACTIVE' ? 'Active & visible to students' : 'Inactive'}`,
          'info',
          newStatus === 'ACTIVE' ? '🟢 Plan Activated' : '⏸️ Plan Deactivated'
        );
        loadPlans();
      }
    } catch (e) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${plan.name}"?`)) {
      return;
    }
    try {
      const res = await api.deleteMessPlan(messId, plan.id);
      if (res && res.success) {
        showToast(`Plan "${plan.name}" deleted`, 'success');
        loadPlans();
      } else {
        showToast(res?.message || 'Cannot delete plan with active subscribers', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Error deleting plan', 'error');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-slate-900">Subscription Plans</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-wider">
              {plans.length} Configured
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure monthly, fortnightly, or custom dining packages for students. Prices are verified strictly server-side.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPlans}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Refresh Plans"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-56 bg-slate-100 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
            <Utensils className="w-7 h-7" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-base">No Subscription Plans Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Create your first subscription plan (e.g. Basic ₹2,500/mo or Premium ₹3,500/mo) so students can subscribe online via Razorpay.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-orange-700 transition"
          >
            Create Your First Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            const isActive = plan.status === 'ACTIVE';
            const meals = Array.isArray(plan.mealsIncluded) ? plan.mealsIncluded : ['Breakfast', 'Lunch', 'Dinner'];

            return (
              <div
                key={plan.id}
                className={`p-5 rounded-3xl bg-white border transition-all duration-200 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                  isActive ? 'border-slate-200/90' : 'border-slate-200/50 opacity-75 bg-slate-50/50'
                }`}
              >
                <div>
                  {/* Status & Menu Tags */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-200 text-slate-700 border border-slate-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-500'}`}></span>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>

                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {plan.durationDays || plan.periodDays || 30} Days
                    </span>
                  </div>

                  {/* Plan Name & Price */}
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900">{plan.name}</h4>
                    {plan.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {plan.description}
                      </p>
                    )}
                  </div>

                  {/* Pricing Display */}
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      ₹{plan.price?.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      / {plan.durationDays ? `${plan.durationDays}d` : 'month'}
                    </span>
                  </div>

                  {/* Included Meals Checkmarks */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Included Meals:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {meals.map(meal => (
                        <span
                          key={meal}
                          className="px-2 py-1 rounded-xl bg-orange-50 border border-orange-200/60 text-orange-900 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-orange-600" />
                          <span>{meal}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Max Members if configured */}
                  {plan.maxMembers && (
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>Capacity: {plan.maxMembers} students</span>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleStatus(plan)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                      isActive
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      title="Edit Plan"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan)}
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 overflow-hidden space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  🍱
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure prices and meals offered to students</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Plan Name */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Plan Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Monthly Plan, Premium Gold Pass"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Short summary of what meals or perks are included..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              {/* Price & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      placeholder="2500"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Duration (Days) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.durationDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, durationDays: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold"
                  >
                    <option value={7}>7 Days (1 Week)</option>
                    <option value={15}>15 Days (Fortnight)</option>
                    <option value={30}>30 Days (1 Month Standard)</option>
                    <option value={60}>60 Days (2 Months)</option>
                    <option value={90}>90 Days (Quarterly Semester)</option>
                  </select>
                </div>
              </div>

              {/* Meals Included Checkboxes */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Meals Included <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_MEAL_OPTIONS.map(meal => {
                    const selected = formData.mealsIncluded.includes(meal);
                    return (
                      <button
                        type="button"
                        key={meal}
                        onClick={() => toggleMeal(meal)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border flex items-center gap-1.5 ${
                          selected
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {selected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{meal}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Max Members & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Max Subscribers (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50 (blank = unlimited)"
                    value={formData.maxMembers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Plan Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold"
                  >
                    <option value="ACTIVE">Active (Live for Students)</option>
                    <option value="INACTIVE">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition shadow-md shadow-orange-600/30 flex items-center gap-1.5"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{editingPlan ? 'Save Changes' : 'Create Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
