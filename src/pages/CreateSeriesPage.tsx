import React from 'react';
import { SeriesWizard } from '../components/series/SeriesWizard';

interface CreateSeriesPageProps {
  onNavigate: (path: string) => void;
}

export const CreateSeriesPage: React.FC<CreateSeriesPageProps> = ({ onNavigate }) => {
  return (
    <div className="py-4 animate-fadeIn">
      <SeriesWizard
        onComplete={(seriesId) => onNavigate(`/series/${seriesId}`)}
        onCancel={() => onNavigate('/series')}
      />
    </div>
  );
};
