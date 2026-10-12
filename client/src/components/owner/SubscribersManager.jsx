import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Users, Phone, Calendar, Search, Pause, CheckCircle2, Filter } from 'lucide-react';

export const SubscribersManager = ({ messId }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'ACTIVE', 'PAUSED'
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    if (!messId) {
      setCustomers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getOwnerCustomers(messId);
      if (res && res.customers) {
        setCustomers(res.customers);
      } else {
        setCustomers([]);
      }
    } catch (e) {
      console.warn('[SubscribersManager] Error fetching:', e);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [messId]);

  const filtered = customers.filter(c => {
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search)) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Student Subscribers</h3>
          <p className="text-[10px] text-slate-500">Track active & paused meal passes</p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold">
          {['ALL', 'ACTIVE', 'PAUSED'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterStatus === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search subscriber by student name or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {/* Roster List */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-400 space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Users className="w-8 h-8 mx-auto text-slate-300" />
          <p className="font-semibold text-slate-700">No active students enrolled yet</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            {search ? 'No student matches your search query.' : 'When students subscribe to your mess, their active and paused passes will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {filtered.map(cust => (
            <div
              key={cust.id}
              className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{cust.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      cust.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {cust.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500">{cust.plan}</div>

                {cust.currentPause && (
                  <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                    <span className="font-semibold">Paused until {cust.currentPause.endDate}: </span>
                    <span>{cust.currentPause.reason}</span>
                  </div>
                )}
              </div>

              <div className="text-right shrink-0">
                {cust.phone ? (
                  <a
                    href={`tel:${cust.phone}`}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition shadow-sm ml-auto"
                    title={`Call ${cust.phone}`}
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  </a>
                ) : null}
                <div className="text-[10px] text-slate-400 mt-1">Valid: {cust.endDate || 'Ongoing'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
