import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to landing page for authentication flow
  redirect('/landing');
}
