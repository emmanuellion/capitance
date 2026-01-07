'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { TimelineEntry } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Flexible timeline entry that works with both API format and legacy format
type FlexibleTimelineEntry = TimelineEntry | {
  date: Date;
  portfolioValue: number;
  cashFlow?: number;
  operationType?: string;
};

interface TimelineChartProps {
  timeline: FlexibleTimelineEntry[];
}

export function TimelineChart({ timeline }: TimelineChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const data = {
    labels: timeline.map((t) => new Date(t.date).toLocaleDateString('fr-FR')),
    datasets: [
      {
        label: 'Valeur du portefeuille',
        data: timeline.map((t) => (t as any).portfolioValue || (t as any).totalValue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: isDark ? '#e5e7eb' : '#374151',
        },
      },
      title: {
        display: true,
        text: 'Évolution du portefeuille',
        color: isDark ? '#f3f4f6' : '#111827',
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(17, 24, 39, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#f3f4f6' : '#111827',
        bodyColor: isDark ? '#e5e7eb' : '#374151',
        borderColor: isDark ? '#374151' : '#d1d5db',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
        },
        grid: {
          color: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(209, 213, 219, 0.3)',
        },
      },
      y: {
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          callback: (value: any) => `${value.toFixed(2)} €`,
        },
        grid: {
          color: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(209, 213, 219, 0.3)',
        },
      },
    },
  };

  return (
    <div className="h-[300px]">
      <Line data={data} options={options} />
    </div>
  );
}
