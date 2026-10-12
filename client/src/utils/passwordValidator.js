/**
 * Client Password Validator
 * Enforces strong password rules:
 * 1. Minimum 8 characters
 * 2. At least one uppercase letter (A-Z)
 * 3. At least one lowercase letter (a-z)
 * 4. At least one number (0-9)
 * 5. At least one special character (!@#$%^&* etc.)
 */

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: 'At least 8 characters long',
    hint: '8+ chars',
    test: (pw) => (pw || '').length >= 8
  },
  {
    id: 'uppercase',
    label: 'At least one uppercase letter (A-Z)',
    hint: '1 Uppercase (A-Z)',
    test: (pw) => /[A-Z]/.test(pw || '')
  },
  {
    id: 'lowercase',
    label: 'At least one lowercase letter (a-z)',
    hint: '1 Lowercase (a-z)',
    test: (pw) => /[a-z]/.test(pw || '')
  },
  {
    id: 'number',
    label: 'At least one number (0-9)',
    hint: '1 Number (0-9)',
    test: (pw) => /[0-9]/.test(pw || '')
  },
  {
    id: 'special',
    label: 'At least one special character (!@#$%^&* etc.)',
    hint: '1 Special char (!@#$)',
    test: (pw) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw || '')
  }
];

export function validatePassword(password) {
  const pw = String(password || '');
  const ruleResults = PASSWORD_RULES.map(rule => ({
    ...rule,
    passed: rule.test(pw)
  }));

  const failedRules = ruleResults.filter(r => !r.passed);
  const isValid = failedRules.length === 0;

  return {
    isValid,
    ruleResults,
    failedRules,
    errorSummary: failedRules.length > 0
      ? `Password does not satisfy all rules:\n• ${failedRules.map(r => r.label).join('\n• ')}`
      : ''
  };
}
