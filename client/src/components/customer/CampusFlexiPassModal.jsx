import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { sounds } from '../../utils/soundEffects';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Ticket, CheckCircle2, Sparkles, MapPin, Building, Star,
  Clock, Shield, ArrowRight, X, RefreshCw, Zap
} from 'lucide-react';

export const CampusFlexiPassModal = ({ isOpen, onClose, onOpenPassForMess }) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotification();

  const [tiers, setTiers] = useState([]);
  const [userPasses, setUserPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  const fetchFlexiData = async () => {
    setLoading(true);
    try {
      const [tiersRes, userRes] = await Promise.all([
        api.getFlexipassTiers(),
        currentUser?.id ? api.getUserFlexipasses(currentUser.id) : Promise.resolve({ flexipasses: [] })
      ]);

      if (tiersRes && tiersRes.tiers) setTiers(tiersRes.tiers);
      if (userRes && userRes.flexipasses) setUserPasses(userRes.flexipasses);
    } catch (e) {
      console.warn('[CampusFlexiPassModal] Failed to load:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFlexiData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurchase = async (tier) => {
    if (!currentUser?.id) {
      showToast('Please sign in as a student to purchase a FlexiPass.', 'info');
      return;
    }
    setPurchasing(true);
    try {
      const res = await api.subscribeFlexipass({
        userId: currentUser.id,
        tierId: tier.id,
        paymentMethod: 'UPI (Instant Demo)'
      });

      if (res && res.success) {
        sounds.playCashRegister();
        showToast(`Activated ${tier.name} with ${tier.mealCredits} meals!`, 'success', '🎫 FlexiPass Ready');
        fetchFlexiData();
        setSelectedTier(null);
      }
    } catch (e) {
      showToast('Failed to activate FlexiPass', 'error');
    } finally {
      setPurchasing(false);
    }
  };

  const activePass = userPasses.find(p => p.status === 'ACTIVE' && p.creditsRemaining > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 pb-4 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Phase 3 Innovation
            </span>
            <span className="text-[10px] text-slate-400">Multi-Mess Freedom</span>
          </div>

          <h2 className="text-lg font-extrabold text-white flex items-center gap-1.5">
            <span>Campus FlexiPass™</span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Never get bored of the same kitchen. Dine at any partner mess in your campus cluster!
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-600" />
              <p className="text-xs">Loading campus cluster network...</p>
            </div>
          ) : (
            <>
              {/* Active FlexiPass Card if student already has one */}
              {activePass ? (
                <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-lg space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                      Active Pass
                    </span>
                    <span className="text-[11px] text-indigo-200">
                      Valid till {activePass.validUntil}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base">{activePass.tierName}</h3>
                    <p className="text-xs text-indigo-200 mt-0.5">{activePass.clusterName}</p>
                  </div>

                  {/* Credits Gauge */}
                  <div className="p-3 bg-white/10 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-indigo-200">Meals Remaining</div>
                      <div className="text-2xl font-black">{activePass.creditsRemaining} / {activePass.totalCredits}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-[10px] text-indigo-200">Dined So Far</div>
                      <div className="font-bold">{activePass.creditsUsed} meals</div>
                    </div>
                  </div>

                  {/* Participating Messes Selector */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-indigo-100 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-300" />
                      <span>Choose where to dine today:</span>
                    </div>

                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {activePass.participatingMesses?.map(m => (
                        <div
                          key={m.id}
                          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-between text-xs transition"
                        >
                          <div>
                            <div className="font-bold text-white line-clamp-1">{m.name}</div>
                            <div className="text-[10px] text-indigo-200">{m.area} • {m.distance}</div>
                          </div>
                          <button
                            onClick={() => {
                              onClose();
                              onOpenPassForMess(m.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white text-indigo-900 font-bold text-[10px] hover:bg-indigo-50 shadow-xs"
                          >
                            Eat Here 🍲
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 text-amber-700" />
                    No Active Campus FlexiPass
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Get ultimate dining freedom. Subscribe below to eat at multiple kitchens with one pass!
                  </p>
                </div>
              )}

              {/* Available FlexiPass Tiers */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  <span>Available Campus FlexiPass Plans</span>
                </div>

                {tiers.map(tier => (
                  <div
                    key={tier.id}
                    className="p-4 rounded-3xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-slate-900">{tier.name}</span>
                          {tier.badge && (
                            <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[9px] font-black uppercase">
                              {tier.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{tier.description}</p>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-slate-900">₹{tier.price}</div>
                        <div className="text-[10px] text-emerald-700 font-bold">₹{tier.pricePerMeal}/meal</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-white p-2.5 rounded-2xl border border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-400">Total Meals</div>
                        <div className="font-bold text-slate-900">{tier.mealCredits}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Validity</div>
                        <div className="font-bold text-slate-900">{tier.validityDays} Days</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Kitchens</div>
                        <div className="font-bold text-indigo-600">{tier.participatingMessIds?.length || 6} Messes</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePurchase(tier)}
                      disabled={purchasing}
                      className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>{purchasing ? 'Activating...' : `Activate FlexiPass • ₹${tier.price}`}</span>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
