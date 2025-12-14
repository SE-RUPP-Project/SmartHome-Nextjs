'use client';

import { useState, useEffect } from 'react';
import { eventAPI } from '@/lib/api';
import { Activity, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Event {
  _id: string;
  event_type: string;
  user_id: string;
  device_id?: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metadata?: any;
  created_at: string;
  timestamp: Date;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventAPI.getAll({ limit: 100 });
      setEvents(response.data.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <X className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.severity === filter);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="text-muted-foreground">System activity and logs</p>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events Timeline */}
      <div className="space-y-4">
        {filteredEvents.map((event) => (
          <Card key={event._id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${
                    event.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    event.severity === 'error' ? 'bg-red-100 text-red-600' :
                    event.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-medium">
                      {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {event.description}
                    </CardDescription>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(event.timestamp)}
                    </p>
                  </div>
                </div>
                <Badge variant={getSeverityVariant(event.severity) as any}>
                  {event.severity}
                </Badge>
              </div>
            </CardHeader>
            {event.metadata && (
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  <pre className="bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No events found</p>
        </div>
      )}
    </div>
  );
}
