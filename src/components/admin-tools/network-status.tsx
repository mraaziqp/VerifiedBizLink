'use client';

import React, { useState, useEffect } from 'react';
import {
  Network,
  Server,
  Database,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'down';
  uptime: number;
  latency: number;
  errorRate: number;
  lastChecked: string;
}

export function NetworkStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([]);

  useEffect(() => {
    const data: ServiceStatus[] = [
      {
        name: 'API Server',
        status: 'healthy',
        uptime: 99.98,
        latency: 45,
        errorRate: 0.02,
        lastChecked: 'now',
      },
      {
        name: 'Database (PostgreSQL)',
        status: 'healthy',
        uptime: 99.99,
        latency: 12,
        errorRate: 0.01,
        lastChecked: 'now',
      },
      {
        name: 'Cache (Redis)',
        status: 'healthy',
        uptime: 99.97,
        latency: 3,
        errorRate: 0.03,
        lastChecked: '30s ago',
      },
      {
        name: 'Email Service',
        status: 'healthy',
        uptime: 99.95,
        latency: 250,
        errorRate: 0.05,
        lastChecked: 'now',
      },
      {
        name: 'AI Chat (Gemini)',
        status: 'healthy',
        uptime: 99.88,
        latency: 1200,
        errorRate: 0.12,
        lastChecked: '1m ago',
      },
      {
        name: 'File Storage',
        status: 'healthy',
        uptime: 99.94,
        latency: 150,
        errorRate: 0.06,
        lastChecked: 'now',
      },
    ];
    setServices(data);
  }, []);

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const avgUptime = (
    services.reduce((sum, s) => sum + s.uptime, 0) / services.length
  ).toFixed(2);

  const getStatusIcon = (status: string) => {
    return status === 'healthy' ? (
      <CheckCircle className="w-5 h-5 text-green-400" />
    ) : status === 'warning' ? (
      <AlertCircle className="w-5 h-5 text-yellow-400" />
    ) : (
      <AlertCircle className="w-5 h-5 text-red-400" />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500/30 bg-green-500/10';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'down':
        return 'border-red-500/30 bg-red-500/10';
      default:
        return 'border-gray-700 bg-gray-800/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-300 text-sm">Services Healthy</h4>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-4xl font-bold text-green-400">{healthyCount}</p>
          <p className="text-xs text-gray-400 mt-2">of {services.length} services</p>
        </div>

        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-300 text-sm">Average Uptime</h4>
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-4xl font-bold text-blue-400">{avgUptime}%</p>
          <p className="text-xs text-gray-400 mt-2">Last 30 days</p>
        </div>

        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-300 text-sm">Avg Latency</h4>
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-4xl font-bold text-purple-400">
            {Math.round(services.reduce((sum, s) => sum + s.latency, 0) / services.length)}ms
          </p>
          <p className="text-xs text-gray-400 mt-2">Response time</p>
        </div>

        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-gray-300 text-sm">Error Rate</h4>
            <BarChart3 className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-4xl font-bold text-orange-400">
            {(services.reduce((sum, s) => sum + s.errorRate, 0) / services.length).toFixed(2)}%
          </p>
          <p className="text-xs text-gray-400 mt-2">Avg across services</p>
        </div>
      </div>

      {/* Services List */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-400" />
          Service Status
        </h3>

        <div className="space-y-3">
          {services.map((service, idx) => (
            <div
              key={idx}
              className={`rounded-lg border p-4 transition-all ${getStatusColor(
                service.status
              )}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <h4 className="font-semibold text-white">{service.name}</h4>
                    <p className="text-xs text-gray-400">Last checked: {service.lastChecked}</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    service.status === 'healthy'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {service.status === 'healthy' ? '✓ Operational' : '⚠ Degraded'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Uptime</p>
                  <p className="font-bold text-white">{service.uptime}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Latency</p>
                  <p className="font-bold text-white">{service.latency}ms</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Error Rate</p>
                  <p className="font-bold text-white">{service.errorRate}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incident History */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Recent Incidents</h3>
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-green-400">✓ All Systems Operational</p>
              <p className="text-xs text-gray-400">Today, 09:00</p>
            </div>
            <p className="text-sm text-gray-400">No incidents reported in the last 24 hours</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gray-900/50">
            <p className="text-gray-400 text-sm mb-2">Peak Traffic Time</p>
            <p className="text-2xl font-bold text-white">18:00 - 19:00</p>
            <p className="text-xs text-gray-500 mt-1">612 concurrent visitors</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-900/50">
            <p className="text-gray-400 text-sm mb-2">Average Response Time</p>
            <p className="text-2xl font-bold text-white">187ms</p>
            <p className="text-xs text-gray-500 mt-1">±42ms variance</p>
          </div>
        </div>
      </div>
    </div>
  );
}
