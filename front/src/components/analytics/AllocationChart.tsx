'use client';

import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Position } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

interface AllocationChartProps {
  positions: Position[];
}

export function AllocationChart({ positions }: AllocationChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const data = {
    labels: positions.map((p) => p.assetName),
    datasets: [
      {
        data: positions.map((p) => p.allocationPercentage),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)', // blue
          'rgba(16, 185, 129, 0.8)', // green
          'rgba(251, 191, 36, 0.8)', // yellow
          'rgba(239, 68, 68, 0.8)', // red
          'rgba(139, 92, 246, 0.8)', // purple
          'rgba(236, 72, 153, 0.8)', // pink
          'rgba(20, 184, 166, 0.8)', // teal
          'rgba(249, 115, 22, 0.8)', // orange
        ],
        borderColor: isDark ? 'rgba(17, 24, 39, 1)' : 'rgba(255, 255, 255, 1)',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: isDark ? '#e5e7eb' : '#374151',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(17, 24, 39, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#f3f4f6' : '#111827',
        bodyColor: isDark ? '#e5e7eb' : '#374151',
        borderColor: isDark ? '#374151' : '#d1d5db',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value.toFixed(2)}%`;
          },
        },
      },
    },
  };

  return (
    <div className="h-[300px]">
      <Pie data={data} options={options} />
    </div>
  );
}
