import Link from 'next/link';
import { EmptyState } from '@/components/ui/states';
import { t } from '@/i18n';

export default function NotFound() {
  return (
    <EmptyState title={t('notFound.title')}>
      <Link href="/" className="font-semibold text-brand underline">
        {t('notFound.back')}
      </Link>
    </EmptyState>
  );
}
