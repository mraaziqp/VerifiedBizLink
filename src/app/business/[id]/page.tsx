import { BusinessContactCard } from '@/components/business/business-contact-card';
import { BusinessProfileClient } from './business-profile-client';

/**
 * Public business profile. A thin server wrapper so the contact details can
 * be rendered on the server (BusinessContactCard + getBusinessProfile) and
 * handed to the interactive client page.
 */
export default async function BusinessProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BusinessProfileClient contactCard={<BusinessContactCard businessId={id} />} />;
}
