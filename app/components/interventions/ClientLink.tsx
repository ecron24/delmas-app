'use client';

import { useRouter } from 'next/navigation';

type ClientLinkProps = {
  clientId: string;
  clientType: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  className?: string;
};

export function ClientLink({
  clientId,
  clientType,
  firstName,
  lastName,
  companyName,
  className = ''
}: ClientLinkProps) {
  const router = useRouter();

  const displayName = clientType === 'professionnel' && companyName
    ? companyName
    : lastName;

  const emoji = clientType === 'professionnel' ? '🏢' : '👤';

  return (
    <button
      onClick={() => router.push(`/dashboard/clients/${clientId}`)}
      className={className || "text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"}
    >
      <span className="text-xl">{emoji}</span>
      {displayName}
    </button>
  );
}
