import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, Save, FileCode } from 'lucide-react';

export const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Create form state
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<'EMAIL' | 'SMS' | 'PUSH'>('EMAIL');
  const [category, setCategory] = useState('');
  const [variables, setVariables] = useState('');
  const [error, setError] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/templates');
      setTemplates(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      name,
      subject: channel === 'EMAIL' ? subject : undefined,
      body,
      channel,
      category,
      variables: variables
        ? variables.split(',').map((v) => v.trim()).filter((v) => v !== '')
        : [],
    };

    try {
      if (editId) {
        await api.put(`/templates/${editId}`, payload);
      } else {
        await api.post('/templates', payload);
      }

      setIsEditing(false);
      setEditId(null);
      setName('');
      setSubject('');
      setBody('');
      setCategory('');
      setVariables('');
      fetchTemplates();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save template');
    }
  };

  const handleEdit = (tpl: any) => {
    setEditId(tpl.id);
    setName(tpl.name);
    setSubject(tpl.subject || '');
    setBody(tpl.body);
    setChannel(tpl.channel);
    setCategory(tpl.category);
    setVariables(tpl.variables.join(', '));
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template permanently?')) return;
    try {
      await api.delete(`/templates/${id}`);
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notification Templates</h1>
          <p className="text-slate-400 text-sm">Create and manage reusable message layouts</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => {
              setEditId(null);
              setName('');
              setSubject('');
              setBody('');
              setCategory('');
              setVariables('');
              setIsEditing(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs px-3.5 py-2 rounded-lg text-white font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Template
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSave} className="glass rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">{editId ? 'Edit Template' : 'New Template'}</h3>

          {error && <div className="text-xs text-rose-400 font-medium">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Template Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Welcome Registration"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Event Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. USER_REGISTERED"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs focus:outline-none"
              >
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
                <option value="PUSH">Push</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Variables (Comma Separated)</label>
              <input
                type="text"
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                placeholder="e.g. name, date, orderId"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {channel === 'EMAIL' && (
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Welcome to NotifyFlow, {{name}}!"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-indigo-500"
                  required={channel === 'EMAIL'}
                />
              </div>
            )}

            <div className="col-span-2 space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Template Body Markup</label>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hello {{name}}, your code is {{code}}."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs border border-slate-800 rounded-lg text-slate-400 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
            >
              <Save className="w-3.5 h-3.5" /> Save Template
            </button>
          </div>
        </form>
      )}

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="text-center py-10 text-slate-500 text-xs col-span-2">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs col-span-2">No templates found. Create one to begin.</div>
        ) : (
          templates.map((tpl) => (
            <div key={tpl.id} className="glass rounded-xl p-5 space-y-4 flex flex-col justify-between border border-slate-800/80">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{tpl.name}</h4>
                    <span className="text-[10px] text-indigo-400 font-semibold">{tpl.category}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-900 border border-slate-850 font-bold text-slate-400">
                    {tpl.channel}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-900 font-mono text-[10px] text-slate-400 line-clamp-3">
                  {tpl.body}
                </div>
              </div>

              {tpl.variables.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tpl.variables.map((v: string) => (
                    <span key={v} className="text-[9px] bg-slate-900 border border-slate-850 text-indigo-300 px-1.5 py-0.5 rounded">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-900 pt-3">
                <button
                  onClick={() => handleEdit(tpl)}
                  className="p-1 bg-slate-900 border border-slate-850 rounded text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  className="p-1 bg-slate-900 border border-slate-850 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
