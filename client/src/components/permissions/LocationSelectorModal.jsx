import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNotification } from '../../context/NotificationContext';
import { detectCurrentLocation, fetchLiveLocationZomatoStyle } from '../../utils/geolocation';
import { MapPin, Navigation, Search, Check, X, AlertCircle, Sparkles, Compass } from 'lucide-react';

const POPULAR_STUDENT_AREAS = [
  { area: "Alandi", city: "Pune", pincode: "412105", landmark: "MIT Academy of Engineering (MITAOE Flagship Campus)", isFlagship: true },
  { area: "Moshi", city: "Pune", pincode: "412105", landmark: "Near Alandi Engineering Hub" },
  { area: "Ravet", city: "Pune", pincode: "412101", landmark: "Near PCCOE / DY Patil" },
  { area: "Bhosari", city: "Pune", pincode: "411039", landmark: "Dighi-Alandi Link Road" },
  { area: "Kothrud", city: "Pune", pincode: "411038", landmark: "Near MIT / Bharati Vidyapeeth" },
  { area: "Wakad", city: "Pune", pincode: "411033", landmark: "Dange Chowk / JSPM" },
  { area: "Karve Nagar", city: "Pune", pincode: "411052", landmark: "Near Cummins / MMCOE" },
  { area: "FC Road", city: "Pune", pincode: "411004", landmark: "Near Fergusson / BMCC" },
  { area: "Viman Nagar", city: "Pune", pincode: "411014", landmark: "Near Symbiosis Campus" },
  { area: "Hinjawadi", city: "Pune", pincode: "411057", landmark: "Phase 1 / Infosys Circle" },
  { area: "Aundh", city: "Pune", pincode: "411007", landmark: "Near University Gate" },
  { area: "Baner", city: "Pune", pincode: "411045", landmark: "Balewadi High Street" }
];

export const LocationSelectorModal = ({ isOpen, onClose }) => {
  const { userLocation, updateLocation } = useApp();
  const { showToast } = useNotification();
  const [manualArea, setManualArea] = useState('');
  const [manualCity, setManualCity] = useState('Pune');
  const [manualPincode, setManualPincode] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  if (!isOpen) return null;

  // Method 2: Current Location (Zomato-style Live GPS Reverse-Geocoding into Real Locality Name)
  const handleUseCurrentLocation = async () => {
    setGeoLoading(true);
    setGeoError(null);

    try {
      const resolved = await fetchLiveLocationZomatoStyle();
      updateLocation({
        method: 'GPS',
        area: resolved.area,
        city: resolved.city,
        pincode: resolved.pincode,
        label: resolved.label,
        coords: resolved.coords,
        landmark: resolved.landmark
      });
      showToast(`Location set to: ${resolved.label}`, 'success', '📍 Live GPS Location (Zomato-style)');
      onClose();
    } catch (err) {
      console.warn('Geolocation failed:', err);
      setGeoError('Could not fetch live location. Please select MITAOE Alandi or your campus from below.');
    } finally {
      setGeoLoading(false);
    }
  };

  // Method 1: Manual Submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualArea.trim()) return;

    const areaName = manualArea.trim();
    const cityName = manualCity.trim() || 'Pune';
    updateLocation({
      method: 'MANUAL',
      area: areaName,
      city: cityName,
      pincode: manualPincode.trim() || '411001',
      label: `${areaName}, ${cityName}`,
      coords: { lat: 18.5204, lng: 73.8567 }
    });
    showToast(`Location set to ${areaName}, ${cityName}`, 'success', '📍 Location Updated');
    onClose();
  };

  // Select Quick Chip
  const selectQuickArea = (item) => {
    updateLocation({
      method: 'MANUAL',
      area: item.area,
      city: item.city,
      pincode: item.pincode,
      label: `${item.area}, ${item.city}`,
      coords: { lat: 18.5204, lng: 73.8567 }
    });
    showToast(`Location set to ${item.area}, ${item.city}`, 'success', '📍 Campus Selected');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Select Your Location</h3>
              <p className="text-[11px] text-slate-500">Discover messes delivering near your stay</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Location Card */}
        <div className="mb-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Active Location</span>
              <span className="font-extrabold text-slate-900 truncate block text-xs">{userLocation.label}</span>
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
            userLocation.method === 'GPS'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : userLocation.method === 'Network'
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'bg-slate-200 text-slate-700'
          }`}>
            {userLocation.method === 'GPS' ? '🛰️ Live GPS' : userLocation.method === 'Network' ? '🌐 Live Detected' : 'Manual'}
          </span>
        </div>

        {/* Method 2: Zomato-Style Live Location Card */}
        <div
          onClick={!geoLoading ? handleUseCurrentLocation : undefined}
          className={`p-3.5 rounded-2xl border-2 transition mb-3 cursor-pointer group select-none ${
            geoLoading
              ? 'bg-orange-50/70 border-orange-300 opacity-90'
              : 'bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 hover:from-orange-500/15 hover:via-amber-500/15 border-orange-500/40 hover:border-orange-500 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/30 group-hover:scale-105 transition">
              <Navigation className={`w-5 h-5 ${geoLoading ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-orange-950 text-xs flex items-center gap-1.5">
                <span>{geoLoading ? 'Fetching Live Location...' : 'Detect Current Location'}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-orange-600 text-white">
                  Live GPS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {geoLoading ? 'Resolving street & campus name (No IP)...' : 'Using GPS • Fetches real location name like Zomato'}
              </p>
            </div>
          </div>
        </div>

        {geoError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>{geoError}</div>
          </div>
        )}

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">or enter manually</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Method 1: Manual Location Entry Form */}
        <form onSubmit={handleManualSubmit} className="space-y-3 mt-3">
          <div>
            <label className="text-[11px] font-medium text-slate-600 mb-1 block">Area / Locality / Hostel Campus</label>
            <input
              type="text"
              placeholder="e.g. Kothrud, Karve Road, Near MIT"
              value={manualArea}
              onChange={(e) => setManualArea(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-600 mb-1 block">City</label>
              <input
                type="text"
                placeholder="Pune"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600 mb-1 block">Pincode</label>
              <input
                type="text"
                placeholder="411038"
                value={manualPincode}
                onChange={(e) => setManualPincode(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!manualArea.trim()}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition mt-2"
          >
            Apply Manual Location
          </button>
        </form>

        {/* Quick Student Hubs */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              College Dining Clusters
            </label>
            <span className="text-[10px] text-orange-600 font-extrabold bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
              MITAOE Alandi Edition
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {POPULAR_STUDENT_AREAS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => selectQuickArea(item)}
                className={`p-2 rounded-xl text-left border text-xs transition flex items-center justify-between ${
                  item.isFlagship
                    ? 'border-orange-500/80 bg-orange-50/90 text-orange-950 font-bold shadow-2xs'
                    : userLocation.area === item.area
                    ? 'border-orange-500 bg-orange-50/70 text-orange-950 font-semibold'
                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div>
                  <div className="font-medium leading-tight flex items-center gap-1">
                    <span>{item.area}</span>
                    {item.isFlagship && (
                      <span className="text-[8px] bg-orange-600 text-white px-1 rounded-sm uppercase tracking-wider font-black">
                        Flagship
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{item.landmark}</div>
                </div>
                {userLocation.area === item.area && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
