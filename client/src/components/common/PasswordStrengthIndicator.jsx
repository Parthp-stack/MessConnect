import React from 'react';
import { CheckCircle2, Circle, AlertCircle, ShieldCheck } from 'lucide-react';
import { PASSWORD_RULES, validatePassword } from '../../utils/passwordValidator';

export const PasswordStrengthIndicator = ({
  password = '',
  hasAttemptedSubmit = false,
  dark = false
}) => {
  const { ruleResults, isValid, failedRules } = validatePassword(password);
  const passedCount = ruleResults.filter(r => r.passed).length;

  if (!password && !hasAttemptedSubmit) {
    return (
      <div className={`mt-2 p-2.5 rounded-xl text-[11px] border ${
        dark 
          ? 'bg-slate-900/60 border-slate-700/60 text-slate-400' 
          : 'bg-slate-50 border-slate-200 text-slate-500'
      }`}>
        <div className="font-semibold mb-1 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
          <span>Strong Password Requirements:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10.5px]">
          {PASSWORD_RULES.map(rule => (
            <div key={rule.id} className="flex items-center gap-1.5 opacity-80">
              <Circle className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{rule.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate strength level
  let strengthLabel = 'Very Weak';
  let barColor = 'bg-rose-500';
  let barWidth = 'w-1/5';
  let textColor = 'text-rose-500';

  if (passedCount === 5) {
    strengthLabel = 'Strong Password';
    barColor = 'bg-emerald-500';
    barWidth = 'w-full';
    textColor = 'text-emerald-500';
  } else if (passedCount === 4) {
    strengthLabel = 'Good (Almost there)';
    barColor = 'bg-blue-500';
    barWidth = 'w-4/5';
    textColor = 'text-blue-500';
  } else if (passedCount >= 2) {
    strengthLabel = 'Moderate';
    barColor = 'bg-amber-500';
    barWidth = 'w-3/5';
    textColor = 'text-amber-500';
  }

  const showErrorBorder = hasAttemptedSubmit && !isValid;

  return (
    <div className={`mt-2 p-3 rounded-2xl border transition-all ${
      showErrorBorder
        ? (dark ? 'bg-rose-950/40 border-rose-600/60' : 'bg-rose-50/80 border-rose-300')
        : (dark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200')
    }`}>
      {/* Progress Bar & Header */}
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className={`text-[11px] font-bold ${
          showErrorBorder ? 'text-rose-600' : (dark ? 'text-slate-300' : 'text-slate-700')
        }`}>
          {isValid ? 'Security Requirements Met' : 'Password Security Rules'}
        </span>
        <span className={`text-[11px] font-extrabold ${textColor}`}>
          {strengthLabel}
        </span>
      </div>

      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2.5">
        <div className={`h-full ${barColor} ${barWidth} transition-all duration-300 rounded-full`} />
      </div>

      {/* Checklist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
        {ruleResults.map((rule) => {
          const isPassed = rule.passed;
          const isFailedAfterSubmit = hasAttemptedSubmit && !isPassed;

          return (
            <div
              key={rule.id}
              className={`flex items-center gap-1.5 transition-colors ${
                isPassed
                  ? (dark ? 'text-emerald-400 font-medium' : 'text-emerald-700 font-medium')
                  : isFailedAfterSubmit
                  ? 'text-rose-600 font-semibold animate-pulse'
                  : (dark ? 'text-slate-400' : 'text-slate-500')
              }`}
            >
              {isPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : isFailedAfterSubmit ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-400/70 shrink-0" />
              )}
              <span>{rule.label}</span>
            </div>
          );
        })}
      </div>

      {hasAttemptedSubmit && !isValid && (
        <div className="mt-2 pt-2 border-t border-rose-200 dark:border-rose-800/40 text-[11px] text-rose-600 font-bold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Please satisfy all highlighted requirements to continue.</span>
        </div>
      )}
    </div>
  );
};
