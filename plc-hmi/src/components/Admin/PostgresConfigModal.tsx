import React from "react";
import { PostgresConfigPanel } from "./PostgresConfigPanel";

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

export const PostgresConfigModal: React.FC<Props> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <PostgresConfigPanel onClose={onClose} />
    </div>
  );
};
