import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSound } from './hooks/useSound';
import { MuteButton } from './components/UI';
import { TeacherDashboard } from './components/TeacherTools';
import { Login, StudentDashboard } from './components/Dashboards.jsx';

// --- IMPORTS DES COMPOSANTS DE JEU ---
import { Game } from './components/Game';
import ChronoGame from './components/games/ChronoGame';
import SurvivalGameLogic from './components/games/SurvivalGame';
import BrevetGame from './components/games/BrevetGame'; // <--- NOUVEAU COMPOSANT

// --- IMPORTS DES EXERCICES SPÉCIFIQUES ---
import ExerciceLectureGraphique from './components/ExerciceLectureGraphique.jsx';
import ExerciceTableauValeursCourbe from './components/games/ExerciceTableauValeursCourbe.jsx';
import ExerciceThales from './components/games/ExerciceThales';
import ExercicePythagore from './components/games/ExercicePythagore'; // N'oublie pas Pythagore !

// --- DONNÉES (Pour retrouver le sujet complet par ID) ---
import { BREVET_DATA } from './utils/brevetData.js';

export default function App() {
  const { user, loading, login, saveProgress, setUser, refreshStudent, resetTeacherAccount, resetTraining } = useAuth();
  const { playSound } = useSound();
  const [view, setView] = useState('LOGIN');
  const [activeTab, setActiveTab] = useState('HOME');
  const [gameConfig, setGameConfig] = useState(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (user) {
      setView('DASHBOARD');
    } else {
      setActiveTab('HOME');
    }
  }, [user]);

  const triggerSound = (type) => {
    playSound(type, muted);
  };

  const handlePlay = (mode, id, level = 1) => {
    triggerSound('CLICK');

    // --- MODE BREVET ---
    if (mode === 'BREVET') {
      // On cherche le sujet complet dans les données
      const subject = BREVET_DATA.find(s => s.id === id);
      if (subject) {
        setGameConfig({ mode: 'BREVET', subject }); // On stocke l'objet sujet complet
        setView('GAME'); // On passe en vue jeu
      } else {
        console.error("Sujet introuvable :", id);
      }
    }
    // --- AUTRES MODES ---
    else if (mode === 'SURVIVAL_PLAY') {
      setGameConfig({ modeId: id });
      setView('SURVIVAL_GAME');
    }
    else if (mode === 'CHRONO') {
      setView('CHRONO');
    }
    else if (mode === 'SURVIVAL') {
      setActiveTab('SURVIVAL');
    }
    else if (mode === 'TABLES_ALL') {
      setGameConfig({ mode: 'TABLES_ALL', id: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
      setView('GAME');
    }
    else {
      // Mode classique (Automatismes)
      setGameConfig({ mode, id, level });
      setView('GAME');
    }
  };

  const handleFinish = async (score) => {
    // Si c'est un Brevet, on ne sauvegarde pas d'XP pour l'instant (ou logique spécifique plus tard)
    if (gameConfig?.mode === 'BREVET') {
      setView('DASHBOARD');
      setGameConfig(null);
      return;
    }

    const result = await saveProgress(gameConfig.mode, gameConfig.id, gameConfig.level, score);
    setView('DASHBOARD');
    setGameConfig(null);

    if (result && result.xpGainTotal > 0) {
      setTimeout(() => {
        triggerSound('WIN');
        let msg = `Bravo ! Tu as gagné +${result.xpGainTotal} XP !\n`;
        if (result.details?.exo > 0) msg += `\n💪 Exercice : +${result.details.exo} XP`;
        if (result.details?.quest > 0) msg += `\n🎯 Objectif Quête : +${result.details.quest} XP`;
        if (result.details?.bonus > 0) msg += `\n🔥 Bonus final : +${result.details.bonus} XP`;
        if (result.questCompletedNow) msg += `\n\n🎉 QUÊTE TERMINÉE !`;
        alert(msg);
      }, 500);
    }
    else if (score >= 9) {
      setTimeout(() => {
        alert("Bravo pour le score ! \n\nTu n'as pas gagné d'XP car :\n1. Tu as déjà validé cet exercice 3 fois.\n2. Ce n'était pas une cible de quête active.");
      }, 500);
    }
  };

  const handleSurvivalFinish = (modeId, score) => {
    saveProgress('SURVIVAL', modeId, null, score);
    setView('DASHBOARD');
  };

  const handleChronoFinish = (time) => {
    saveProgress('CHRONO', null, null, null, time);
    setView('DASHBOARD');
  };

  if (loading && view === 'LOGIN') return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Chargement...</div>;

  return (
    <>
      <MuteButton muted={muted} toggle={() => setMuted(!muted)} />
      {view === 'LOGIN' && <Login onLogin={login} onSound={triggerSound} />}

      {view === 'ADMIN' && <TeacherDashboard
        user={user}
        onLogout={() => { setUser(null); setView('LOGIN'); }}
        onBackToGame={() => { setView('DASHBOARD'); setActiveTab('HOME'); }}
        onSound={triggerSound}
        onReset={resetTeacherAccount}
        setUser={setUser}
      />}

      {view === 'DASHBOARD' && <StudentDashboard
        user={user}
        onPlay={handlePlay}
        onLogout={() => { setUser(null); setView('LOGIN'); }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        loading={loading}
        onAdmin={() => setView('ADMIN')}
        onSound={triggerSound}
        onResetTraining={resetTraining}
      />}

      <Suspense fallback={<div className="p-10 text-center font-bold text-slate-400">Chargement du jeu...</div>}>

        {view === 'GAME' && (
          // --- ROUTEUR DES MODES DE JEU ---

          // 1. MODE BREVET (NOUVEAU)
          gameConfig?.mode === 'BREVET' ? (
            <BrevetGame
              subject={gameConfig.subject}
              onQuit={() => { setView('DASHBOARD'); setGameConfig(null); }}
            />
          ) :

            // 2. EXERCICES SPÉCIFIQUES
            gameConfig?.id === 'auto_26_thales' ? (
              <ExerciceThales
                key={`thales-${gameConfig.level}`}
                level={gameConfig.level}
                user={user}
                onFinish={handleFinish}
                onQuit={() => { setView('DASHBOARD'); setGameConfig(null); }}
                onSound={triggerSound}
              />
            ) :
              gameConfig?.id === 'auto_25_pythagore' ? ( // Ajout de Pythagore
                <ExercicePythagore
                  key={`pythagore-${gameConfig.level}`}
                  level={gameConfig.level}
                  user={user}
                  onFinish={handleFinish}
                  onQuit={() => { setView('DASHBOARD'); setGameConfig(null); }}
                  onSound={triggerSound}
                />
              ) :
                gameConfig?.id === 'auto_37_graph' ? (
                  <ExerciceLectureGraphique
                    key={`graph-${gameConfig.level}`}
                    user={user}
                    level={gameConfig.level}
                    onFinish={handleFinish}
                    onQuit={() => { setView('DASHBOARD'); setGameConfig(null); }}
                    onSound={triggerSound}
                  />
                ) :
                  gameConfig?.id === 'auto_38_graph2' ? (
                    <ExerciceTableauValeursCourbe
                      key={`graph-${gameConfig.level}`}
                      user={user}
                      level={gameConfig.level}
                      onFinish={handleFinish}
                      onQuit={() => { setView('DASHBOARD'); setGameConfig(null); }}
                      onSound={triggerSound}
                    />
                  ) :

                    // 3. JEU STANDARD (Le reste)
                    (
                      <Game
                        user={user}
                        config={gameConfig}
                        level={gameConfig.level}
                        onFinish={handleFinish}
                        onBack={() => { setView('DASHBOARD'); setGameConfig(null); }}
                        onSound={triggerSound}
                      />
                    )
        )}

        {view === 'SURVIVAL_GAME' && (
          <SurvivalGameLogic
            modeId={gameConfig.modeId}
            onFinish={(s) => handleSurvivalFinish(gameConfig.modeId, s)}
            onSound={triggerSound}
            user={user}
          />
        )}

        {view === 'CHRONO' && (
          <ChronoGame
            user={user}
            onFinish={handleChronoFinish}
            onBack={() => setView('DASHBOARD')}
            onSound={triggerSound}
          />
        )}
      </Suspense>
    </>
  );
};