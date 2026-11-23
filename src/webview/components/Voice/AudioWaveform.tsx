import React from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  color?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  color = '#8B5CF6',
}) => {
  return (
    <div className={`audio-waveform ${isActive ? 'active' : ''}`}>
      <span className="wave-bar" style={{ backgroundColor: color }} />
      <span className="wave-bar" style={{ backgroundColor: color }} />
      <span className="wave-bar" style={{ backgroundColor: color }} />
      <span className="wave-bar" style={{ backgroundColor: color }} />
      <span className="wave-bar" style={{ backgroundColor: color }} />
    </div>
  );
};
