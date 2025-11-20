import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false }, // keep it out of the index
  alternates: { canonical: '/menu' },      // consolidate signals to /menu
};

export default function CheckoutPage() {
  // Redirect to menu page since checkout isn't ready yet
  redirect('/menu');
}
