import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Flag, 
  Moon, 
  Sun, 
  Download, 
  Trash2, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  MapPin, 
  Gauge, 
  History, 
  Clock, 
  Smartphone, 
  Maximize2,
  Info
} from 'lucide-react';

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // overall ms
  const [laps, setLaps] = useState([]); // array of { id, distance, lapTime, cumulativeTime, timestamp }
  const [lastLapTime, setLastLapTime] = useState(0);

  // Saved Session History State
  const [savedSessions, setSavedSessions] = useState([]);

  // UI & Settings States
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPhoneView, setIsPhoneView] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // High-precision timing refs
  const startTimeRef = useRef(0);
  const timerRef = useRef(null);
  const accumulatedTimeRef = useRef(0);

  useEffect(() => {
    try {
      const storedLaps = localStorage.getItem('ios_timer_current_laps');
      const storedElapsed = localStorage.getItem('ios_timer_elapsed');
      const storedLastLap = localStorage.getItem('ios_timer_last_lap');
      const storedSessions = localStorage.getItem('ios_timer_sessions');

      if (storedLaps) setLaps(JSON.parse(storedLaps));
      if (storedElapsed) {
        const parsedElapsed = parseInt(storedElapsed, 10);
        setElapsedTime(parsedElapsed);
        accumulatedTimeRef.current = parsedElapsed;
      }
      if (storedLastLap) setLastLapTime(parseInt(storedLastLap, 10));
      if (storedSessions) setSavedSessions(JSON.parse(storedSessions));
    } catch (e) {
      console.error('Failed to load storage:', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ios_timer_current_laps', JSON.stringify(laps));
      localStorage.setItem('ios_timer_elapsed', elapsedTime.toString());
      localStorage.setItem('ios_timer_last_lap', lastLapTime.toString());
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [laps, elapsedTime, lastLapTime]);

  const playSound = (type = 'click') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'start') {
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'stop') {
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'split') {
        osc.frequency.setValueAtTime(1318.51, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'reset') {
        osc.frequency.setValueAtTime(329.63, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {
      console.error('Audio error:', e);
    }
  };

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = performance.now() - accumulatedTimeRef.current;
      timerRef.current = requestAnimationFrame(updateTimer);
    } else {
      cancelAnimationFrame(timerRef.current);
    }
    return () => cancelAnimationFrame(timerRef.current);
  }, [isRunning]);

  const updateTimer = () => {
    const now = performance.now();
    const currentElapsed = Math.floor(now - startTimeRef.current);
    accumulatedTimeRef.current = currentElapsed;
    setElapsedTime(currentElapsed);
    timerRef.current = requestAnimationFrame(updateTimer);
  };

  const handleStartStop = () => {
    if (isRunning) {
      playSound('stop');
      setIsRunning(false);
    } else {
      playSound('start');
      setIsRunning(true);
    }
  };

  const handleSplit = () => {
    if (!isRunning) return;
    playSound('split');

    const currentTotal = elapsedTime;
    const currentLapTime = currentTotal - lastLapTime;
    const nextDistance = ((laps.length + 1) * 0.25).toFixed(2);

    const newLap = {
      id: laps.length + 1,
      distance: nextDistance,
      lapTime: currentLapTime,
      cumulativeTime: currentTotal,
      timestamp: new Date().toLocaleTimeString()
    };

    setLaps([newLap, ...laps]);
    setLastLapTime(currentTotal);
  };

  const handleReset = () => {
    playSound('reset');
    
    if (laps.length > 0) {
      const newSession = {
        id: Date.now(),
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        totalDistance: laps[0].distance,
        totalTime: elapsedTime,
        splitsCount: laps.length,
        laps: [...laps]
      };
      const updatedSessions = [newSession, ...savedSessions];
      setSavedSessions(updatedSessions);
      try {
        localStorage.setItem('ios_timer_sessions', JSON.stringify(updatedSessions));
      } catch(e) {
        console.error(e);
      }
    }

    setIsRunning(false);
    setElapsedTime(0);
    setLaps([]);
    setLastLapTime(0);
    accumulatedTimeRef.current = 0;

    localStorage.removeItem('ios_timer_current_laps');
    localStorage.removeItem('ios_timer_elapsed');
    localStorage.removeItem('ios_timer_last_lap');
  };

  // Custom single-digit tenths format: Math.floor(tenths / 2) mapping standard 0..9 -> 0..4
  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    const standardTenths = Math.floor((ms % 1000) / 100);
    const halvedTenths = Math.floor(standardTenths / 2); // 0->0, 1->0, 2->1, 3->1, 4->2, 5->2, 6->3, 7->3, 8->4, 9->4

    const pad = (n) => (n < 10 ? `0${n}` : n);
    return {
      min: pad(minutes),
      sec: pad(seconds),
      ms: halvedTenths.toString(),
      full: `${pad(minutes)}:${pad(seconds)}.${halvedTenths}`
    };
  };

  // Speed in mph based on 0.25 mile interval distance
  const calculateMph = (splitMs) => {
    if (!splitMs || splitMs <= 0) return '0.00';
    const hours = splitMs / (1000 * 60 * 60);
    const mph = 0.25 / hours;
    return mph.toFixed(2);
  };

  let minLapTime = Infinity;
  let maxLapTime = -1;
  if (laps.length >= 2) {
    laps.forEach((lap) => {
      if (lap.lapTime < minLapTime) minLapTime = lap.lapTime;
      if (lap.lapTime > maxLapTime) maxLapTime = lap.lapTime;
    });
  }

  const currentOngoingLapTime = elapsedTime - lastLapTime;
  const currentDistanceMarker = ((laps.length + 1) * 0.25).toFixed(2);
  const formattedMain = formatTime(elapsedTime);
  const formattedCurrentLap = formatTime(currentOngoingLapTime);
  const currentLiveMph = calculateMph(currentOngoingLapTime);

  const handleExportCSV = () => {
    if (laps.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,Distance Segment (mi),Cumulative Total Time (MM:SS.T_half),Segment Split Time (MM:SS.T_half),Average Speed (mph)\n";
    
    const sortedLaps = [...laps].reverse();
    sortedLaps.forEach((lap) => {
      csvContent += `${lap.distance} mi,${formatTime(lap.cumulativeTime).full},${formatTime(lap.lapTime).full},${calculateMph(lap.lapTime)} mph\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Quarter_Mile_HalvedTenths_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyText = () => {
    if (laps.length === 0) return;
    const sortedLaps = [...laps].reverse();
    let text = `⏱️ 1/4 Mile Split Performance Log (Halved Tenths Mode .0-.4) - ${new Date().toLocaleDateString()}\n`;
    text += `Total Distance: ${laps[0].distance} mi\n`;
    text += `Total Cumulative Time: ${formatTime(elapsedTime).full}\n\n`;
    text += `Segment | Cumulative Total | Split Time | Speed (mph)\n`;
    text += `--------------------------------------------------------\n`;
    sortedLaps.forEach((lap) => {
      text += `${lap.distance} mi | ${formatTime(lap.cumulativeTime).full} | ${formatTime(lap.lapTime).full} | ${calculateMph(lap.lapTime)} mph\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const clearHistory = () => {
    setSavedSessions([]);
    localStorage.removeItem('ios_timer_sessions');
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-100 text-zinc-900'
    }`}>
      
      {/* HEADER BAR */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 sm:px-8 py-3 transition-colors ${
        isDarkMode ? 'bg-zinc-950/80 border-zinc-800/80' : 'bg-white/80 border-zinc-200/80'
      }`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-black font-extrabold shadow-md shadow-orange-500/20">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight leading-none">Distance Split Timer</h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Info size={11} />
                  Halved Tenths (.0-.4)
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">1/4 Mile Segment Tracker (ms/100 ÷ 2)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition ${
                isDarkMode 
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300' 
                  : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
              }`}
              title="Saved Sessions"
            >
              <History size={16} />
              <span className="hidden sm:inline">History ({savedSessions.length})</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl transition ${
                isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
              }`}
              title="Toggle Audio Feedback"
            >
              {soundEnabled ? <Volume2 size={16} className="text-emerald-500" /> : <VolumeX size={16} className="opacity-40" />}
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl transition ${
                isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-amber-400' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
              }`}
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              onClick={() => setIsPhoneView(!isPhoneView)}
              className={`p-2 rounded-xl transition hidden lg:flex items-center gap-1 text-xs font-medium ${
                isPhoneView
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                  : (isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700')
              }`}
              title="Toggle Frame Layout"
            >
              {isPhoneView ? <Maximize2 size={16} /> : <Smartphone size={16} />}
              <span>{isPhoneView ? 'Full Web' : 'Phone Frame'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        
        <div className={`transition-all duration-300 ${
          isPhoneView ? 'max-w-md mx-auto w-full' : 'w-full'
        }`}>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            <div className={`${isPhoneView ? 'lg:col-span-12' : 'lg:col-span-5'} flex flex-col gap-6`}>
              
              {/* Primary Clock Card */}
              <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl backdrop-blur-xl relative overflow-hidden flex flex-col items-center justify-center transition-all ${
                isDarkMode 
                  ? 'bg-zinc-900/60 border-zinc-800 shadow-black/40' 
                  : 'bg-white/80 border-zinc-200 shadow-slate-300/50'
              }`}>
                
                <div className="flex items-center justify-between w-full mb-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                    isRunning 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                      : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`}></div>
                    <span>{isRunning ? 'TRACKING LIVE' : 'STOPPED'}</span>
                  </div>

                  <span className="text-xs font-mono font-medium text-zinc-400">
                    Segment: <strong className="text-amber-500">{currentDistanceMarker} mi</strong>
                  </span>
                </div>

                {/* Prominent Cumulative Time Display with Halved Tenths */}
                <div className="text-center my-1">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400 block mb-0.5">
                    Cumulative Time (Halved Tenths .0-.4)
                  </span>
                  <div className="flex items-baseline justify-center select-none font-mono tracking-tighter">
                    <span className="text-5xl sm:text-6xl font-semibold tabular-nums">
                      {formattedMain.min}:{formattedMain.sec}
                    </span>
                    <span className="text-3xl sm:text-4xl text-amber-500 font-bold ml-1 tabular-nums">
                      .{formattedMain.ms}
                    </span>
                  </div>
                </div>

                {/* Ongoing 0.25 mi Split Time Card */}
                <div className={`mt-5 w-full p-4 rounded-2xl border flex flex-col items-center justify-center transition-colors ${
                  isDarkMode ? 'bg-zinc-950/80 border-zinc-800' : 'bg-zinc-100/80 border-zinc-200'
                }`}>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold mb-1">
                    Current 0.25 mi Interval Split Time
                  </span>
                  <span className="font-bold text-3xl sm:text-4xl font-mono text-emerald-500 tabular-nums tracking-tight">
                    {formattedCurrentLap.full}
                  </span>
                  <span className="text-xs font-mono text-amber-500 font-medium mt-1">
                    Speed: {currentLiveMph} mph
                  </span>
                </div>

                {/* Stat Badges Grid */}
                <div className="grid grid-cols-2 gap-3 w-full mt-5">
                  <div className={`p-3 rounded-2xl flex flex-col gap-1 border ${
                    isDarkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <MapPin size={12} className="text-emerald-500" />
                      Total Distance
                    </span>
                    <span className="text-base font-bold font-mono text-emerald-500">
                      {laps.length > 0 ? `${laps[0].distance} mi` : '0.00 mi'}
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl flex flex-col gap-1 border ${
                    isDarkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Gauge size={12} className="text-amber-500" />
                      Est. Speed
                    </span>
                    <span className="text-base font-bold font-mono text-amber-500">
                      {isRunning ? `${currentLiveMph} mph` : (laps.length > 0 ? `${calculateMph(laps[0].lapTime)} mph` : '0.00 mph')}
                    </span>
                  </div>
                </div>

              </div>

              {/* Action Control Buttons (+0.25 mi Split) */}
              <div className={`p-6 rounded-3xl border shadow-xl backdrop-blur-xl flex justify-around items-center gap-4 transition-all ${
                isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white/80 border-zinc-200'
              }`}>
                <button
                  onClick={isRunning ? handleSplit : handleReset}
                  disabled={!isRunning && elapsedTime === 0}
                  className={`flex-1 max-w-[140px] h-20 rounded-2xl flex flex-col items-center justify-center gap-0.5 font-bold transition-all transform active:scale-95 shadow-lg ${
                    !isRunning && elapsedTime === 0
                      ? (isDarkMode ? 'bg-zinc-800/40 text-zinc-600 cursor-not-allowed border border-zinc-800' : 'bg-zinc-200/50 text-zinc-400 cursor-not-allowed')
                      : isRunning
                      ? 'bg-gradient-to-b from-zinc-700 to-zinc-800 text-zinc-100 hover:from-zinc-600 hover:to-zinc-700 border border-zinc-600'
                      : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <span className="text-sm">+0.25 mi</span>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400">Split</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={18} />
                      <span className="text-xs">Reset</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleStartStop}
                  className={`flex-1 max-w-[160px] h-20 rounded-2xl flex flex-col items-center justify-center gap-0.5 font-extrabold transition-all transform active:scale-95 shadow-lg ${
                    isRunning
                      ? 'bg-gradient-to-b from-rose-600 to-rose-700 text-white hover:from-rose-500 hover:to-rose-600 shadow-rose-900/30'
                      : 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-zinc-950 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-900/30'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Square size={18} fill="currentColor" />
                      <span className="text-xs uppercase tracking-widest">STOP</span>
                    </>
                  ) : (
                    <>
                      <Play size={20} fill="currentColor" className="ml-0.5" />
                      <span className="text-xs uppercase tracking-widest">START</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            <div className={`${isPhoneView ? 'lg:col-span-12' : 'lg:col-span-7'} flex flex-col gap-6`}>
              
              <div className={`p-6 rounded-3xl border shadow-xl backdrop-blur-xl flex flex-col h-[560px] transition-all ${
                isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white/80 border-zinc-200'
              }`}>
                
                {/* Header & Export Actions */}
                <div className="flex justify-between items-center pb-4 border-b border-zinc-800/60">
                  <div>
                    <h2 className="font-bold text-base flex items-center gap-2">
                      <Flag size={18} className="text-amber-500" />
                      1/4 Mile Split Records
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Tenths formatted as <code className="text-amber-500">Math.floor(tenths / 2)</code> (.0–.4)</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyText}
                      disabled={laps.length === 0}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        laps.length > 0 
                          ? (copied ? 'bg-emerald-600 text-white' : (isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'))
                          : 'opacity-30 cursor-not-allowed'
                      }`}
                      title="Copy to Clipboard"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={handleExportCSV}
                      disabled={laps.length === 0}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        laps.length > 0 
                          ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950'
                          : 'opacity-30 cursor-not-allowed'
                      }`}
                      title="Download CSV"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">CSV</span>
                    </button>
                  </div>
                </div>

                {/* Scrollable Splits List */}
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40 pr-1 my-2 scrollbar-thin">
                  
                  {/* Live Ongoing Split Row */}
                  {isRunning && (
                    <div className={`py-3 px-4 rounded-2xl my-2 border transition-colors ${
                      isDarkMode ? 'bg-zinc-800/40 border-zinc-700/50' : 'bg-zinc-100 border-zinc-200'
                    }`}>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-sans font-semibold text-zinc-400 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                          {currentDistanceMarker} mi (Active)
                        </span>
                        <span className="font-mono text-amber-500 font-bold">
                          {currentLiveMph} mph
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline mt-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400">Split Time</span>
                          <span className="text-base font-bold font-mono text-emerald-500 tabular-nums">
                            {formattedCurrentLap.full}
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400">Cumulative Time</span>
                          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-500 tabular-nums">
                            {formattedMain.full}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recorded Split List Items */}
                  {laps.length > 0 ? (
                    laps.map((lap) => {
                      const isFastest = laps.length >= 2 && lap.lapTime === minLapTime;
                      const isSlowest = laps.length >= 2 && lap.lapTime === maxLapTime;

                      let cardBg = isDarkMode ? 'bg-zinc-950/40 hover:bg-zinc-800/30' : 'bg-zinc-50 hover:bg-zinc-100';
                      let splitTextColor = isDarkMode ? 'text-zinc-200' : 'text-zinc-800';

                      if (isFastest) {
                        splitTextColor = 'text-emerald-500';
                        cardBg = isDarkMode ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50/70 border-emerald-200';
                      } else if (isSlowest) {
                        splitTextColor = 'text-rose-500';
                        cardBg = isDarkMode ? 'bg-rose-950/20 border-rose-800/40' : 'bg-rose-50/70 border-rose-200';
                      }

                      return (
                        <div 
                          key={lap.id} 
                          className={`p-3.5 sm:p-4 rounded-2xl my-2 border transition-all ${cardBg}`}
                        >
                          <div className="grid grid-cols-12 items-center gap-2">
                            
                            {/* LEFT COLUMN: Distance Badge */}
                            <div className="col-span-3 flex flex-col justify-center items-start">
                              <span className="font-bold text-amber-500 font-mono text-sm sm:text-base">
                                {lap.distance} mi
                              </span>
                              {isFastest && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-500 font-bold px-1.5 py-0.5 rounded mt-0.5">
                                  Fastest
                                </span>
                              )}
                              {isSlowest && (
                                <span className="text-[10px] bg-rose-500/20 text-rose-500 font-bold px-1.5 py-0.5 rounded mt-0.5">
                                  Slowest
                                </span>
                              )}
                            </div>

                            {/* CENTER COLUMN: Split Time & Speed */}
                            <div className="col-span-4 flex flex-col justify-center items-center text-center">
                              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
                                Split Time
                              </span>
                              <span className={`text-sm sm:text-base font-bold font-mono ${splitTextColor}`}>
                                {formatTime(lap.lapTime).full}
                              </span>
                              <span className="text-[10px] font-mono text-amber-500 mt-0.5">
                                {calculateMph(lap.lapTime)} mph
                              </span>
                            </div>

                            {/* RIGHT COLUMN: Doubled Cumulative Time */}
                            <div className="col-span-5 flex flex-col justify-center items-end text-right">
                              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-medium">
                                Cumulative Time
                              </span>
                              <span className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                                {formatTime(lap.cumulativeTime).full}
                              </span>
                            </div>

                          </div>

                        </div>
                      );
                    })
                  ) : !isRunning && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs py-12">
                      <MapPin size={28} className="mb-2 opacity-20" />
                      <p className="font-medium">No distance splits logged yet</p>
                      <p className="text-[11px] opacity-60 mt-1">Press "+0.25 mi Split" while running to record quarter-mile segments</p>
                    </div>
                  )}

                </div>

              </div>

            </div>

          </div>

        </div>

      </main>

      {/* SAVED SESSIONS HISTORY MODAL */}
      {}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border transition-all ${
            isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
          }`}>
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-800">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <History className="text-amber-500" size={20} />
                Saved Running Sessions
              </h3>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {savedSessions.length > 0 ? (
                savedSessions.map((session) => (
                  <div 
                    key={session.id}
                    className={`p-4 rounded-2xl border flex flex-col gap-2 ${
                      isDarkMode ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                      <span>{session.date}</span>
                      <span className="font-mono text-emerald-500 font-bold">{session.totalDistance} mi total</span>
                    </div>

                    <div className="flex justify-between items-baseline font-mono">
                      <span className="text-sm font-bold">Cumulative Time: {formatTime(session.totalTime).full}</span>
                      <span className="text-xs text-amber-500">{session.splitsCount} splits recorded</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No previous sessions saved yet. Resetting a session automatically saves it here.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between items-center pt-3 border-t border-zinc-800">
              {savedSessions.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-rose-500 hover:text-rose-400 flex items-center gap-1 font-medium"
                >
                  <Trash2 size={13} />
                  Clear History
                </button>
              )}
              <button
                onClick={() => setShowHistoryModal(false)}
                className="ml-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}