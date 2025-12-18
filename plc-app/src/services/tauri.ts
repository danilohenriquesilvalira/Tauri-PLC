import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { PlcData, TextConfig, PhaseConfig } from '../types';

export class TauriService {
  static async listenToPlcData(callback: (data: PlcData) => void) {
    return await listen<{ message: PlcData }>('plc-data', (event) => {
      callback(event.payload.message);
    });
  }

  static async openPanelWindow(): Promise<string> {
    return await invoke('open_panel_window');
  }

  static async closePanelWindow(): Promise<string> {
    return await invoke('close_panel_window');
  }

  static async getAllTexts(): Promise<TextConfig[]> {
    return await invoke('get_all_texts');
  }

  static async updateText(key: string, text: string): Promise<string> {
    return await invoke('update_text', { key, text });
  }

  static async getAllPhases(): Promise<PhaseConfig[]> {
    return await invoke('get_all_phases');
  }

  static async updatePhase(phaseNumber: number, title: string, description: string, color: string): Promise<string> {
    return await invoke('update_phase', { phaseNumber, title, description, color });
  }
}