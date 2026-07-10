'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [logs, setLogs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchLogs();
    fetchApiKeys();

    // Refresh alerts every 10 seconds
    const interval = setInterval(() => {
      fetchAlerts();
      fetchLogs();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs/ingest?limit=50&hours=1');
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/admin/alerts?type=triggered');
      const data = await response.json();
      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys');
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.keys);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const generateNewKey = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `API Key ${new Date().toLocaleString()}`,
          appName: 'external-app',
          environment: 'production',
          expiresInDays: 90
        })
      });

      const data = await response.json();
      if (data.success) {
        // Show key to user once
        alert(`🔑 Your API Key (save this securely!):\n\n${data.key}\n\nThis will only be shown once.`);
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error generating key:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/alerts/${alertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'acknowledged',
          acknowledgedBy: 'admin' // Should be current user ID
        })
      });

      if (response.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/alerts/${alertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
          resolvedBy: 'admin'
        })
      });

      if (response.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <p className="text-gray-500 mt-2">Real-time logs, alerts, and API key management</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">
            Alerts
            {alerts.filter((a) => a.status === 'open').length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.filter((a) => a.status === 'open').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        {/* ALERTS TAB */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="text-green-600" />
              <AlertDescription className="text-green-800">
                All systems operational. No active alerts.
              </AlertDescription>
            </Alert>
          ) : (
            alerts.map((alert) => (
              <Card
                key={alert.id}
                className={`border-l-4 ${
                  alert.severity === 'CRITICAL'
                    ? 'border-l-red-600 bg-red-50'
                    : 'border-l-yellow-600 bg-yellow-50'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{alert.title}</CardTitle>
                      <CardDescription>{alert.description}</CardDescription>
                    </div>
                    <Badge
                      variant={alert.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>App:</strong> {alert.app_name}
                    </p>
                    <p>
                      <strong>Created:</strong> {new Date(alert.created_at).toLocaleString()}
                    </p>
                    <p>
                      <strong>Status:</strong> {alert.status}
                    </p>
                  </div>

                  {alert.log_samples && alert.log_samples.length > 0 && (
                    <div className="bg-gray-100 p-3 rounded text-xs space-y-1">
                      <p className="font-semibold">Recent logs:</p>
                      {alert.log_samples.slice(0, 3).map((log: any, idx: number) => (
                        <p key={idx} className="text-gray-700">
                          {log.message}
                        </p>
                      ))}
                    </div>
                  )}

                  {alert.agent_suggested_fix && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                      <p className="text-sm font-semibold text-blue-900">Agent Suggestion:</p>
                      <p className="text-sm text-blue-800 mt-1">{alert.agent_suggested_fix}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {alert.status === 'open' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      </>
                    )}
                    {alert.status === 'acknowledged' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Mark as Resolved
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs" className="space-y-4">
          <div className="rounded border">
            <div className="p-4 bg-gray-50 border-b font-semibold text-sm grid grid-cols-6 gap-2">
              <div>Level</div>
              <div>App</div>
              <div>Message</div>
              <div>Status Code</div>
              <div>Response Time</div>
              <div>Time</div>
            </div>
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-3 border-b grid grid-cols-6 gap-2 text-xs ${
                  log.log_level === 'ERROR'
                    ? 'bg-red-50'
                    : log.log_level === 'WARN'
                      ? 'bg-yellow-50'
                      : ''
                }`}
              >
                <div>
                  <Badge
                    variant={
                      log.log_level === 'ERROR'
                        ? 'destructive'
                        : log.log_level === 'WARN'
                          ? 'secondary'
                          : 'default'
                    }
                  >
                    {log.log_level}
                  </Badge>
                </div>
                <div className="font-semibold">{log.app_name}</div>
                <div className="truncate">{log.message}</div>
                <div>{log.status_code || '-'}</div>
                <div>{log.response_time_ms ? `${log.response_time_ms}ms` : '-'}</div>
                <div className="text-gray-500">
                  {new Date(log.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* API KEYS TAB */}
        <TabsContent value="keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">API Keys</h3>
            <Button onClick={generateNewKey} disabled={loading}>
              {loading ? 'Generating...' : 'Generate New Key'}
            </Button>
          </div>

          <div className="space-y-2">
            {apiKeys.map((key) => (
              <Card key={key.id}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-semibold">{key.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">App</p>
                      <p className="font-semibold">{key.app_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <Badge variant={key.active ? 'default' : 'secondary'}>
                        {key.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Used</p>
                      <p className="text-sm">
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleDateString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* STATS TAB */}
        <TabsContent value="stats" className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Open Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {alerts.filter((a) => a.status === 'open').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent Errors (1h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {logs.filter((l) => l.log_level === 'ERROR').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Active API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {apiKeys.filter((k) => k.active).length}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
