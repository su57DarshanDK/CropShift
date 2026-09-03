import React, { useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DecisionBadge from '../components/score/DecisionBadge';
import { getIvrRecommendation } from '../services/api';
import type { IvrResponse } from '../types/api';

import { useApiState } from '../hooks/useApiState';

export default function IvrPage() {
  const [farmerId, setFarmerId] = useState<string>('');
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const apiState = useApiState<IvrResponse>();

  const handleKeyPress = (num: string) => {
    apiState.reset();
    setFarmerId(prev => prev + num);
  };

  const handleClear = () => {
    setFarmerId('');
    apiState.reset();
  };

  const handleStartCall = async () => {
    if (!farmerId) {
      apiState.run(Promise.reject({ code: 'INVALID_INPUT', message: 'Please enter a Farmer ID.' }));
      return;
    }

    const id = parseInt(farmerId, 10);
    if (isNaN(id)) {
      apiState.run(Promise.reject({ code: 'INVALID_INPUT', message: 'Invalid Farmer ID.' }));
      return;
    }

    setCallState('calling');
    const result = await apiState.run(getIvrRecommendation({ farmer_id: id }));
    if (result) {
      setCallState('connected');
    } else {
      setCallState('idle');
    }
  };

  const loading = apiState.loading;
  const error = apiState.error;
  const data = apiState.data;

  const handleEndCall = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCallState('ended');
  };

  const handlePlayVoice = () => {
    if (!data?.voice_script || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(data.voice_script);
    utterance.lang = 'hi-IN'; // Hindi voice layout configuration
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const keypadButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          IVR Voice Simulator
        </h1>
        <p className="text-gray-600 mt-1">
          Demonstration of the offline voice channel for farmers without internet connections.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Phone Keypad Simulator */}
        <div className="space-y-4">
          <Card className="p-6 bg-slate-900 text-white border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center mb-4">
              Farmer Phone Keypad
            </h3>

            {/* Screen */}
            <div 
              data-testid="phone-screen"
              className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center mb-6 h-16 flex items-center justify-center relative overflow-hidden"
            >
              {callState === 'calling' && (
                <span className="text-slate-400 text-sm animate-pulse">Connecting...</span>
              )}
              {callState === 'connected' && (
                <span className="text-green-400 text-xs font-bold absolute top-2 right-3 uppercase animate-pulse">
                  Connected
                </span>
              )}
              {callState !== 'calling' && (
                <span className="text-2xl font-mono font-bold tracking-widest">
                  {farmerId || 'Enter ID'}
                </span>
              )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {keypadButtons.map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  disabled={callState === 'calling' || callState === 'connected'}
                  className="h-14 rounded-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xl font-bold flex items-center justify-center transition-all duration-150 border border-slate-700/50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Control buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClear}
                disabled={callState === 'calling' || callState === 'connected'}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 border border-slate-700/50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/70"
              >
                Clear
              </button>

              {callState === 'connected' || callState === 'calling' ? (
                <button
                  type="button"
                  data-testid="end-call-btn"
                  onClick={handleEndCall}
                  className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-xl text-xs font-bold uppercase tracking-wider text-white border border-red-500 shadow-lg shadow-red-900/30 focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  End Call
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="start-call-btn"
                  onClick={handleStartCall}
                  className="flex-1 py-3.5 bg-green-600 hover:bg-green-500 active:bg-green-700 rounded-xl text-xs font-bold uppercase tracking-wider text-white border border-green-500 shadow-lg shadow-green-900/30 focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  Call
                </button>
              )}
            </div>

            {error && (
              <p data-testid="error-message" className="text-red-400 text-xs font-semibold text-center mt-4">
                {error}
              </p>
            )}
          </Card>
        </div>

        {/* Right Side: Interactive Call Transcript and Details */}
        <div className="lg:col-span-2 space-y-6">
          {callState === 'connected' && data ? (
            <div className="space-y-6">
              {/* Call Transcript bubble */}
              <Card className="border-primary-100 bg-primary-50/10">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                    <span className="font-bold text-gray-800 text-sm">Transcript (Hindi Voice Output)</span>
                  </div>
                  {window.speechSynthesis && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePlayVoice}
                      className={isSpeaking ? 'animate-pulse text-primary border-primary' : ''}
                    >
                      {isSpeaking ? '🔊 Playing...' : '🔈 Play Audio'}
                    </Button>
                  )}
                </div>

                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-inner relative">
                  <div className="absolute top-3 left-3 text-2xl text-primary-200">“</div>
                  <p className="text-gray-700 text-sm italic leading-relaxed pl-6 pr-6">
                    {data.voice_script}
                  </p>
                  <div className="absolute bottom-3 right-3 text-2xl text-primary-200">”</div>
                </div>
              </Card>

              {/* API recommendation details returned */}
              <Card>
                <div className="border-b border-gray-100 pb-3 mb-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                    Confirmed Profile
                  </span>
                  <h3 data-testid="farmer-name" className="text-xl font-extrabold text-gray-900">
                    {data.farmer_name}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Recommended Crop
                    </span>
                    <span className="text-base font-extrabold text-gray-900">
                      {data.recommendation.recommended_crop}
                    </span>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Decision
                    </span>
                    <DecisionBadge size="sm" decision={data.recommendation.decision} />
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border-dashed border-gray-300">
              <span className="text-4xl mb-3" aria-hidden="true">📞</span>
              <h3 className="font-extrabold text-gray-700">No Active Call</h3>
              <p className="text-gray-400 text-xs mt-1 max-w-sm">
                Dial the Farmer ID <strong>1</strong> using the keypad and tap Call to start simulating the voice recommendation interface.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
