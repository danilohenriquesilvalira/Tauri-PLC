import React from 'react';
import { 
  ArrowUpCircleIcon,
  ArrowDownCircleIcon, 
  ShieldExclamationIcon,
  ShieldCheckIcon,
  ComputerDesktopIcon,
  BeakerIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface FaultIconProps {
  iconName: string;
  className?: string;
  color?: string;
}

export const FaultIcon: React.FC<FaultIconProps> = ({ iconName, className = "w-5 h-5", color }) => {
  const iconStyle = color ? { color } : {};

  switch (iconName) {
    case 'ArrowUpCircle':
      return <ArrowUpCircleIcon className={className} style={iconStyle} />;
    case 'ArrowDownCircle':
      return <ArrowDownCircleIcon className={className} style={iconStyle} />;
    case 'Shield':
      return <ShieldExclamationIcon className={className} style={iconStyle} />;
    case 'ShieldCheck':
      return <ShieldCheckIcon className={className} style={iconStyle} />;
    case 'CommandLine':
      return <ComputerDesktopIcon className={className} style={iconStyle} />;
    case 'Droplets':
      return <BeakerIcon className={className} style={iconStyle} />;
    case 'Cog':
      return <CogIcon className={className} style={iconStyle} />;
    default:
      return <ShieldExclamationIcon className={className} style={iconStyle} />;
  }
};