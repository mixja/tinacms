/**

 Copyright 2019 Forestry.io Inc

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 */

import { EventBus, Callback, CMSEvent } from '@tinacms/core'

export interface EventsToAlerts {
  [key: string]: ToAlert
}

export type ToAlert = (
  event: CMSEvent
) => {
  level: AlertLevel
  message: string
  timeout?: number
}

export class Alerts {
  private alerts: Map<string, Alert> = new Map()

  constructor(private events: EventBus, private map: EventsToAlerts = {}) {
    this.events.subscribe('*', event => {
      const toAlert = this.map[event.type]

      if (toAlert) {
        const { level, message, timeout } = toAlert(event)

        this.add(level, message, timeout)
      }
    })
  }
  setMap(eventsToAlerts: EventsToAlerts) {
    this.map = {
      ...this.map,
      ...eventsToAlerts,
    }
  }

  add(level: AlertLevel, message: string, timeout: number = 3000): () => void {
    const alert = {
      level,
      message,
      timeout,
      id: `${message}|${Date.now()}`,
    }

    this.alerts.set(alert.id, alert)

    this.events.dispatch({ type: 'alerts:add', alert })

    let timeoutId: any = null

    const dismiss = () => {
      clearTimeout(timeoutId)
      this.dismiss(alert)
    }

    timeoutId = setTimeout(dismiss, alert.timeout)

    return dismiss
  }

  dismiss(alert: Alert) {
    this.alerts.delete(alert.id)
    this.events.dispatch({ type: 'alerts:remove', alert })
  }

  subscribe(cb: Callback) {
    const unsub = this.events.subscribe('alerts', cb)

    return () => unsub()
  }

  get all() {
    return Array.from(this.alerts.values())
  }

  info(message: string, timeout?: number) {
    return this.add('info', message, timeout)
  }
  success(message: string, timeout?: number) {
    return this.add('success', message, timeout)
  }
  warn(message: string, timeout?: number) {
    return this.add('warn', message, timeout)
  }
  error(message: string, timeout?: number) {
    return this.add('error', message, timeout)
  }
}

export type AlertLevel = 'info' | 'success' | 'warn' | 'error'

export interface Alert {
  id: string
  level: AlertLevel
  message: string
  timeout: number
}
