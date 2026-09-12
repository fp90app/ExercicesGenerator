import React, { useState } from 'react';
import { db } from './firebase';
import { collection, doc, writeBatch, getDoc } from 'firebase/firestore';

// --- COMPÉTENCES DE 6ÈME ---
const COMPETENCES_6EME = [
    {
        chapitre: 1, chapitreNom: "Nombres entiers 1 - Numération de position, décompositions", items: [
            { code: "NT1", intitule: "Je sais décomposer un nombre", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "NC1", intitule: "Je comprends la valeur d'un chiffre selon sa position", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 2, chapitreNom: "Segments, droites, demi-droites", items: [
            { code: "GT1", intitule: "Je sais reconnaitre et nommer les objets de géométrie", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter", "Communiquer"] },
            { code: "GT2", intitule: "Je sais utiliser les bonnes notations ([], (), [))", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Communiquer"] },
            { code: "GC1", intitule: "Je comprends la différence entre une droite, une demi-droite et un segment", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 3, chapitreNom: "Nombres entiers 2 - Demi-droites graduées, comparaisons", items: [
            { code: "NT2", intitule: "Je sais comparer et ranger les nombres entiers", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "NT3", intitule: "Je sais placer et repérer un nombre sur une droite graduée", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "NC2", intitule: "Je comprends l'ordre et la grandeur des nombres", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 4, chapitreNom: "Appartenance, milieu, longueurs", items: [
            { code: "GT3", intitule: "Je sais placer le milieu d'un segment et le coder", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Calculer", "Représenter"] },
            { code: "GT4", intitule: "Je sais utiliser les bonnes notations (∈)", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Communiquer"] },
            { code: "GC2", intitule: "Je comprends ce que signifie \"un point appartient à une droite\"", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "GC3", intitule: "Je comprends ce qu'est le milieu d'un segment", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 5, chapitreNom: "Fractions 1 - Partage, fractions égales, demi-droite graduée", items: [
            { code: "NT4", intitule: "Je sais déterminer et écrire la fraction qui correspond à la partie coloriée d'une figure donnée", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "NT5", intitule: "Je sais lire et écrire la fraction qui correspond à un point donné sur une demi-droite graduée", domaine: "Numération", type: "Technique", grandesCompetences: ["Raisonner", "Représenter"] },
            { code: "NC3", intitule: "Je comprends le rôle exact du numérateur et du dénominateur", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner", "Modéliser"] },
            { code: "NC4", intitule: "Je comprends qu'une fraction n'a de sens que si l'unité de référence a été partagée en parts strictement égales", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner", "Modéliser"] },
            { code: "NC5", intitule: "Je comprends que différentes écritures fractionnaires peuvent représenter la même proportion", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Représenter"] },
            { code: "NC6", intitule: "Je comprends que l'unité de référence est ce qui est partagé en parts égales", domaine: "Numération", type: "Conceptuel", grandesCompetences: [] },
            { code: "NC7", intitule: "Je comprends qu'une fraction dont le numérateur est supérieur au dénominateur correspond à une quantité plus grande que l'unité", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner", "Modéliser"] }
        ]
    },
    {
        chapitre: 6, chapitreNom: "Droites perpendiculaires - Vocabulaire, tracés", items: [
            { code: "GT5", intitule: "Je sais vérifier si deux droites sont perpendiculaires à l'aide de l'équerre", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GT6", intitule: "Je sais tracer la droite perpendiculaire à une autre passant par un point donné", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GT7", intitule: "Je sais lire et utiliser le codage et les notations (perpendiculaire, longueurs égales, codage de l'angle droit...)", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Communiquer"] },
            { code: "GC4", intitule: "Je comprends ce que sont des droites perpendiculaires", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 7, chapitreNom: "Nombres décimaux 1 - Écriture décimale, demi-droite graduée", items: [
            { code: "NT6", intitule: "Je sais décomposer un nombre décimal", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "NT7", intitule: "Je sais placer et repérer un nombre décimal sur une droite graduée", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "NC8", intitule: "Je comprends la valeur de chaque chiffre dans un nombre décimal", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "NC9", intitule: "Je comprends le lien entre les écritures décimales et les fractions décimales", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "NC10", intitule: "Je comprends que les zéros à la fin de la partie décimale ne changent pas la valeur du nombre", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 8, chapitreNom: "Droites parallèles - Vocabulaire, tracés, propriétés", items: [
            { code: "GT8", intitule: "Je sais tracer la droite parallèle à une autre passant par un point donné", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GC5", intitule: "Je comprends ce que sont des droites parallèles", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "GC6", intitule: "Je connais et je comprends les propriétés des droites parallèles et perpendiculaires", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 9, chapitreNom: "Additions et soustractions", items: [
            { code: "NT8", intitule: "Je sais poser et effectuer une addition de nombres décimaux", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NT9", intitule: "Je sais poser et effectuer une soustraction de nombres décimaux", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NT10", intitule: "Je sais estimer un ordre de grandeur pour vérifier un résultat", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "NC11", intitule: "Je sais choisir la bonne opération pour résoudre un problème", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser"] }
        ]
    },
    {
        chapitre: 10, chapitreNom: "Symétrie axiale", items: [
            { code: "GT9", intitule: "Je sais construire le symétrique d'une figure sur un quadrillage", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GT10", intitule: "Je sais construire le symétrique d'un point ou d'une figure sur papier blanc avec les instruments", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GT11", intitule: "Je sais tracer le ou les axes de symétrie d'une figure", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GC7", intitule: "Je sais reconnaitre si deux figures sont symétriques par rapport à un axe", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "GC8", intitule: "Je sais utiliser les propriétés de la symétrie pour justifier une réponse sans mesurer", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner", "Communiquer"] }
        ]
    },
    {
        chapitre: 11, chapitreNom: "Multiplications", items: [
            { code: "NT11", intitule: "Je sais poser et effectuer une multiplication avec des nombres décimaux", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NT10_b", intitule: "Je sais estimer un ordre de grandeur pour vérifier un résultat", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "NC11_b", intitule: "Je sais choisir la bonne opération pour résoudre un problème", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser"] }
        ]
    },
    {
        chapitre: 12, chapitreNom: "Périmètres", items: [
            { code: "MT1", intitule: "Je sais mesurer ou calculer le périmètre d'une figure", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "MT2", intitule: "Je sais convertir une unité de longueur", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Calculer", "Représenter"] },
            { code: "MC1", intitule: "Je comprends que le périmètre correspond uniquement à la longueur du contour", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Raisonner", "Modéliser"] },
            { code: "MC2", intitule: "Je comprends que pour comparer ou additionner des longueurs, elles doivent être dans la même unité", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Raisonner", "Communiquer"] }
        ]
    },
    {
        chapitre: 13, chapitreNom: "Nombres décimaux 2 - Comparaisons, encadrement", items: [
            { code: "NT12", intitule: "Je sais comparer et ranger des nombres décimaux", domaine: "Numération", type: "Technique", grandesCompetences: ["Raisonner"] },
            { code: "NT13", intitule: "Je sais encadrer un nombre à l'unité, au dixième, au centième...", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "NC1_b", intitule: "Je comprends la valeur d'un chiffre selon sa position", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 14, chapitreNom: "Angles 1 - Vocabulaire, comparaisons, mesures", items: [
            { code: "GT12", intitule: "Je sais nommer correctement un angle", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Communiquer"] },
            { code: "GT13", intitule: "Je sais utiliser le rapporteur pour mesurer un angle avec précision", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GT14", intitule: "Je sais identifier la nature d'un angle", domaine: "Géométrie", type: "Technique", grandesCompetences: [] },
            { code: "GC9", intitule: "Je comprends qu'un angle est une ouverture et ne dépend pas de la longueur des côtés", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Modéliser"] },
            { code: "GC10", intitule: "Je sais estimer la nature d'un angle pour vérifier la cohérence de ma mesure", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 15, chapitreNom: "Divisions euclidiennes", items: [
            { code: "NT14", intitule: "Je sais poser et effectuer une division euclidienne", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NT10_c", intitule: "Je sais estimer un ordre de grandeur pour vérifier un résultat", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "NC11_c", intitule: "Je sais choisir la bonne opération pour résoudre un problème", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser"] }
        ]
    },
    {
        chapitre: 16, chapitreNom: "Aires", items: [
            { code: "MT3", intitule: "Je sais déterminer l'aire d'une figure par pavage ou en comptant les carreaux", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Chercher", "Calculer"] },
            { code: "MT4", intitule: "Je sais utiliser les formules pour calculer l'aire d'un carré, rectangle, triangle rectangle", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "MT5", intitule: "Je sais convertir des unités d'aire", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "MC3", intitule: "Je sais différencier l'aire du périmètre", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Raisonner", "Modéliser"] },
            { code: "MC4", intitule: "Je comprends que deux figures peuvent avoir la même aire mais des périmètres différents", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "MC5", intitule: "Je comprends qu'une mesure d'aire représente le nombre d'unités de surface", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Raisonner", "Communiquer"] }
        ]
    },
    {
        chapitre: 17, chapitreNom: "Divisions décimales", items: [
            { code: "NT15", intitule: "Je sais poser et effectuer une division avec des nombres décimaux", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NC12", intitule: "Je sais déterminer un ordre de grandeur du quotient avant de calculer", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "NC13", intitule: "Je sais choisir la division pour résoudre un problème", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser"] },
            { code: "NC14", intitule: "Je sais choisir entre division euclidienne et division décimale", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser"] }
        ]
    },
    {
        chapitre: 18, chapitreNom: "Cercles", items: [
            { code: "GT15", intitule: "Je sais tracer un cercle (ou un arc) avec un compas", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GT16", intitule: "Je sais nommer et identifier les éléments du cercle", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Communiquer"] },
            { code: "GC11", intitule: "Je comprends la définition du cercle", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "GC12", intitule: "Je sais modéliser une situation de recherche de point équidistant par intersection de deux cercles", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Modéliser"] }
        ]
    },
    {
        chapitre: 19, chapitreNom: "Proportionnalité", items: [
            { code: "NT16", intitule: "Je sais utiliser les propriétés de multiplication et d'addition pour résoudre un problème", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NT17", intitule: "Je sais utiliser la méthode du passage à l'unité", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NT18", intitule: "Je sais déterminer le coefficient de proportionnalité", domaine: "Numération", type: "Technique", grandesCompetences: [] },
            { code: "NC15", intitule: "Je sais identifier les grandeurs intervenant dans un problème", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser"] },
            { code: "NC16", intitule: "Je sais reconnaitre si une situation relève de la proportionnalité", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "NC17", intitule: "Je comprends le concept de proportionnalité multiplicative", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser", "Raisonner"] }
        ]
    },
    {
        chapitre: 20, chapitreNom: "Angles 2 - Tracés", items: [
            { code: "GT17", intitule: "Je sais utiliser le rapporteur pour construire un angle", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GC13", intitule: "J'arrive à déterminer l'ordre des étapes à suivre pour construire une figure géométrique", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Modéliser", "Raisonner"] }
        ]
    },
    {
        chapitre: 21, chapitreNom: "Fraction 2 - Fraction d'une quantité", items: [
            { code: "NT19", intitule: "Je sais calculer la fraction d'une quantité", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NC18", intitule: "Je comprends que la fraction d'une quantité correspond à une proportion", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 22, chapitreNom: "Triangles", items: [
            { code: "GT18", intitule: "Je sais tracer un triangle avec précision avec le compas", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GC14", intitule: "Je comprends les propriétés des triangles", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 23, chapitreNom: "Pourcentages", items: [
            { code: "NT20", intitule: "Je sais appliquer mentalement un pourcentage usuel à une quantité", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NT21", intitule: "Je sais déterminer le pourcentage qui correspond à une proportion", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter", "Calculer"] },
            { code: "NC19", intitule: "Je sais faire le lien entre le symbole % et une fraction sur 100", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "NC20", intitule: "Je sais associer les pourcentages usuels à des fractions simples", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Communiquer"] }
        ]
    },
    {
        chapitre: 24, chapitreNom: "Médiatrices", items: [
            { code: "GT19", intitule: "Je sais reconnaitre et tracer la médiatrice d'un segment", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GC15", intitule: "Je comprends ce que représente la médiatrice et son lien avec l'équidistance", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 25, chapitreNom: "Fractions 3 - Fraction nombre", items: [
            { code: "NT22", intitule: "Je sais passer d'une représentation fractionnaire à un nombre décimal", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "NC22", intitule: "Je comprends qu'une fraction représente un nombre", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 26, chapitreNom: "Périmètre d'un cercle", items: [
            { code: "MT6", intitule: "Je sais calculer le périmètre d'un cercle", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "MC6", intitule: "Je comprends la signification du nombre pi", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 27, chapitreNom: "Angles 3 - Bissectrices, propriétés", items: [
            { code: "GT20", intitule: "Je sais tracer la bissectrice d'un angle", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GC16", intitule: "Je comprends ce que représente la bissectrice d'un angle", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "GC17", intitule: "J'utilise les mesures d'angles connues pour en calculer d'autres", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Calculer"] }
        ]
    },
    {
        chapitre: 28, chapitreNom: "Probabilités", items: [
            { code: "NT23", intitule: "Je sais exprimer et calculer la probabilité d'un événement sous forme de fraction", domaine: "Gestion de données", type: "Technique", grandesCompetences: ["Modéliser", "Calculer"] },
            { code: "NT24", intitule: "Je connais le vocabulaire des probabilités", domaine: "Gestion de données", type: "Technique", grandesCompetences: ["Communiquer"] },
            { code: "NT25", intitule: "Je sais que la probabilité d'un événement est comprise entre 0 et 1", domaine: "Gestion de données", type: "Technique", grandesCompetences: ["Raisonner"] },
            { code: "NC23", intitule: "Je comprends la modélisation du hasard par des probabilités", domaine: "Gestion de données", type: "Conceptuel", grandesCompetences: ["Modéliser"] },
            { code: "NC24", intitule: "Je comprends qu'une probabilité représente une moyenne sur un grand nombre de répétitions", domaine: "Gestion de données", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 29, chapitreNom: "Solides et volumes", items: [
            { code: "MT7", intitule: "Je sais calculer le volume d'un cube et d'un pavé", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "MT8", intitule: "Je sais reconnaitre et nommer les principaux solides", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Communiquer"] },
            { code: "MT9", intitule: "Je sais représenter les principaux solides en perspective cavalière", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "MC7", intitule: "Je comprends qu'un volume représente la contenance d'un objet", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 30, chapitreNom: "Algèbre", items: [
            { code: "NT26", intitule: "Je sais résoudre des problèmes algébriques", domaine: "Numération", type: "Technique", grandesCompetences: ["Raisonner", "Calculer"] },
            { code: "NC25", intitule: "J'arrive à identifier des modèles ou une structure pour résoudre un problème algébrique", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    }
];

// --- COMPÉTENCES DE 3ÈME ---
const COMPETENCES_3EME = [
    {
        chapitre: 1, chapitreNom: "Théorème de Thalès", items: [
            { code: "GT1", intitule: "Je sais calculer un coefficient d'agrandissement", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "GT2", intitule: "Je sais calculer une longueur avec Thalès", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "GT3", intitule: "Je sais rédiger une démonstration rigoureuse en citant les conditions d'application du théorème", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Raisonner", "Communiquer"] },
            { code: "GC1", intitule: "Je comprends le lien agrandissement / calcul de longueur", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "GC2", intitule: "Je sais traduire un problème réel ou du texte en une situation de Thalès", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Modéliser", "Représenter"] }
        ]
    },
    {
        chapitre: 2, chapitreNom: "Arithmétique", items: [
            { code: "NT1", intitule: "Je sais trouver tous les diviseurs d'un nombre entier", domaine: "Numération", type: "Technique", grandesCompetences: ["Chercher", "Calculer"] },
            { code: "NT2", intitule: "Je sais décomposer un nombre entier en produit de facteurs premiers", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer", "Représenter"] },
            { code: "NC1", intitule: "Je sais utiliser le PGCD / PPCM pour résoudre des problèmes de partages, de pavages, de synchronisation", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser", "Chercher"] },
            { code: "NC2", intitule: "Je comprends qu'une fraction irréductible est la représentation la plus simple d'un nombre rationnel", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner", "Représenter"] }
        ]
    },
    {
        chapitre: 3, chapitreNom: "Théorème de Pythagore", items: [
            { code: "GT4", intitule: "Je sais calculer la longueur d'un côté dans un triangle rectangle", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "GC3", intitule: "Je sais traduire un problème réel ou du texte en une situation de Pythagore", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Modéliser", "Représenter"] }
        ]
    },
    {
        chapitre: 4, chapitreNom: "Puissances 1 - Opérations sur les puissances", items: [
            { code: "NT3", intitule: "Je sais appliquer les règles de calcul pour simplifier des expressions avec des puissances", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NC3", intitule: "Je sais traduire un problème de la vie réelle (distances, tailles...) en un calcul avec des puissances", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser"] }
        ]
    },
    {
        chapitre: 5, chapitreNom: "Volumes 1 - Pavés, prismes, cylindres, cônes et pyramides", items: [
            { code: "MT1", intitule: "Je sais reconnaître les solides de l'espace et leurs propriétés (base, hauteur)", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "MT2", intitule: "Je sais calculer le volume de solides usuels (prismes, cylindres, pyramides, cylindres, cônes)", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "MC1", intitule: "Je sais effectuer des conversions d'unités de volume", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Représenter", "Calculer"] },
            { code: "MC2", intitule: "Je sais modéliser une situation réelle par un problème de volume", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Modéliser", "Chercher"] }
        ]
    },
    {
        chapitre: 6, chapitreNom: "Calcul littéral 1 - Rappels", items: [
            { code: "NT4", intitule: "Je sais transformer une expression littérale (développer, factoriser, réduire)", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NC4", intitule: "Je sais utiliser le calcul littéral pour démontrer ou valider une conjecture", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 7, chapitreNom: "Réciproque du théorème de Pythagore", items: [
            { code: "GT5", intitule: "Je sais démontrer qu'un triangle est ou n'est pas rectangle", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Raisonner", "Communiquer"] },
            { code: "GC3_bis", intitule: "Je sais traduire un problème réel ou du texte en une situation de Pythagore", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Modéliser", "Représenter"] }
        ]
    },
    {
        chapitre: 8, chapitreNom: "Puissances 2 - Notation scientifique", items: [
            { code: "NT5", intitule: "Je sais utiliser la notation scientifique pour écrire et calculer avec des nombres très grands ou très petits", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer", "Représenter"] },
            { code: "NC5", intitule: "Je comprends comment les puissances permettent de représenter et comparer des grandeurs à différentes échelles", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner", "Représenter"] }
        ]
    },
    {
        chapitre: 9, chapitreNom: "Trigonométrie 1 - Calcul d'un angle", items: [
            { code: "GT6", intitule: "Je sais calculer la mesure d'un angle avec la trigonométrie", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Calculer", "Raisonner"] },
            { code: "GC4", intitule: "Je sais traduire un problème réel ou du texte en une situation de Trigonométrie", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Modéliser", "Représenter"] }
        ]
    },
    {
        chapitre: 10, chapitreNom: "Fonctions 1 - Vocabulaire", items: [
            { code: "NT6", intitule: "Je sais déterminer une image ou un antécédent à partir d'une expression littérale, d'un tableau ou d'un graphique", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer", "Représenter"] },
            { code: "NT7", intitule: "Je sais construire la courbe représentative d'une fonction point par point", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "NC6", intitule: "Je sais modéliser une situation de dépendance entre deux grandeurs par une fonction", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser", "Raisonner"] },
            { code: "NC7", intitule: "Je sais interpréter le lien entre l'appartenance d'un point à une courbe et l'écriture f(x) = y", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner", "Représenter"] }
        ]
    },
    {
        chapitre: 11, chapitreNom: "Agrandissements et réductions", items: [
            { code: "MT3", intitule: "Je sais calculer une grandeur (aire ou volume) après un agrandissement ou une réduction", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "MT4", intitule: "Je sais retrouver le coefficient k (rapport) à partir de deux longueurs, de deux aires ou de deux volumes", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Calculer", "Raisonner"] },
            { code: "MC3", intitule: "Je comprends les relations entre les coefficients de longueur (k), d'aire (k²) et de volume (k³)", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "MC4", intitule: "Je sais modéliser une situation réelle de changement d'échelle (maquette, contenance)", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Modéliser"] }
        ]
    },
    {
        chapitre: 12, chapitreNom: "Additions et soustractions de fractions", items: [
            { code: "NT8", intitule: "Je sais additionner et soustraire des fractions", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NC8", intitule: "Je sais traduire un énoncé (partage successif, reste, proportion) par un enchaînement de calculs fractionnaires", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser", "Raisonner"] }
        ]
    },
    {
        chapitre: 13, chapitreNom: "Équations", items: [
            { code: "NT9", intitule: "Je sais tester une égalité pour vérifier une solution", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer", "Raisonner"] },
            { code: "NT10", intitule: "Je sais résoudre une équation du premier degré (trouver l'inconnue)", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NC9", intitule: "Je sais traduire un énoncé par une expression ou une équation", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser", "Représenter"] }
        ]
    },
    {
        chapitre: 14, chapitreNom: "Transformations 1 - Rotations", items: [
            { code: "GT7", intitule: "Je sais identifier et construire l'image d'une figure par une rotation", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GC5", intitule: "Je sais donner les éléments caractéristiques d'une rotation (centre, sens, angle)", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Représenter", "Communiquer"] }
        ]
    },
    {
        chapitre: 15, chapitreNom: "Calcul littéral 2 - Distributivité double", items: [
            { code: "NT11", intitule: "Je sais développer une expression littérale avec la double distributivité", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NC4_bis", intitule: "Je sais utiliser le calcul littéral pour démontrer ou valider une conjecture", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 16, chapitreNom: "Trigonométrie 2 - Calcul d'une longueur", items: [
            { code: "GT8", intitule: "Je sais calculer la longueur d'un côté avec la trigonométrie", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Calculer", "Raisonner"] },
            { code: "GC4_bis", intitule: "Je sais traduire un problème réel ou du texte en une situation de Trigonométrie", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Modéliser", "Représenter"] }
        ]
    },
    {
        chapitre: 17, chapitreNom: "Statistiques", items: [
            { code: "NT12", intitule: "Je sais calculer les indicateurs statistiques d'une série (moyenne, médiane, étendue)", domaine: "Gestion de données", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NT13", intitule: "Je sais lire des données présentées sous différentes formes (tableaux, graphiques)", domaine: "Gestion de données", type: "Technique", grandesCompetences: ["Raisonner", "Communiquer"] },
            { code: "NC10", intitule: "Je sais analyser et comparer des séries statistiques (notamment avec les indicateurs statistiques)", domaine: "Gestion de données", type: "Conceptuel", grandesCompetences: ["Raisonner"] },
            { code: "NC11", intitule: "Je sais organiser et traiter des données pour répondre à une question", domaine: "Gestion de données", type: "Conceptuel", grandesCompetences: ["Modéliser", "Chercher"] }
        ]
    },
    {
        chapitre: 18, chapitreNom: "Multiplications et divisions par une fraction", items: [
            { code: "NT14", intitule: "Je sais multiplier et diviser des fractions", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NC8_bis", intitule: "Je sais traduire un énoncé (partage successif, reste, proportion) par un enchaînement de calculs fractionnaires", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser", "Raisonner"] }
        ]
    },
    {
        chapitre: 19, chapitreNom: "Repérage dans l'espace", items: [
            { code: "GT9", intitule: "Je sais lire et placer les coordonnées d'un point dans un pavé droit (abscisse, ordonnée, altitude)", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GT10", intitule: "Je sais utiliser les coordonnées géographiques (latitude, longitude) pour repérer un point sur Terre", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GC6", intitule: "Je sais faire le lien entre le repérage mathématique sur une sphère et la géographie terrestre (équateur, méridiens, parallèles)", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Modéliser", "Communiquer"] }
        ]
    },
    {
        chapitre: 20, chapitreNom: "Fonctions 2 - Fonctions linéaires et affines", items: [
            { code: "NT15", intitule: "Je sais tracer la droite représentative d'une fonction affine ou linéaire à partir de son expression", domaine: "Numération", type: "Technique", grandesCompetences: ["Représenter", "Calculer"] },
            { code: "NC12", intitule: "Je sais modéliser une situation concrète (pourcentage, vitesse, abonnement) par une fonction linéaire ou affine", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser", "Représenter"] },
            { code: "NC13", intitule: "Je sais faire le lien entre la proportionnalité et les fonctions linéaires", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner", "Représenter"] },
            { code: "NC14", intitule: "Je comprends l'influence des coefficients a (pente) et b (ordonnée à l'origine) sur l'allure de la droite", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner", "Communiquer", "Représenter"] }
        ]
    },
    {
        chapitre: 21, chapitreNom: "Réciproque du théorème de Thalès", items: [
            { code: "GT11", intitule: "Je sais montrer que deux droites sont parallèles (ou non) avec la réciproque du théorème de Thalès", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Calculer", "Raisonner"] },
            { code: "GC7", intitule: "Je comprends le lien entre droites parallèles et proportionnalité des longueurs / quotients égaux", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 22, chapitreNom: "Ratios", items: [
            { code: "NT16", intitule: "Je sais partager une quantité donnée selon un ratio ou trouver un ratio", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NC15", intitule: "Je sais utiliser la notion de ratio pour modéliser et résoudre des problèmes concrets", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Modéliser", "Raisonner"] }
        ]
    },
    {
        chapitre: 23, chapitreNom: "Transformations 2 - Homothéties", items: [
            { code: "GT12", intitule: "Je sais identifier et construire l'image d'une figure par une homothétie", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GC8", intitule: "Je sais donner les éléments caractéristiques (centre, rapport) d'une homothétie", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Représenter", "Communiquer"] }
        ]
    },
    {
        chapitre: 24, chapitreNom: "Probabilités", items: [
            { code: "NT17", intitule: "Je sais exprimer la probabilité d'un événement lors d'une expérience aléatoire simple", domaine: "Gestion de données", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NT18", intitule: "Je sais utiliser un arbre de probabilités ou un tableau à double entrée pour recenser les issues", domaine: "Gestion de données", type: "Technique", grandesCompetences: ["Représenter", "Chercher"] },
            { code: "NC16", intitule: "Je sais modéliser une situation de hasard par une expérience aléatoire pour prendre une décision", domaine: "Gestion de données", type: "Conceptuel", grandesCompetences: ["Modéliser", "Raisonner"] }
        ]
    },
    {
        chapitre: 25, chapitreNom: "Volumes 2 - Boules", items: [
            { code: "MT5", intitule: "Je sais calculer le volume de solides usuels (boules)", domaine: "Grandeurs et Mesures", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "MC1_bis", intitule: "Je sais effectuer des conversions d'unités de volume", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Représenter", "Calculer"] },
            { code: "MC2_bis", intitule: "Je sais modéliser une situation réelle par un problème de volume", domaine: "Grandeurs et Mesures", type: "Conceptuel", grandesCompetences: ["Modéliser", "Chercher"] }
        ]
    },
    {
        chapitre: 26, chapitreNom: "Équations 2 - Équations produit", items: [
            { code: "NT19", intitule: "Je sais résoudre une équation produit", domaine: "Numération", type: "Technique", grandesCompetences: ["Calculer"] },
            { code: "NC17", intitule: "Je comprends le lien entre équations produits et équations classiques", domaine: "Numération", type: "Conceptuel", grandesCompetences: ["Raisonner"] }
        ]
    },
    {
        chapitre: 27, chapitreNom: "Transformations 3 - Translations", items: [
            { code: "GT13", intitule: "Je sais identifier et construire l'image d'une figure par une translation", domaine: "Géométrie", type: "Technique", grandesCompetences: ["Représenter"] },
            { code: "GC9", intitule: "Je sais donner les éléments caractéristiques d'une translation", domaine: "Géométrie", type: "Conceptuel", grandesCompetences: ["Représenter", "Communiquer"] }
        ]
    }
];

export default function TempSeeder() {
    const [status, setStatus] = useState("En attente...");
    const [loading, setLoading] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState("3ème");

    const handleSeed = async () => {
        setLoading(true);
        setStatus(`Initialisation et peuplement des chapitres et compétences pour la ${selectedLevel}...`);

        try {
            const batch = writeBatch(db);
            const dataToSeed = selectedLevel === "6ème" ? COMPETENCES_6EME : COMPETENCES_3EME;

            // 1. Récupération de la configuration existante pour ne rien écraser des autres niveaux
            const configDocRef = doc(db, "config", "skills");
            const configSnap = await getDoc(configDocRef);
            let existingVisibleChapters = {};
            let existingChapitresDetails = {};

            if (configSnap.exists()) {
                const data = configSnap.data();
                existingVisibleChapters = data.visibleChapters || {};
                existingChapitresDetails = data.chapitresDetails || {};
            }

            const visibleChaptersDefault = [];

            dataToSeed.forEach(chap => {
                visibleChaptersDefault.push(chap.chapitre);

                // NOUVEAUTÉ : On associe le niveau à la clé (ex: "3ème_1") pour éviter l'écrasement
                const chapKey = `${selectedLevel}_${chap.chapitre}`;

                existingChapitresDetails[chapKey] = {
                    id: chap.chapitre,
                    titre: chap.chapitreNom,
                    trimestre: existingChapitresDetails[chapKey]?.trimestre || "1"
                };

                // 2. Enregistrement des compétences reliées
                chap.items.forEach(comp => {
                    const prefix = selectedLevel.replace('ème', 'EME').toUpperCase();
                    const systemId = `${prefix}-${comp.code}`;
                    const docRef = doc(collection(db, "competences"), systemId);

                    batch.set(docRef, {
                        id: systemId,
                        code: comp.code,
                        niveau: selectedLevel,
                        chapitre: Number(chap.chapitre),
                        chapitreNom: chap.chapitreNom,
                        domaine: comp.domaine,
                        type: comp.type,
                        grandesCompetences: comp.grandesCompetences,
                        intitule: comp.intitule,
                        validiteMois: 3,
                        explication: "",
                        lienExercice: "",
                        exercices: []
                    });
                });
            });

            // 3. Sauvegarde de la structure des chapitres dans Firestore
            existingVisibleChapters[selectedLevel] = visibleChaptersDefault;

            batch.set(configDocRef, {
                visibleChapters: existingVisibleChapters,
                chapitresDetails: existingChapitresDetails
            }, { merge: true });

            await batch.commit();
            setStatus(`✅ Importation réussie : Chapitres et compétences de ${selectedLevel} synchronisés !`);
        } catch (error) {
            console.error(error);
            setStatus("❌ Erreur : " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-slate-50 border-2 border-indigo-200 rounded-2xl max-w-md mx-auto mt-10 shadow-lg text-center">
            <h2 className="text-xl font-black text-indigo-800 mb-4">Mise à jour Base & Chapitres</h2>
            <p className="text-sm text-slate-600 mb-6">
                Cet outil va injecter les chapitres, lier les compétences correspondantes, et configurer les trimestres selon le niveau sélectionné.
            </p>

            <select
                value={selectedLevel}
                onChange={e => setSelectedLevel(e.target.value)}
                className="w-full p-3 mb-6 border-2 border-indigo-200 rounded-xl font-bold text-indigo-900 outline-none bg-white"
            >
                <option value="6ème">6ème</option>
                <option value="3ème">3ème</option>
            </select>

            <button
                onClick={handleSeed}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md"
            >
                {loading ? "Importation..." : `Lancer la synchronisation (${selectedLevel})`}
            </button>
            <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 text-sm font-mono text-slate-700">
                {status}
            </div>
        </div>
    );
}