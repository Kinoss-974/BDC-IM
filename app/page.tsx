import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirige automatiquement vers la page admin quand on ouvre le site
  redirect('/dashboard');
}