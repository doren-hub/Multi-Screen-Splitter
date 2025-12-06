
import React from 'react';
import { MonitorConfig, SetupConfig } from '../types';

interface LayoutConfigProps {
  config: SetupConfig;
  onConfigChange: (newConfig: SetupConfig) => void;
  onAddMonitor: () => string;
  onRemoveMonitor: (id: string) => void;
}

const LayoutConfig: React.FC<LayoutConfigProps> = ({ config, onConfigChange, onAddMonitor, onRemoveMonitor }) => {

  const handleMonitorChange = (id: string, field: keyof MonitorConfig, value: number | string) => {
    const newMonitors = { ...config.monitors };
    // @ts-ignore
    newMonitors[id] = { ...newMonitors[id], [field]: value };
    onConfigChange({ ...config, monitors: newMonitors });
  };

  const MonitorRow = ({ monitorId }: { monitorId: string }) => {
    const m = config.monitors[monitorId];
    if (!m) return null;

    return (
      <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 group hover:border-blue-500/50 transition-all">
        <div className="flex justify-between items-center mb-3">
             <input 
                type="text" 
                value={m.label}
                onChange={(e) => handleMonitorChange(monitorId, 'label', e.target.value)}
                className="bg-transparent font-bold text-blue-400 text-sm focus:outline-none focus:text-blue-300 w-full"
             />
             <button 
                onClick={() => onRemoveMonitor(monitorId)}
                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                title="Remove Monitor"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">サイズ (インチ)</label>
            <input
              type="number"
              step="0.1"
              value={m.diagonalInches}
              onChange={(e) => handleMonitorChange(monitorId, 'diagonalInches', parseFloat(e.target.value))}
              className="w-full bg-gray-900 text-white px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>
          <div>
             <label className="block text-xs text-gray-400 mb-1">回転 (度)</label>
             <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={m.rotation || 0}
                  onChange={(e) => handleMonitorChange(monitorId, 'rotation', parseFloat(e.target.value))}
                  className="w-full bg-gray-900 text-white px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                />
             </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">解像度 幅 (px)</label>
            <input
              type="number"
              value={m.widthPx}
              onChange={(e) => handleMonitorChange(monitorId, 'widthPx', parseInt(e.target.value))}
              className="w-full bg-gray-900 text-white px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">解像度 高さ (px)</label>
            <input
              type="number"
              value={m.heightPx}
              onChange={(e) => handleMonitorChange(monitorId, 'heightPx', parseInt(e.target.value))}
              className="w-full bg-gray-900 text-white px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">位置 X (インチ)</label>
              <input
                type="number"
                step="0.1"
                value={m.x}
                onChange={(e) => handleMonitorChange(monitorId, 'x', parseFloat(e.target.value))}
                className="w-full bg-gray-900 text-white px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">位置 Y (インチ)</label>
              <input
                type="number"
                step="0.1"
                value={m.y}
                onChange={(e) => handleMonitorChange(monitorId, 'y', parseFloat(e.target.value))}
                className="w-full bg-gray-900 text-white px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="mb-6">
            <label className="block text-xs text-gray-400 mb-1">ベゼル幅 / 隙間調整 (インチ)</label>
            <input
            type="number"
            step="0.1"
            value={config.bezelInches}
            onChange={(e) => onConfigChange({ ...config, bezelInches: parseFloat(e.target.value) })}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
        </div>

        {Object.keys(config.monitors).map(id => (
            <MonitorRow key={id} monitorId={id} />
        ))}
      </div>
      
      <div className="pt-4 border-t border-gray-800">
          <button 
            onClick={onAddMonitor}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 flex items-center justify-center gap-2 transition-all"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              モニターを追加
          </button>
      </div>
    </div>
  );
};

export default LayoutConfig;
