import React from 'react';
import { useApp } from '../../context/AppContext';
import { calculateDistanceKm } from '../../utils/geolocation';
import { Star, MapPin, Heart, ShieldCheck, Utensils, Coffee, Moon, Sun } from 'lucide-react';

export const MessCard = ({ mess, onOpenDetails, onBookTrial, onSubscribe }) => {
  const { favorites, toggleFavorite, userLocation } = useApp();
  const isFav = favorites.includes(mess.id);

  const computedDistance = (userLocation?.coords && mess.coordinates)
    ? calculateDistanceKm(userLocation.coords.lat, userLocation.coords.lng, mess.coordinates.lat, mess.coordinates.lng)
    : null;
  const displayDistance = computedDistance != null ? `${computedDistance} km away` : (mess.distance || '');

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition duration-200 flex flex-col group">
      {/* Cover Image & Badges */}
      <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
        <img
          src={mess.coverImage || '/logo.jpeg'}
          alt={mess.name}
          className="w-full h-full object-contain p-2 group-hover:scale-105 transition duration-300"
          loading="lazy"
        />
        
        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(mess.id);
          }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-700 shadow-sm hover:scale-110 active:scale-95 transition"
          aria-label="Save to favorites"
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
        </button>

        {/* Veg / Non-Veg Badge */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {mess.isPureVeg ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600/90 backdrop-blur-md text-white shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              Pure Veg
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-700/90 backdrop-blur-md text-white shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              Veg & Non-Veg
            </span>
          )}

          {mess.verified && (
            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-600/95 backdrop-blur-md text-white shadow-sm flex items-center gap-0.5">
              <ShieldCheck className="w-3 h-3" />
              Registered Partner
            </span>
          )}
        </div>

        {/* Trial Price Chip if available */}
        {mess.trialAvailable && (
          <div className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-medium">
            Trial Meal ₹{mess.trialPrice}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title & Rating */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={mess.logo || mess.coverImage || '/logo.jpeg'}
                alt=""
                className="w-7 h-7 rounded-xl object-contain bg-black p-0.5 shrink-0 border border-slate-200"
              />
              <h4
                onClick={() => onOpenDetails(mess.id)}
                className="font-bold text-slate-900 text-sm hover:text-orange-600 transition cursor-pointer truncate"
              >
                {mess.name}
              </h4>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-xs shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{mess.rating}</span>
            </div>
          </div>

          {/* Location & Distance */}
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{mess.area}, {mess.city}</span>
            {displayDistance && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-slate-600 shrink-0">{displayDistance}</span>
              </>
            )}
          </div>

          {/* Price and Meal Icons */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <span className="text-base font-extrabold text-slate-900">₹{mess.pricePerMonth}</span>
              <span className="text-[11px] text-slate-400"> / month</span>
            </div>

            {/* Meal Badges: Breakfast, Lunch, Dinner */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500" title="Breakfast, Lunch, Dinner available">
              <span className="p-1 rounded-md bg-orange-50 text-orange-600" title="Breakfast">🍳</span>
              <span className="p-1 rounded-md bg-amber-50 text-amber-700" title="Lunch">🍛</span>
              <span className="p-1 rounded-md bg-indigo-50 text-indigo-600" title="Dinner">🌙</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: [Menu] [Try] [Subscribe] */}
        <div className="grid grid-cols-3 gap-1.5 text-xs">
          <button
            onClick={() => onOpenDetails(mess.id, 'menu')}
            className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition text-center text-[11px]"
          >
            Menu
          </button>

          {mess.trialAvailable ? (
            <button
              onClick={() => onBookTrial(mess)}
              className="py-2 px-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold transition text-center text-[11px]"
            >
              Try ₹{mess.trialPrice}
            </button>
          ) : (
            <button
              disabled
              className="py-2 px-2 rounded-xl bg-slate-50 text-slate-400 font-medium text-center text-[11px]"
            >
              No Trial
            </button>
          )}

          <button
            onClick={() => onSubscribe(mess)}
            className="py-2 px-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition text-center text-[11px] shadow-sm shadow-orange-500/20"
          >
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
};
