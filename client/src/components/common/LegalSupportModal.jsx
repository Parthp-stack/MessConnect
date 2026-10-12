import React, { useState, useEffect } from 'react';
import {
  X, Phone, Mail, MessageSquare, Headphones, Shield,
  ShieldCheck, FileText, Lock, HelpCircle, CheckCircle2,
  ChevronDown, ChevronRight, ExternalLink, Clock, MapPin,
  AlertCircle, Sparkles, HeartHandshake, Send, IndianRupee,
  Info, ArrowRight
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { SUPPORT_CONTACTS } from '../../context/AuthContext';
import { api } from '../../services/api';

export const LegalSupportModal = ({ isOpen, onClose, initialTab = 'support' }) => {
  const { showToast } = useNotification();
  const [activeTab, setActiveTab] = useState(initialTab); // 'support' | 'legal' | 'privacy' | 'refund'

  // Support ticket form state
  const [ticketName, setTicketName] = useState('');
  const [ticketContact, setTicketContact] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Meal Pass & Scanner');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FAQ expanded state
  const [expandedFaq, setExpandedFaq] = useState(0);

  // Sync tab when opened with different initialTab
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    setTicketSubmitted(false);
  }, [initialTab, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!ticketContact || !ticketMessage) {
      showToast('Please provide your contact details and message.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitSupportQuery({
        name: ticketName.trim() || undefined,
        contact: ticketContact.trim(),
        email: ticketContact.includes('@') ? ticketContact.trim() : undefined,
        category: ticketCategory,
        message: ticketMessage.trim()
      });

      setIsSubmitting(false);
      setTicketSubmitted(true);
      showToast(
        'Your query has been sent to our campus admin team at exampleexample942349@gmail.com!',
        'success',
        `🎧 Ticket #${res?.ticketId || 'MC-' + Math.floor(100000 + Math.random() * 900000)}`
      );
      setTicketMessage('');
    } catch (err) {
      setIsSubmitting(false);
      showToast(err.message || 'Failed to submit query. Please try again.', 'error');
    }
  };

  const faqs = [
    {
      q: 'What is the refund policy for students on MessConnect?',
      a: 'MessConnect enforces a strict NO REFUND POLICY for students once a subscription plan is purchased and activated. If an exceptional refund policy issue occurs (such as sudden medical emergency or campus relocation), the student and mess owner can contact each other directly to settle the matter mutually. For platform commission issues, mess owners must contact the Admin directly.'
    },
    {
      q: 'How are mess owner platform commission issues resolved?',
      a: 'Platform commission issues can only be solved by the Admin. Mess owners cannot settle commission disputes with students. For any fee deductions, payout calculations, or commission questions, please contact Admin Support directly: Rohit (8766793139), Shreyash (9309294400), or Parth (9423490513).'
    },
    {
      q: 'How do I pause my mess subscription when going home for holidays or exams?',
      a: 'You can pause your subscription with 12 hours advance notice via your Student Settings -> Subscription tab (up to 7 days per 30-day plan). Paused days automatically extend your plan expiration date so you never lose meal money.'
    },
    {
      q: 'How does the Digital QR Meal Pass work at the kitchen entrance?',
      a: 'Every student has a dynamic meal pass QR code in their dashboard. Simply present the QR code on your mobile screen to the mess owner or scanner at meal time. The owner scans it and verifies your check-in in under 2 seconds.'
    },
    {
      q: 'What should I do if food quality, taste, or hygiene does not meet expectations?',
      a: 'All MessConnect partner kitchens are FSSAI-certified. You can report meal quality directly via the Mess Details modal or rate your meals. Our MITAOE Alandi campus audit team reviews complaints within 24 hours.'
    },
    {
      q: 'How do mess owners get paid and verified on MessConnect?',
      a: 'Mess owners undergo strict KYC verification including FSSAI food licenses, premises proof, and Aadhaar identity. Payouts for subscriptions are disbursed seamlessly into their registered bank account minus the standard platform commission.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50/70 to-amber-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black shadow-xs">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                  MessConnect Campus Help & Information Center
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold">
                  24/7 MITAOE Alandi Admin Support
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Customer care, verified mess standards, terms of service & student privacy
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 bg-white border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('support')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'support'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>🎧 Customer Care & Support</span>
          </button>

          <button
            onClick={() => setActiveTab('legal')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'legal'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>⚖️ Legal & Terms of Service</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>🛡️ Privacy & Data Protection</span>
          </button>

          <button
            onClick={() => setActiveTab('refund')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'refund'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            <span>💳 Cancellation & Refunds</span>
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-700">
          
          {/* ================= TAB 1: CUSTOMER CARE & SUPPORT ================= */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              
              {/* Support & Admin Desk Direct Helplines */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Dedicated Admin Support Team (Helplines & Commission)</span>
                  </span>
                  <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    Admin Support Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SUPPORT_CONTACTS.map((person) => {
                    const isAdmin = person.type === 'admin';
                    return (
                      <div
                        key={person.id}
                        className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                          isAdmin
                            ? 'bg-gradient-to-br from-indigo-50/90 via-slate-50 to-indigo-50/50 border-indigo-200/90 shadow-2xs'
                            : 'bg-white border-slate-200/80 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isAdmin ? 'bg-indigo-600 text-white' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {person.name[0]}
                            </div>
                            <div>
                              <div className="font-black text-slate-900 text-xs sm:text-sm">
                                {person.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {person.role}
                              </div>
                            </div>
                          </div>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            isAdmin
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {person.badge}
                          </span>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Helpline Number</div>
                          <div className="font-mono font-extrabold text-slate-800 text-xs">
                            {person.formattedPhone}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <a
                            href={person.callUrl}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition flex items-center justify-center gap-1 border border-blue-200/70"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                          <a
                            href={person.whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] transition flex items-center justify-center gap-1 border border-emerald-200/70"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        </div>

                        <div className="text-[9px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                          <span>{person.hours}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Official Email & Escalation Card */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-amber-950 text-xs block">Official Email & Platform Escalations</span>
                    <span className="text-amber-700 text-[11px]">
                      support@messconnect.in • admin@messconnect.in
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-800 font-semibold bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                    Response within 24 hours
                  </span>
                </div>
              </div>

              {/* Campus Desk Address Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">MessConnect Campus Representative Desk</span>
                    <span className="text-slate-500 text-[11px]">
                      Near Pune University Main Gate, Ganeshkhind Road, Pune 411007, Maharashtra
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Desk Open Today
                  </span>
                </div>
              </div>

              {/* Support Ticket Submission Form */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-orange-600" />
                      <span>Submit a Campus Support Ticket / Query</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Have a query, refund issue, or feedback? Your message will be sent directly to admin at <span className="font-semibold text-slate-700">exampleexample942349@gmail.com</span>.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md">
                    Avg Response: 2 Hrs
                  </span>
                </div>

                {ticketSubmitted ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <div className="font-bold text-xs">Your Query Has Been Submitted!</div>
                    <p className="text-[11px] text-emerald-700">
                      Your query has been dispatched directly to our admin team at <strong className="text-emerald-900">exampleexample942349@gmail.com</strong>. We will review and get in touch with you shortly.
                    </p>
                    <button
                      onClick={() => setTicketSubmitted(false)}
                      className="mt-2 text-xs text-emerald-800 underline font-semibold cursor-pointer"
                    >
                      Submit another inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleTicketSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Your Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Nilesh Patil"
                          value={ticketName}
                          onChange={(e) => setTicketName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Email or Phone</label>
                        <input
                          type="text"
                          required
                          placeholder="student@gmail.com / 98765..."
                          value={ticketContact}
                          onChange={(e) => setTicketContact(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                        <select
                          value={ticketCategory}
                          onChange={(e) => setTicketCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20"
                        >
                          <option value="Meal Pass & Scanner">Meal Pass QR / Scanner Issue</option>
                          <option value="Subscription & Payment">Subscription or Payment Query</option>
                          <option value="Mess Hygiene & Quality">Mess Hygiene / Food Feedback</option>
                          <option value="Mess Owner Inquiry">Mess Kitchen Partner Onboarding</option>
                          <option value="Other">Other Query</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Your Message / Query Details</label>
                      <textarea
                        rows="2"
                        required
                        placeholder="Describe your issue or question in detail..."
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Frequently Asked Questions */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-orange-600" />
                  <span>Frequently Asked Student & Partner Questions</span>
                </div>

                <div className="space-y-2">
                  {faqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-2xl overflow-hidden bg-white"
                    >
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === idx ? -1 : idx)}
                        className="w-full p-3 text-left font-bold text-slate-800 text-xs flex items-center justify-between hover:bg-slate-50 transition"
                      >
                        <span>{faq.q}</span>
                        {expandedFaq === idx ? (
                          <ChevronDown className="w-4 h-4 text-orange-600 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>
                      {expandedFaq === idx && (
                        <div className="p-3 pt-0 text-slate-600 text-[11px] leading-relaxed border-t border-slate-100 bg-slate-50/50">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ================= TAB 2: LEGAL & TERMS OF SERVICE ================= */}
          {activeTab === 'legal' && (
            <div className="space-y-4 leading-relaxed">
              
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-orange-950 text-xs">
                    Official MessConnect Platform & Dining Agreement
                  </div>
                  <p className="text-[11px] text-orange-800">
                    Last updated: September 2026. By registering as a student diner or mess partner on MessConnect, you agree to these legal conditions of service.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">1. Platform Nature & Scope of Service</div>
                <p className="text-[11px] text-slate-600">
                  MessConnect serves as a digital discovery, subscription management, and contactless QR meal check-in infrastructure connecting students with independent mess kitchen partners across MITAOE Alandi and Pune college campuses. MessConnect does not directly operate kitchens, but establishes mandatory hygiene, inspection, and contractual quality benchmarks for all listed mess partners.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">2. Partner Hygiene & FSSAI Food Safety Compliance</div>
                <p className="text-[11px] text-slate-600">
                  Every mess kitchen listed on MessConnect must hold a valid 14-digit FSSAI (Food Safety and Standards Authority of India) license, undergo verified kitchen document inspections by our compliance team, and strictly abide by clean cooking, potable RO drinking water, and sanitization standards.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">3. Student Digital Pass & Check-In Rules</div>
                <p className="text-[11px] text-slate-600">
                  Digital meal passes are generated specifically for the verified registered student. Digital passes are strictly non-transferable and may not be duplicated or shared with non-subscribed individuals. Mess owners reserve the right to verify student identity upon pass scanning.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">4. Daily Menu Lineup Updates & Accuracy</div>
                <p className="text-[11px] text-slate-600">
                  Mess partners commit to maintaining up-to-date breakfast, lunch, and dinner menus. Whenever an owner publishes changes to today's dishes, automated email notifications are dispatched directly to active subscribers. While seasonal produce variations may occur, substitutions must be of equivalent nutritional quality.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">5. Grievance Redressal & Legal Jurisdiction</div>
                <p className="text-[11px] text-slate-600">
                  Any dispute, claim, or feedback regarding platform service shall be governed by the laws of India, subject to the exclusive jurisdiction of the competent courts in Pune, Maharashtra. Formal grievances may be addressed to <span className="font-semibold text-slate-800">legal@messconnect.in</span>.
                </p>
              </div>

            </div>
          )}

          {/* ================= TAB 3: PRIVACY & DATA PROTECTION ================= */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 leading-relaxed">
              
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-emerald-950 text-xs">
                    Student & Partner Data Protection Guarantee
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    We treat student and mess owner data with strict confidentiality. No third-party data selling, no advertising spam.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">1. Information We Collect</div>
                <p className="text-[11px] text-slate-600">
                  To provide secure dining access, we collect your name, college email address, contact phone number, campus locality, subscribed mess plan details, and meal check-in timestamps. For mess owners, business licenses, FSSAI registration numbers, and kitchen verification proofs are gathered.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">2. Zero Spam & Transactional Communication Only</div>
                <p className="text-[11px] text-slate-600">
                  We use your registered email strictly for essential service notices: 6-digit login/password reset OTPs, subscription confirmations, payment receipts, and automated daily meal menu updates from your subscribed mess. We will never send unsolicited marketing promotions.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">3. Payment & Banking Privacy</div>
                <p className="text-[11px] text-slate-600">
                  Payments made via UPI, QR code, or cards are processed directly by certified RBI-regulated payment gateways. MessConnect never collects, stores, or transmits raw banking passwords, UPI PINs, or card CVV numbers.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">4. Dynamic QR Token & Location Privacy</div>
                <p className="text-[11px] text-slate-600">
                  Your meal check-in QR code uses time-bound encrypted tokens to prevent replay attacks and fraudulent pass cloning. Geolocation data is accessed only when you explicitly search for nearby messes and is never tracked continuously in the background.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-xs">5. Data Subject Rights & Account Deletion</div>
                <p className="text-[11px] text-slate-600">
                  You have the permanent right to inspect your saved profile details, download your check-in records, or request complete account erasure by contacting our Data Protection Officer at <span className="font-semibold text-slate-800">privacy@messconnect.in</span>.
                </p>
              </div>

            </div>
          )}

          {/* ================= TAB 4: CANCELLATION & REFUNDS ================= */}
          {activeTab === 'refund' && (
            <div className="space-y-4 leading-relaxed">
              
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-rose-950 text-xs">
                      Official No-Refund Policy & Commission Dispute Protocol
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      Effective Date: September 23, 2026
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-900 leading-relaxed">
                    All registered students and mess owners must adhere to this official policy regarding student payments, exceptional refund requests, and platform commission resolution.
                  </p>
                </div>
              </div>

              {/* Core Clause 1: Strict No-Refund Policy for Students */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                  <span>Strict NO REFUND Policy for Students</span>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed pl-7">
                  MessConnect enforces a <strong>strict No-Refund Policy for all students</strong>. Once a monthly meal subscription or digital meal pass has been booked and paid for, <strong>no monetary refunds will be issued by the platform</strong>. Students are strongly advised to inspect mess photos, weekly menus, and book a single trial meal before committing to a full subscription pass.
                </p>
              </div>

              {/* Core Clause 2: Student & Mess Owner Direct Contact for Refund Policy Issues */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="font-extrabold text-amber-950 text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                  <span>Student & Mess Owner Dispute Contact for Exceptional Refund Issues</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed pl-7">
                  If an exceptional refund policy issue occurs for a student (such as severe medical emergency, verified college discontinuation, or mess quality grievance), <strong>the student and the mess owner can contact each other directly</strong> to negotiate and resolve the matter. The mess owner has full discretion to offer mutual off-platform arrangements, replacement meal passes, or manual adjustments directly with the student.
                </p>
              </div>

              {/* Core Clause 3: Platform Commission Issues — Solved ONLY by Admin */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
                <div className="font-extrabold text-indigo-950 text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
                  <span>Platform Commission Issues: Solved Exclusively by Admin</span>
                </div>
                <p className="text-[11px] text-indigo-900 leading-relaxed pl-7">
                  <strong>Notice to Mess Owners:</strong> Commission-related issues <strong>cannot be settled with students and can only be solved by the Admin</strong>. Any issue, calculation dispute, fee percentage inquiry, or payout deduction regarding the <strong>Mess Owner Commission</strong> will be investigated and resolved exclusively by the Platform Admin. Mess owners must <strong>contact the Admin Support team</strong> directly:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 pl-7">
                  {SUPPORT_CONTACTS.map((person) => (
                    <div key={person.id} className="p-2.5 rounded-xl bg-white border border-indigo-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">{person.name}</div>
                        <div className="text-[10px] text-indigo-600 font-mono font-bold">{person.formattedPhone}</div>
                      </div>
                      <a
                        href={person.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition"
                      >
                        Contact
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clause 4: Exam & Vacation Pause Protection */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                <div className="font-extrabold text-emerald-950 text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">4</span>
                  <span>Exam & Vacation Pause Protection (Zero Financial Loss)</span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed pl-7">
                  Because subscriptions are non-refundable, students are provided the <strong>Exam & Holiday Meal Pause</strong>. You can pause your dining pass for up to 7 days per month with 12 hours advance notice via Student Settings. All paused days automatically extend your plan expiration date, ensuring you never forfeit money during semester breaks or festivals.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Official MessConnect Consumer Charter • MITAOE Alandi Edition</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href="https://wa.me/919423490513"
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Admin WhatsApp Helpline</span>
            </a>

            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
