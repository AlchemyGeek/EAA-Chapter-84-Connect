/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export type TemplateAllowedCallers = 'self' | 'privileged' | 'service'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
  /**
   * Who is allowed to invoke this template via send-transactional-email.
   * - 'self': any authenticated user may send to their own address
   * - 'privileged': admin or officer callers only
   * - 'service': internal service-role callers only
   * Defaults to 'privileged' for safety if omitted.
   */
  allowedCallers?: TemplateAllowedCallers
}

import { template as volunteerApplicationNotification } from './volunteer-application-notification.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'volunteer-application-notification': volunteerApplicationNotification,
}
