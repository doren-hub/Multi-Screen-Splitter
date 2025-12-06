
import React, { useState } from 'react';
import { SetupConfig, MonitorConfig } from './types';
import { getDefaultConfig, createMonitor, relabelMonitors } from './utils/monitorUtils';
import LayoutConfig from './components/LayoutConfig';
import WallpaperGenerator from './components/WallpaperGenerator';
import PreviewAndDownload from './components/PreviewAndDownload';

const App: React.FC = () => {
  const [config, setConfig] = useState<SetupConfig>(getDefaultConfig());
  const [sourceImage, setSourceImage] = useState<string | null>(null);

  const handleAddMonitor = () => {
    const id = `monitor-${Date.now()}`;
    // Default to a 24.5" landscape monitor placed at 0,0
    const newMonitor = createMonitor(
        id, 
        '?', // Temporary label, will be numbered immediately
        24.5, 
        'landscape', 
        0, 
        0
    );
    
    setConfig(prev => {
        const updatedMonitors = {
            ...prev.monitors,
            [id]: newMonitor
        };
        // Re-number all monitors
        return {
            ...prev,
            monitors: relabelMonitors(updatedMonitors)
        };
    });
    return id;
  };

  const handleRemoveMonitor = (id: string) => {
      setConfig(prev => {
          const newMonitors = { ...prev.monitors };
          delete newMonitors[id];
          // Re-number after removal
          return { ...prev, monitors: relabelMonitors(newMonitors) };
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setSourceImage(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                 <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                 <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
               </svg>
             </div>
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
               Multi Screen Splitter
             </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar: Controls */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
          
          {/* File Upload Section */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg">
             <h2 className="text-lg font-semibold text-white mb-4">Source Image</h2>
             <div className="space-y-4">
                <div className="relative group cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  />
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-800/50 group-hover:bg-gray-800 group-hover:border-blue-500 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 group-hover:text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm text-gray-400 font-medium group-hover:text-white">画像をアップロード</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                   <div className="h-px bg-gray-800 flex-1"></div>
                   <span className="text-xs text-gray-600 uppercase">OR</span>
                   <div className="h-px bg-gray-800 flex-1"></div>
                </div>
                
                {/* AI Generator */}
                <WallpaperGenerator onImageGenerated={setSourceImage} />
             </div>
          </div>

          {/* Config Section */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg flex-1 min-h-0 flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-4">Monitor Configuration</h2>
            <LayoutConfig 
                config={config} 
                onConfigChange={setConfig} 
                onAddMonitor={handleAddMonitor}
                onRemoveMonitor={handleRemoveMonitor}
            />
          </div>
        </div>

        {/* Main Content: Preview */}
        <div className="lg:col-span-8 xl:col-span-9 h-full flex flex-col">
           <PreviewAndDownload 
              config={config} 
              sourceImage={sourceImage} 
              onConfigChange={setConfig}
              onAddMonitor={handleAddMonitor}
              onRemoveMonitor={handleRemoveMonitor}
           />
           
           <div className="mt-8 p-4 bg-blue-900/20 border border-blue-900/50 rounded-lg text-sm text-blue-200">
             <h3 className="font-bold mb-2 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
               </svg>
               Gap Compensation Explained
             </h3>
             <p className="opacity-80">
               モニター間のベゼルや隙間を考慮して、画像が空間を飛び越えて連続して見えるように自動調整されます。
               プレビュー上のモニターをドラッグして、実際の物理配置に合わせて微調整してください。
             </p>
           </div>
        </div>

      </main>
    </div>
  );
};

export default App;
