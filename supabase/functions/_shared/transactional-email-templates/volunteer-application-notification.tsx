import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Chapter 84 Connect"

interface VolunteerApplicationNotificationProps {
  opportunityTitle?: string
  memberName?: string
  memberEmail?: string
  memberPhone?: string
}

const VolunteerApplicationNotificationEmail = ({
  opportunityTitle = 'Volunteering Opportunity',
  memberName = 'A member',
  memberEmail,
  memberPhone,
}: VolunteerApplicationNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New volunteer application for {opportunityTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Volunteer Application</Heading>
        <Text style={text}>
          A new volunteer has applied for <strong>"{opportunityTitle}"</strong>.
        </Text>

        <Section style={detailsBox}>
          <Heading as="h3" style={h3}>Volunteer Details</Heading>
          <Text style={detailRow}>
            <span style={detailLabel}>Name:</span>{' '}
            <strong>{memberName}</strong>
          </Text>
          <Text style={detailRow}>
            <span style={detailLabel}>Email:</span>{' '}
            {memberEmail ? (
              <Link href={`mailto:${memberEmail}`} style={link}>{memberEmail}</Link>
            ) : (
              'Not provided'
            )}
          </Text>
          <Text style={detailRow}>
            <span style={detailLabel}>Phone:</span>{' '}
            {memberPhone || 'Not provided'}
          </Text>
        </Section>

        <Text style={text}>
          Please reach out to coordinate this volunteering opportunity.
        </Text>

        <Text style={footer}>— {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VolunteerApplicationNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New Volunteer Application - ${data.opportunityTitle || 'Volunteering Opportunity'}`,
  displayName: 'Volunteer application notification',
  previewData: {
    opportunityTitle: 'KPAE Young Eagle Rally - Ground Volunteer',
    memberName: 'Jane Doe',
    memberEmail: 'jane@example.com',
    memberPhone: '(555) 123-4567',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 70%, 18%)',
  margin: '0 0 20px',
}
const h3 = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 70%, 18%)',
  margin: '0 0 12px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215, 12%, 46%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const detailsBox = {
  backgroundColor: '#f4f6f8',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}
const detailRow = {
  fontSize: '14px',
  color: 'hsl(215, 12%, 46%)',
  lineHeight: '1.5',
  margin: '0 0 4px',
}
const detailLabel = { color: '#666666' }
const link = { color: 'inherit', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
