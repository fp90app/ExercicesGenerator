const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Note : On a enlevé les lignes "const stripe = ..." ici pour éviter le crash au démarrage

exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
    // 1. Chargement des clés depuis le fichier .env
    const stripeKey = process.env.STRIPE_SECRET;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Sécurité : Si les clés manquent, on arrête tout pour éviter le crash moche
    if (!stripeKey || !endpointSecret) {
        console.error("ERREUR FATALE : Clés Stripe manquantes dans le fichier .env");
        return res.status(500).send("Configuration serveur manquante.");
    }

    const stripe = require("stripe")(stripeKey);
    // ----------------------

    const sig = req.headers["stripe-signature"];

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error("Erreur signature Webhook :", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ... Le reste de votre code ne change pas ...
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.client_reference_id;

        if (userId) {
            console.log(`💰 Paiement reçu pour l'élève : ${userId}`);
            try {
                await admin.firestore().collection("eleves").doc(userId).update({
                    status: "premium",
                    premiumSince: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log("✅ Compte activé avec succès !");
            } catch (error) {
                console.error("❌ Erreur lors de l'activation Firestore :", error);
            }
        } else {
            console.warn("⚠️ Pas de client_reference_id trouvé dans la session Stripe.");
        }
    }

    res.json({ received: true });
});

// Fonction appelée par le site pour créer le lien de paiement
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
    // 1. Sécurité : On vérifie que l'utilisateur est connecté
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Vous devez être connecté pour vous abonner.');
    }

    const stripe = require("stripe")(functions.config().stripe.secret);

    // 3. Configuration du produit (REMPLACER L'ID DU PRIX ICI)
    const PRICE_ID = "price_1ScYc92fFZYNy28lDTGkry9J";

    // 4. Création de la session Stripe
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment", // ou "subscription" si c'est récurrent
            line_items: [
                {
                    price: PRICE_ID,
                    quantity: 1,
                },
            ],
            // Important : on attache l'ID de l'élève à la transaction pour le retrouver après
            client_reference_id: context.auth.uid,

            // Où rediriger l'élève après le paiement ?
            success_url: `https://signoret.pages.dev/?payment=success`,
            cancel_url: `https://signoret.pages.dev/?payment=cancel`,
        });

        return { url: session.url };
    } catch (error) {
        console.error("Erreur Stripe:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});