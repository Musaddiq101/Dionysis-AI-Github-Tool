import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';

export default async function Home() {
  return (
    <div>
      {redirect('/dashboard')}
    </div>
  );
}