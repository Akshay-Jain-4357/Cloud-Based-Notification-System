import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { io } from 'socket.io-client';
import {
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Bell,
  BarChart3,
  TrendingUp,
  Percent
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [byChannel, setByChannel] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/analytics');
      setSummary(res.data.summary);
      setByChannel(res.data.byChannel);
      setTimeline(res.data.timeline);

      // Fetch recent logs
      const logsRes = await api.get('/notifications?limit=5');
      setLiveLogs(logsRes.data.notifications || []);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Listen for real-time updates via Socket.io
    const socket = io('http://localhost:5000');

    socket.on('queue-status', (data: { count: number }) => {
      setQueueCount(data.count);
    });

    socket.on('notification-update', () => {
      fetchDashboardData();
    });

    socket.on('analytics-refresh', () => {
      fetchDashboardData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Curated color palette
  const COLORS = ['#6366f1', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-slate-400 text-sm">Real-time status overview & channel analytics</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchDashboardData();
          }}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI Stats widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sent */}
        <div className="glass rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Sent</p>
              <h3 className="text-3xl font-bold mt-1 text-slate-100">{summary?.total || 0}</h3>
            </div>
            <div className="w-8 h-8 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-indigo-400" /> Live active system counter
          </p>
        </div>

        {/* Delivered */}
        <div className="glass rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Delivered</p>
              <h3 className="text-3xl font-bold mt-1 text-emerald-400">{summary?.delivered || 0}</h3>
            </div>
            <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-1">
            <Percent className="w-3 h-3 text-emerald-400" /> Success Rate: {summary?.successRate || 0}%
          </p>
        </div>

        {/* Failed */}
        <div className="glass rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Failed / Cancelled</p>
              <h3 className="text-3xl font-bold mt-1 text-rose-500">{summary?.failed || 0}</h3>
            </div>
            <div className="w-8 h-8 bg-rose-500/10 text-rose-400 rounded-lg flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-rose-400/80 mt-4">
            Requires attention in Admin panel
          </p>
        </div>

        {/* Queue status */}
        <div className="glass bg-gradient-to-br from-indigo-950/20 to-purple-950/20 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">SQS Queue Buffer</p>
              <h3 className="text-3xl font-bold mt-1 text-amber-400">{queueCount}</h3>
            </div>
            <div className="w-8 h-8 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            </div>
          </div>
          <p className="text-[11px] text-amber-400/80 mt-4">
            Items currently in delivery queue
          </p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Area Chart */}
        <div className="glass rounded-xl p-5 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold text-slate-200">Delivery Velocity (Past 7 Days)</h4>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span> Total</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Success</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSuccess)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="glass rounded-xl p-5 flex flex-col justify-between">
          <h4 className="text-sm font-semibold text-slate-200 mb-4">Volume by Channel</h4>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byChannel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="channel" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {byChannel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {byChannel.map((item, idx) => (
              <div key={item.channel} className="p-2 bg-slate-900/60 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">{item.channel}</span>
                <span className="text-sm font-bold mt-1 block" style={{ color: COLORS[idx] }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time activity feed */}
      <div className="glass rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400 animate-bounce" /> Live Delivery Log Stream
          </h4>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
            Socket Connected
          </span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {liveLogs.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              No recent notifications logged. Use the composer to send one!
            </div>
          ) : (
            liveLogs.map((log) => (
              <div key={log.id} className="py-3 flex justify-between items-center text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{log.title}</span>
                    <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {log.channel}
                    </span>
                  </div>
                  <p className="text-slate-400 truncate max-w-md">{log.message}</p>
                </div>
                <div className="text-right space-y-1">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full ${
                      log.status === 'DELIVERED'
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                        : log.status === 'FAILED'
                        ? 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {log.status}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
