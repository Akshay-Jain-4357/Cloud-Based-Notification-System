import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, Loader2, Play, RefreshCw, Send, AlertTriangle, AlertCircle } from 'lucide-react';

export const Admin: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [sysLogs, setSysLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Event Simulator State
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('USER_REGISTERED');
  const [eventMsg, setEventMsg] = useState('');

  const fetchAdminData = async () => {
    try {
      const [queueRes, logsRes, usersRes] = await Promise.all([
        api.get('/admin/queue'),
        api.get('/admin/logs'),
        api.get('/users'),
      ]);
      setQueue(queueRes.data || []);
      setSysLogs(logsRes.data || []);
      setUsers(usersRes.data || []);
      if (usersRes.data?.length > 0 && !selectedUser) {
        setSelectedUser(usersRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load admin logs/queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRetry = async (notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await api.post('/admin/retry', { notificationId });
      alert('Notification manual retry triggered successfully!');
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert('Manual retry failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setEventMsg('');
    try {
      await api.post('/admin/trigger-event', {
        eventType: selectedEvent,
        targetUserId: selectedUser,
      });
      setEventMsg(`Successfully simulated ${selectedEvent} event pipeline execution! Check the main history logs.`);
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert('Event simulation failed.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Control Panel</h1>
          <p className="text-slate-400 text-sm">Monitor background worker SQS pipelines and queue metrics</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchAdminData();
          }}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Panel
        </button>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SQS Queue monitor */}
        <div className="glass rounded-xl p-5 lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" /> Active SQS Buffer Queue
          </h3>
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            {queue.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs bg-slate-950/40">
                Queue buffer is currently empty.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-850 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Notification</th>
                    <th className="py-2.5 px-3">Attempts</th>
                    <th className="py-2.5 px-3">Next Attempt</th>
                    <th className="py-2.5 px-3">Error Context</th>
                    <th className="py-2.5 px-3 text-center">Retry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 bg-slate-950/20">
                  {queue.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/10">
                      <td className="py-3 px-3 font-semibold text-slate-350">{item.notification?.title}</td>
                      <td className="py-3 px-3 text-amber-400 font-bold">{item.attempts} / {item.maxAttempts}</td>
                      <td className="py-3 px-3 text-slate-400">{new Date(item.visibleAfter).toLocaleTimeString()}</td>
                      <td className="py-3 px-3 text-rose-400 font-mono text-[10px] truncate max-w-xs">{item.error || 'N/A'}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          disabled={actionLoading === item.notificationId}
                          onClick={() => handleRetry(item.notificationId)}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-[10px] text-white rounded cursor-pointer font-bold flex items-center gap-1 mx-auto"
                        >
                          <Play className="w-3 h-3 fill-current" /> Run
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Event Simulator Box */}
        <div className="glass rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-indigo-400" /> Event-Driven Pipeline Simulator
          </h3>
          <p className="text-[11px] text-slate-400">
            Select a template category event and recipient. The backend will trigger event payloads to compile variables and dispatch notifications.
          </p>

          {eventMsg && (
            <div className="p-2.5 bg-indigo-950/40 border border-indigo-500/20 rounded-lg text-indigo-300 text-[10px]">
              {eventMsg}
            </div>
          )}

          <form onSubmit={handleTriggerEvent} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Target User</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs focus:outline-none"
                required
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Event Type</label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs focus:outline-none"
                required
              >
                <option value="USER_REGISTERED">User Registered (EMAIL)</option>
                <option value="PAYMENT_SUCCESSFUL">Payment Invoice (EMAIL)</option>
                <option value="SECURITY_ALERT">MFA Security Code (SMS)</option>
                <option value="PROMOTION_CAMPAIGN">Weekly Promotional Campaign (PUSH)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
            >
              <Send className="w-3.5 h-3.5" /> Fire Event Pipeline
            </button>
          </form>
        </div>
      </div>

      {/* Server Lambda Audit logs */}
      <div className="glass rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-indigo-400" /> Serverless Lambda Invocation Logs
        </h3>
        <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto pr-2">
          {sysLogs.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              No audit logs captured yet. Try running an event simulator flow.
            </div>
          ) : (
            sysLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex justify-between items-start text-xs font-mono">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-300">[{log.status}]</span>
                    <span className="text-[10px] text-slate-500">Duration: {log.durationMs}ms</span>
                  </div>
                  {log.error && <p className="text-rose-400 text-[11px]">Error: {log.error}</p>}
                  {log.details && <p className="text-slate-400 text-[11px]">Details: {log.details}</p>}
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
