import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSound } from './hooks/useSound';
import { MuteButton } from './components/UI';
import { TeacherDashboard } from './components/TeacherTools';
import { Login, StudentDashboard } from './components/Dashboards.jsx';

// --- IMPORTS FIREBASE ---
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

// --- IMPORTS DES COMPOSANTS DE JEU ---
import { Game } from './components/Game';
import ChronoGame from './components/games/ChronoGame';
import SurvivalGameLogic from './components/games/SurvivalGame';
import BrevetGame from './components/games/BrevetGame';

// --- IMPORTS DES EXERCICES SPÉCIFIQUES ---
import ExerciceLectureGraphique from './components/ExerciceLectureGraphique.jsx';
import ExerciceTableauValeursCourbe from './components/games/ExerciceTableauValeursCourbe.jsx';
import ExerciceThales from './components/games/ExerciceThales';
import ExercicePythagore from './components/games/ExercicePythagore';

// --- DONNÉES ---
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
      // --- CORRECTION ICI ---
      // On ne redirige vers le dashboard QUE si on est sur l'écran de login.
      // Si on est déjà en jeu (view === 'GAME'), on ne fait rien pour ne pas couper l'écran de fin.
      if (view === 'LOGIN') {
        setView('DASHBOARD');
      }
    } else {
      setActiveTab('HOME');
    }
  }, [user]); // On garde uniquement user en dépendance

  const triggerSound = (type) => {
    playSound(type, muted);
  };

  const handlePlay = (mode, id, level = 1) => {
    triggerSound('CLICK');

    // --- MODE BREVET ---
    if (mode === 'BREVET') {
      const subject = BREVET_DATA.find(s => s.id === id);
      if (subject) {
        // CORRECTION IMPORTANTE : On ajoute "id: id" pour que la sauvegarde fonctionne
        setGameConfig({ mode: 'BREVET', subject, id: id });
        setView('GAME');
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


  // --- FONCTION DE SAUVEGARDE BREVET ---
  const handleBrevetFinish = async (resultData) => {
    if (!user || !gameConfig) return;

    // --- RECHERCHE INTELLIGENTE DE L'ID ---
    let targetUserId = user.data?.id || user.id; // On essaie l'ID direct
    const userIdentifiant = user.identifiant || user.data?.identifiant;

    try {
      // Si on n'a pas d'ID fiable mais qu'on a un identifiant (ex: "PIERRED"), on cherche le dossier
      if (!targetUserId && userIdentifiant) {
        console.log(`🔍 Recherche du dossier pour l'identifiant : ${userIdentifiant}`);
        const q = query(collection(db, "eleves"), where("identifiant", "==", userIdentifiant));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          targetUserId = querySnapshot.docs[0].id;
          console.log(`✅ Dossier trouvé ! ID : ${targetUserId}`);
        } else {
          console.warn("⚠️ Aucun dossier élève trouvé avec cet identifiant.");
        }
      }

      // Si après recherche on n'a toujours pas d'ID, on tente le fallback sur l'UID (Auth)
      if (!targetUserId) targetUserId = user.uid;

      if (!targetUserId) {
        alert("Erreur critique : Impossible d'identifier le dossier de l'élève.");
        return;
      }

      // --- SAUVEGARDE CLASSIQUE (Maintenant qu'on a le bon ID) ---
      const userRef = doc(db, "eleves", targetUserId);
      const sujetId = gameConfig.id;

      // On récupère l'historique local pour comparer
      const currentHistory = user.data?.brevet_history || (user.brevet_history) || {};
      const oldResult = currentHistory[sujetId];

      const newMark = parseFloat(resultData.markOver20);
      const oldMark = oldResult ? parseFloat(oldResult.markOver20 || 0) : 0;

      console.log(`📝 Note : ${newMark}/20 (Record actuel : ${oldMark}/20)`);

      if (!oldResult || newMark > oldMark) {
        await updateDoc(userRef, {
          [`brevet_history.${sujetId}`]: resultData
        });

        // Mise à jour de l'affichage local
        const updatedUser = { ...user };
        // On s'assure que la structure existe pour l'affichage immédiat
        if (!updatedUser.data) updatedUser.data = {};
        // Si user.data était vide, on y remet au moins l'identifiant pour ne pas perdre la session visuelle
        if (!updatedUser.data.identifiant) updatedUser.data.identifiant = userIdentifiant;

        if (!updatedUser.data.brevet_history) updatedUser.data.brevet_history = {};
        updatedUser.data.brevet_history[sujetId] = resultData;

        setUser(updatedUser);
        triggerSound('WIN');
        console.log("💾 Sauvegarde réussie !");
      } else {
        console.log("Note inférieure au record, pas de sauvegarde.");
      }

    } catch (e) {
      console.error("❌ Erreur sauvegarde :", e);
      // On n'affiche l'alerte que si ce n'est pas juste un problème de record battu
      if (e.code !== 'not-found') alert("Erreur lors de la sauvegarde : " + e.message);
    }
  };

  const handleFinish = async (score) => {
    // Si c'est un Brevet, on sort car c'est géré par handleBrevetFinish
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

          // 1. MODE BREVET
          gameConfig?.mode === 'BREVET' ? (
            <BrevetGame
              subject={gameConfig.subject}
              onFinish={handleBrevetFinish} // CORRECTION : On passe la fonction de sauvegarde
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
              gameConfig?.id === 'auto_25_pythagore' ? (
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

                    // 3. JEU STANDARD
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