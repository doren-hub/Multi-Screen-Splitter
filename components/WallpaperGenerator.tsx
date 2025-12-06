import React, { useState } from 'react';
import { generateWallpaper } from '../services/geminiService';

interface WallpaperGeneratorProps {
  onImageGenerated: (dataUrl: string) => void;
}

const WallpaperGenerator: React.FC<WallpaperGeneratorProps> = ({ onImageGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const dataUrl = await generateWallpaper(prompt);
      onImageGenerated(dataUrl);
    } catch (e) {
      setError("画像の生成に失敗しました。APIキーを確認してください。");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        AI Wallpaper Generator
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">プロンプト (どのような画像にしますか？)</label>
          <textarea
            className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all resize-none h-24"
            placeholder="例: ネオン輝くサイバーパンクな街並み、青と紫のグラデーション、高解像度"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        
        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            isGenerating 
              ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-purple-500/25'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            'Generate Wallpaper'
          )}
        </button>
        <p className="text-xs text-gray-500 text-center">Gemini 3 Pro Image Preview モデルを使用します。</p>
      </div>
    </div>
  );
};

export default WallpaperGenerator;
