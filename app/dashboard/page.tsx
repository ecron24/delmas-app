import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Rediriger vers interventions par défaut
  redirect('/dashboard/interventions');
}
