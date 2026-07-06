import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Send, Calendar, AlertCircle, FileText, User } from 'lucide-react';

export const Composer: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<'EMAIL' | 'SMS' | 'PUSH'>('EMAIL');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [targetUserId, setTargetUserId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [variablesInput, setVariablesInput] = useState<Record<string, string>>({});

  // Status
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Load templates & users
    const loadComposerData = async () => {
      try {
        const [templatesRes, usersRes] = await Promise.all([
          api.get('/templates'),
          api.get('/users'),
        ]);
        setTemplates(templatesRes.data || []);
        setUsers(usersRes.data || []);
        if (usersRes.data?.length > 0) {
          setTargetUserId(usersRes.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load composer lists:', err);
      }
    };
    loadComposerData();
  }, []);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    if (!id) {
      setMessage('');
      setSubject('');
      setVariablesInput({});
      return;
    }

    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setChannel(tpl.channel);
      setSubject(tpl.subject || '');
      setMessage(tpl.body || '');

      // Setup placeholder variables
      const vars: Record<string, string> = {};
      tpl.variables.forEach((v: string) => {
        vars[v] = '';
      });
      setVariablesInput(vars);
    }
  };

  const handleVariableChange = (key: string, value: string) => {
    const updated = { ...variablesInput, [key]: value };
    setVariablesInput(updated);

    // Dynamic replacement preview
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      let bodyText = tpl.body;
      let subjectText = tpl.subject || '';

      Object.entries(updated).forEach(([k, v]) => {
        const regex = new RegExp(`{{${k}}}`, 'g');
        bodyText = bodyText.replace(regex, v || `{{${k}}}`);
        subjectText = subjectText.replace(regex, v || `{{${k}}}`);
      });

      setMessage(bodyText);
      setSubject(subjectText);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const payload = {
        title,
        subject: channel === 'EMAIL' ? subject : undefined,
        message,
        priority,
        channel,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        targetUserId,
        templateId: templateId || undefined,
      };

      await api.post('/notifications', payload);
      setInfo(scheduledFor ? 'Notification scheduled successfully!' : 'Notification dispatched to queue!');

      // Reset form
      setTitle('');
      setSubject('');
      setMessage('');
      setTemplateId('');
      setScheduledFor('');
      setVariablesInput({});
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to dispatch notification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notification Composer</h1>
        <p className="text-slate-400 text-sm">Design and dispatch immediate or scheduled notifications</p>
      </div>

      {info && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
          {info}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSend} className="glass rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Recipient */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Target Recipient
            </label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Template */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Load Template (Optional)
            </label>
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- No Template (Custom Notification) --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.channel})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Template Variables Inputs */}
        {templateId && Object.keys(variablesInput).length > 0 && (
          <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-3">
            <h5 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Template Variables</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(variablesInput).map((vKey) => (
                <div key={vKey} className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">{vKey}</label>
                  <input
                    type="text"
                    value={variablesInput[vKey]}
                    onChange={(e) => handleVariableChange(vKey, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder={`Enter value for ${vKey}`}
                    required
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <hr className="border-slate-800/60" />

        {/* Channel & Priority */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Channel</label>
            <div className="flex gap-2">
              {['EMAIL', 'SMS', 'PUSH'].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => !templateId && setChannel(ch as any)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                    channel === ch
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  } ${templateId ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Priority</label>
            <div className="flex gap-2">
              {['LOW', 'MEDIUM', 'HIGH'].map((prio) => (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setPriority(prio as any)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                    priority === prio
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {prio}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Scheduled Delivery
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Message Elements */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Notification Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Server Maintenance Notice"
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {channel === 'EMAIL' && (
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Action Required: Account Update"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-indigo-500"
                required={channel === 'EMAIL'}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Message Content</label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type notification text (supports HTML tags for Email channel)..."
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-indigo-500 font-sans"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-indigo-600/20"
        >
          <Send className="w-4 h-4" />
          {loading ? 'Sending...' : scheduledFor ? 'Schedule Notification' : 'Send Notification'}
        </button>
      </form>
    </div>
  );
};
