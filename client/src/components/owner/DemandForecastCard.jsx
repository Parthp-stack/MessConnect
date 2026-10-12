import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { TrendingUp, AlertTriangle, RefreshCw, ChefHat, Info } from 'lucide-react';

export const DemandForecastCard = ({ messId }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchForecast = async () => {
    if (!messId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getOwnerForecast(messId);
      if (res && res.forecast) {
        setForecast(res.forecast);
      }
    } catch (e) {
      console.warn('[DemandForecast] Error fetching:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [messId]);

  if (loading || !forecast) {
    return (
      <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
        <div className="h-20 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  const { breakdown, expectedTotal, safetyBufferPercentage, safetyBufferMeals, recommendedMealsToPrepare } = forecast;

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Tomorrow's Food Demand Forecast</h3>
            <p className="text-[10px] text-slate-400">AI & active subscription calculation</p>
          </div>
        </div>

        <button
          onClick={fetchForecast}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition"
          title="Refresh forecast"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 Meals Breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center backdrop-blur-sm">
          <div className="text-[10px] text-orange-300 font-semibold mb-1">🌅 Breakfast</div>
          <div className="text-xl font-extrabold text-white">{breakdown.breakfast.total}</div>
          <div className="text-[9px] text-slate-400">
            {breakdown.breakfast.active} active + {breakdown.breakfast.trials} trials
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center backdrop-blur-sm">
          <div className="text-[10px] text-amber-300 font-semibold mb-1">☀️ Lunch</div>
          <div className="text-xl font-extrabold text-white">{breakdown.lunch.total}</div>
          <div className="text-[9px] text-slate-400">
            {breakdown.lunch.active} active + {breakdown.lunch.trials} trials
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center backdrop-blur-sm">
          <div className="text-[10px] text-indigo-300 font-semibold mb-1">🌙 Dinner</div>
          <div className="text-xl font-extrabold text-white">{breakdown.dinner.total}</div>
          <div className="text-[9px] text-slate-400">
            {breakdown.dinner.active} active + {breakdown.dinner.trials} trials
          </div>
        </div>
      </div>

      {/* Safety Buffer & Recommended Production (Section 21) */}
      <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between mb-3">
        <div className="text-xs">
          <div className="text-slate-300">
            Expected Base: <span className="font-bold text-white">{expectedTotal}</span>
          </div>
          <div className="text-orange-300 text-[11px] font-medium mt-0.5">
            + {safetyBufferPercentage}% Buffer: <span className="font-bold text-orange-200">+{safetyBufferMeals} meals</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Recommended to Cook</div>
          <div className="text-2xl font-black text-orange-400">{recommendedMealsToPrepare}</div>
        </div>
      </div>

      {/* Important Disclaimer Notice (Section 21) */}
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-black/30 p-2 rounded-xl border border-white/5">
        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="font-medium text-amber-200/90 italic">"This is an estimate, not a guarantee."</span>
      </div>
    </div>
  );
};
