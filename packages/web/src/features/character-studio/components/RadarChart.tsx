import React from 'react';

interface RadarChartProps {
  data: { label: string; value: number }[];
  size?: number;
  color?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  size = 200,
  color = '#8b5cf6', // violet-500
}) => {
  const center = size / 2;
  const radius = size / 2 - 40; // Leave room for labels
  const angleStep = (Math.PI * 2) / data.length;

  // Calculate points for the polygon
  const points = data
    .map((d, i) => {
      const angle = i * angleStep - Math.PI / 2; // Start from top
      const x = center + Math.cos(angle) * (radius * d.value);
      const y = center + Math.sin(angle) * (radius * d.value);
      return `${x},${y}`;
    })
    .join(' ');

  // Calculate points for the background grid (concentric polygons)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="flex justify-center items-center p-4">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Grid */}
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={data
              .map((_, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const x = center + Math.cos(angle) * (radius * level);
                const y = center + Math.sin(angle) * (radius * level);
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#334155" // slate-700
            strokeWidth="1"
            className="opacity-50"
          />
        ))}

        {/* Axes */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
              className="opacity-50"
            />
          );
        })}

        {/* Data Polygon */}
        <polygon points={points} fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />

        {/* Data Points */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + Math.cos(angle) * (radius * d.value);
          const y = center + Math.sin(angle) * (radius * d.value);
          return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
        })}

        {/* Labels */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          // Push labels out a bit further than the radius
          const labelRadius = radius + 20;
          const x = center + Math.cos(angle) * labelRadius;
          const y = center + Math.sin(angle) * labelRadius;

          // Adjust text anchor based on position
          let textAnchor: 'middle' | 'start' | 'end' = 'middle';
          if (Math.abs(x - center) > 10) {
            textAnchor = x > center ? 'start' : 'end';
          }

          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fill="#94a3b8" // slate-400
              fontSize="10"
              className="uppercase tracking-wider"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
