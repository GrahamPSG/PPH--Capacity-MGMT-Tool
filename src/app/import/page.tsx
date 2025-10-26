import { Metadata } from 'next';
import { CSVImporter } from '@/components/import/CSVImporter';

export const metadata: Metadata = {
  title: 'Import Data | PPH Capacity Management',
  description: 'Import projects, phases, and employees from CSV files',
};

export default function ImportPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <CSVImporter />
    </div>
  );
}