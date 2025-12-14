const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Remplace par ta CLÉ SECRÈTE Stripe (commence par sk_test_... ou sk_live_...)
// Tu la trouves dans Stripe Dashboard > Développeurs > Clés API
const stripe = require("stripe")("mk_1ScYU12fFZYNy28liKrEn9m7");

admin.initializeApp();

// Cette clé sert à vérifier que c'est bien Stripe qui appelle (Sécurité)
// On la récupérera à l'étape suivante. Pour l'instant, mets une chaine vide ou configure-la via variable d'env.
const endpointSecret = "whsec_V5SeoU8AOTmh7F2I5D98ClzMut9wLxDl";

exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
        // 1. Vérification de la signature (Sécurité critique)
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error("Erreur signature Webhook :", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. On écoute l'événement "Paiement réussi"
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        // L'ID de l'élève qu'on a passé dans l'URL à l'étape 1
        const userId = session.client_reference_id;

        if (userId) {
            console.log(`💰 Paiement reçu pour l'élève : ${userId}`);

            try {
                // 3. Activation du Premium dans Firestore
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