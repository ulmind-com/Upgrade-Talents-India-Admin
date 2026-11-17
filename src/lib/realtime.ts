import { useEffect, useRef } from "react";
import { API_BASE } from "./api";

export type RealtimeEvent = {
  channel: string;
  event: string;
  data: any;
  timestamp: string;
};

type EventCallback = (event: RealtimeEvent) => void;

class AdminRealtimeClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimeout: any = null;
  private reconnectAttempts: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      // Connect when online or tab becomes visible
      window.addEventListener("online", () => this.connect());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          this.connect();
          this.notifyAll({ channel: "admin:sync", event: "TAB_VISIBLE", data: {}, timestamp: new Date().toISOString() });
        }
      });
    }
  }

  public connect() {
    if (typeof window === "undefined" || this.isConnecting) return;
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) return;

    this.isConnecting = true;
    try {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      const streamUrl = `${API_BASE}/api/realtime/stream?channels=admin:all,admin:events,admin:volunteers,admin:competitions,global,*`;
      const es = new EventSource(streamUrl);

      es.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyAll({ channel: "system", event: "CONNECTED", data: {}, timestamp: new Date().toISOString() });
      };

      es.onmessage = (e) => {
        try {
          const payload: RealtimeEvent = JSON.parse(e.data);
          this.notify(payload);
        } catch {
          // keepalive or non-json message
        }
      };

      // Listen for named custom events from SSE
      const standardEvents = [
        "TICKET_CHECKED_IN",
        "BOOKING_CREATED",
        "PAYMENT_CONFIRMED",
        "CASH_COLLECTED",
        "VOLUNTEER_ASSIGNED",
        "VOLUNTEER_REMOVED",
        "VOLUNTEER_ENTRY",
        "COMPETITION_UPDATE",
        "STAGE_UPDATE",
        "score_submitted",
        "LEADERBOARD_UPDATED",
        "round_advanced",
        "results_published",
        "scores_visibility_changed",
        "COMPETITION_REGISTRATION_CONFIRMED"
      ];

      standardEvents.forEach((evtName) => {
        es.addEventListener(evtName, (e: any) => {
          try {
            const parsed = JSON.parse(e.data);
            const payload: RealtimeEvent = {
              channel: parsed.channel || "admin:events",
              event: parsed.event || evtName,
              data: parsed.data || parsed,
              timestamp: parsed.timestamp || new Date().toISOString(),
            };
            this.notify(payload);
          } catch {
            // raw message
          }
        });
      });

      es.onerror = () => {
        this.isConnecting = false;
        es.close();
        this.eventSource = null;
        this.scheduleReconnect();
      };

      this.eventSource = es;
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private notify(event: RealtimeEvent) {
    // Notify channel-specific listeners
    const chListeners = this.listeners.get(event.channel);
    if (chListeners) {
      chListeners.forEach((cb) => {
        try { cb(event); } catch (e) { console.warn("Realtime listener error:", e); }
      });
    }

    // Notify global wildcard listeners
    const starListeners = this.listeners.get("*");
    if (starListeners) {
      starListeners.forEach((cb) => {
        try { cb(event); } catch (e) { console.warn("Realtime listener error:", e); }
      });
    }
  }

  private notifyAll(event: RealtimeEvent) {
    this.listeners.forEach((set) => {
      set.forEach((cb) => {
        try { cb(event); } catch {}
      });
    });
  }

  public subscribe(channel: string, callback: EventCallback): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);

    // Ensure connection is active
    this.connect();

    return () => {
      const set = this.listeners.get(channel);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(channel);
      }
    };
  }
}

export const adminRealtime = new AdminRealtimeClient();

/**
 * React hook to listen for real-time events on one or more channels.
 * Automatically handles subscriptions, clean-ups, and background polling fallback.
 */
export function useRealtimeSubscription(
  channels: string | string[],
  onEvent: (event: RealtimeEvent) => void,
  fallbackIntervalMs: number = 8000
) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    const chList = Array.isArray(channels) ? channels : [channels];
    const unsubs = chList.map((ch) =>
      adminRealtime.subscribe(ch, (e) => cbRef.current(e))
    );

    // Fallback sync polling if tab is active (ensures 100% guarantee across network disconnects)
    let interval: any = null;
    if (fallbackIntervalMs > 0) {
      interval = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          cbRef.current({
            channel: "poll:fallback",
            event: "SYNC_PULSE",
            data: {},
            timestamp: new Date().toISOString(),
          });
        }
      }, fallbackIntervalMs);
    }

    return () => {
      unsubs.forEach((u) => u());
      if (interval) clearInterval(interval);
    };
  }, [Array.isArray(channels) ? channels.join(",") : channels, fallbackIntervalMs]);
}
