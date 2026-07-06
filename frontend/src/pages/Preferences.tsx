import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ToggleLeft, ToggleRight, Save, ShieldAlert, Sparkles, Send } from 'lucide-react';

export const Preferences: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Preference Settings
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(true);
  const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(true);
  const [digestEnabled, setDigestEnabled] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const res = await api.get('/preferences');
        const data = res.data;
        setEmailEnabled(data.emailEnabled);
        setSmsEnabled(data.smsEnabled);
        setPushEnabled(data.pushEnabled);
        setMarketingEnabled(data.marketingEnabled);
        setSecurityAlertsEnabled(data.securityAlertsEnabled);
        setDigestEnabled(data.digestEnabled);
      } catch (err) {
        console.error('Failed to load preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError('');

    try {
      await api.put('/preferences', {
        emailEnabled,
        smsEnabled,
        pushEnabled,
        marketingEnabled,
        securityAlertsEnabled,
        digestEnabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to update preference settings.');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-slate-500 text-xs">Loading preferences...</div>;
  }

  const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="bg-transparent border-0 cursor-pointer text-indigo-400 hover:text-indigo-300 transition-colors"
    >
      {checked ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-slate-600" />}
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Delivery Preferences</h1>
        <p className="text-slate-400 text-sm">Control notification channels and digest triggers</p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
          Preference settings updated successfully.
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="glass rounded-xl p-6 space-y-6 divide-y divide-slate-800/65">
        {/* Core Channels */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" /> Notification Channels
          </h4>
          <div className="flex justify-between items-center py-2">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Email Alerts</span>
              <span className="text-[11px] text-slate-400">Receive template updates and transactional receipts</span>
            </div>
            <Switch checked={emailEnabled} onChange={setEmailEnabled} />
          </div>

          <div className="flex justify-between items-center py-2">
            <div>
              <span className="text-xs font-bold text-slate-200 block">SMS Messages</span>
              <span className="text-[11px] text-slate-400">Receive critical notifications directly on your phone</span>
            </div>
            <Switch checked={smsEnabled} onChange={setSmsEnabled} />
          </div>

          <div className="flex justify-between items-center py-2">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Browser Push Notifications</span>
              <span className="text-[11px] text-slate-400">Receive real-time banners inside active window sessions</span>
            </div>
            <Switch checked={pushEnabled} onChange={setPushEnabled} />
          </div>
        </div>

        {/* Content Settings */}
        <div className="space-y-4 pt-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> Subscription Content Categories
          </h4>
          <div className="flex justify-between items-center py-2">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Security Auditing & MFA</span>
              <span className="text-[11px] text-slate-400">Must remain enabled for billing invoices and OTP tokens</span>
            </div>
            <Switch checked={securityAlertsEnabled} onChange={setSecurityAlertsEnabled} />
          </div>

          <div className="flex justify-between items-center py-2">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Promotional Campaigns</span>
              <span className="text-[11px] text-slate-400">Receive marketing highlights and feature announcements</span>
            </div>
            <Switch checked={marketingEnabled} onChange={setMarketingEnabled} />
          </div>

          <div className="flex justify-between items-center py-2">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Weekly Digest Compilation</span>
              <span className="text-[11px] text-slate-400">Coalesce notifications into a single weekly email overview</span>
            </div>
            <Switch checked={digestEnabled} onChange={setDigestEnabled} />
          </div>
        </div>

        <div className="pt-6">
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
          >
            <Save className="w-4 h-4" /> Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
