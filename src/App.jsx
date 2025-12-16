import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSound } from './hooks/useSound';
import { MuteButton, LoadingScreen } from './components/UI';
import { TeacherDashboard } from './components/TeacherTools';
import { StudentDashboard } from './components/Dashboards.jsx';
import { Login } from './components/Login.jsx';
import Landing from './components/Landing';
import { Toaster, toast } from 'react-hot-toast';




// --- IMPORTS FIREBASE ---
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import AdminPanel from './components/AdminPanel';

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
  const { user, loading, login, logout, saveProgress, setUser, refreshStudent, resetTeacherAccount, resetTraining } = useAuth();
  const { playSound } = useSound();
  const [view, setView] = useState('LOGIN');
  const [activeTab, setActiveTab] = useState('HOME');
  const [gameConfig, setGameConfig] = useState(null);
  const [muted, setMuted] = useState(false);
  const [authMode, setAuthMode] = useState('LANDING');
  const handleGoToLogin = () => {
    setAuthMode('LOGIN');
    playSound('CLICK');
  };

  useEffect(() => {
    // 1. Détection de l'URL secrète
    if (window.location.pathname === '/admin-secret') {
      setView('ADMIN_SECRET');
      return; // On arrête là, on ne redirige pas ailleurs
    }

    // 2. Comportement normal (Login -> Dashboard)
    if (user) {
      if (view === 'LOGIN') {
        setView('DASHBOARD');
      }
    } else {
      setActiveTab('HOME');
    }
  }, [user]);

  useEffect(() => {
    // On vérifie si l'URL contient "?payment_success=true"
    const params = new URLSearchParams(window.location.search);

    if (params.get('payment_success')) {
      // 1. On joue le son de victoire
      playSound('WIN');

      // 2. On affiche un message (tu pourras faire une belle modale plus tard)
      alert("🎉 Félicitations ! Ton compte est maintenant PREMIUM !\n\nProfite de l'accès illimité à tous les contenus.");

      // 3. On nettoie l'URL pour ne pas réafficher le message si on rafraîchit la page
      window.history.replaceState({}, document.title, window.location.pathname);

      // 4. Force le rechargement de l'utilisateur pour être sûr que le statut Premium est à jour localement
      window.location.reload();
    }
  }, []);

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

        // On crée un message riche (JSX)
        toast.success(
          <div className="text-center">
            <div className="font-black text-lg mb-1">Bravo ! +{result.xpGainTotal} XP</div>
            <div className="text-sm opacity-90 space-y-1">
              {result.details?.exo > 0 && <div>💪 Exercice : +{result.details.exo} XP</div>}
              {result.details?.quest > 0 && <div className="text-purple-600 font-bold">🎯 Quête : +{result.details.quest} XP</div>}
              {result.details?.bonus > 0 && <div className="text-orange-500 font-bold">🔥 Bonus : +{result.details.bonus} XP</div>}
              {result.questCompletedNow && <div className="mt-2 text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold">🎉 QUÊTE TERMINÉE !</div>}
            </div>
          </div>,
          { duration: 5000, icon: '🌟' }
        );
      }, 500);
    }
    else if (score >= 9) {
      setTimeout(() => {
        toast("Score parfait ! Mais tu as déjà validé cet exercice 3 fois (pas d'XP).", {
          icon: '👏',
          duration: 4000
        });
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

  // --- AFFICHAGE (RENDU) ---

  // 1. Écran de chargement global (Auth + Chargement initial)
  if (loading) {
    return <LoadingScreen message="Démarrage..." />;
  }

  // 2. Si l'utilisateur est CONNECTÉ
  if (user) {
    return (
      <>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: '16px',
              background: '#333',
              color: '#fff',
              fontFamily: 'sans-serif',
              fontWeight: 'bold',
            },
            success: {
              style: { background: '#ecfdf5', color: '#065f46', border: '2px solid #10b981' },
            },
            error: {
              style: { background: '#fef2f2', color: '#991b1b', border: '2px solid #ef4444' },
            },
          }}
        />
        <MuteButton muted={muted} toggle={() => setMuted(!muted)} />

        {/* Panneau Admin Secret */}
        {view === 'ADMIN_SECRET' && <AdminPanel user={user} onBack={() => setView('ADMIN')} />}

        {/* Dashboard Professeur */}
        {view === 'ADMIN' && (
          <TeacherDashboard
            user={user}
            onLogout={() => { logout(); setView('LOGIN'); setAuthMode('LANDING'); }}
            onBackToGame={() => { setView('DASHBOARD'); setActiveTab('HOME'); }}
            onSound={triggerSound}
            onReset={resetTeacherAccount}
            setUser={setUser}
            onOpenAdmin={() => setView('ADMIN_SECRET')}
          />
        )}

        {/* Dashboard Élève */}
        {view === 'DASHBOARD' && (
          <StudentDashboard
            user={user}
            onPlay={handlePlay}
            onLogout={() => { logout(); setView('LOGIN'); setAuthMode('LANDING'); }}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            loading={loading} // Ici on passe le loading global
            onAdmin={() => setView('ADMIN')}
            onSound={triggerSound}
            onResetTraining={resetTraining}
          />
        )}

        {/* Zone de Jeu (Suspense pour chargement dynamique) */}
        <Suspense fallback={<div className="p-10 text-center font-bold text-slate-400">Chargement du jeu...</div>}>

          {view === 'GAME' && (
            gameConfig?.mode === 'BREVET' ? (
              <BrevetGame
                subject={gameConfig.subject}
                onFinish={handleBrevetFinish}
                onQuit={() => { setView('DASHBOARD'); setGameConfig(null); }}
              />
            ) : gameConfig?.id === 'auto_26_thales' ? (
              <ExerciceThales
                key={`thales-${gameConfig.level}`}
                level={gameConfig.level}
                user={user}
                onFinish={handleFinish}
                onQuit={() => { setView('DASHBOARD'); setGameConfig(null); }}
                onSound={triggerSound}
              />
            ) : gameConfig?.id === 'auto_25_pythagore' ? (
              <ExercicePythagore
                key={`pythagore-${gameConfig.level}`}
                level={gameConfig.level}
                user={user}
                onFinish={handleFinish}
                onQuit={() => { setView('DASHBOARD'); setGameConfig(null); }}
                onSound={triggerSound}
              />
            ) : gameConfig?.id === 'auto_37_graph' ? (
              <ExerciceLectureGraphique
                key={`graph-${gameConfig.level}`}
                user={user}
                level={gameConfig.level}
                onFinish={handleFinish}
                onQuit={() => { setView('DASHBOARD'); setGameConfig(null); }}
                onSound={triggerSound}
              />
            ) : gameConfig?.id === 'auto_38_graph2' ? (
              <ExerciceTableauValeursCourbe
                key={`graph-${gameConfig.level}`}
                user={user}
                level={gameConfig.level}
                onFinish={handleFinish}
                onQuit={() => { setView('DASHBOARD'); setGameConfig(null); }}
                onSound={triggerSound}
              />
            ) : (
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
  }

  // 3. Si l'utilisateur n'est PAS CONNECTÉ

  // Mode LOGIN (Formulaire)
  if (authMode === 'LOGIN') {
    return (
      <Login
        onLogin={login}
        onSound={triggerSound}
        onBack={() => setAuthMode('LANDING')} // Bouton retour vers la Landing
      />
    );
  }

  // Par défaut : LANDING PAGE (Vitrine)
  return <Landing onConnect={handleGoToLogin} />;
}
