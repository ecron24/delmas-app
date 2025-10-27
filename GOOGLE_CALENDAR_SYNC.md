# Synchronisation Google Calendar → App

## 🎯 Objectif

Importer automatiquement les événements créés dans Google Calendar "Piscine Delmas" vers l'application Next.js.

## 📊 Architecture

```
Google Calendar
    ↓ (événement créé)
  n8n Workflow
    ↓ (webhook HTTP)
  App Next.js → /api/calendar/import-event
    ↓
  Base de données Supabase
```

## 🔧 Configuration n8n

### Étape 1 : Créer le workflow n8n

1. **Trigger : Google Calendar**
   - Nœud : `Google Calendar Trigger`
   - Event : `Event Created`
   - Calendar : `Piscine Delmas`
   - Poll Time : `Every minute` ou selon vos besoins

2. **Action : HTTP Request**
   - Nœud : `HTTP Request`
   - Method : `POST`
   - URL : `https://votre-app.com/api/calendar/import-event`
   - Headers :
     ```json
     {
       "Content-Type": "application/json"
     }
     ```
   - Body : `{{ $json }}` (passer toutes les données de l'événement)

### Étape 2 : Format des données

L'endpoint `/api/calendar/import-event` attend les données au format standard Google Calendar.

#### Format recommandé dans Google Calendar :

**Description de l'événement** :
```
#NomClient #NuméroTéléphone #Intervention
Description détaillée de l'intervention
```

**Exemple** :
```
#Delmou #0663589521 #Intervention
intervention moteur de chauffe piscine intérieure
```

#### Données envoyées par n8n :

```json
{
  "id": "216he2kmhsn7ln5lkhmgnr0hn1",
  "summary": "Delmou intervention piscine",
  "description": "#Delmou #0663589521 #Intervention\nintervention moteur de chauffe piscine intérieure",
  "start": {
    "dateTime": "2025-10-27T15:00:00+01:00",
    "timeZone": "Europe/Paris"
  },
  "end": {
    "dateTime": "2025-10-27T16:00:00+01:00",
    "timeZone": "Europe/Paris"
  },
  "location": "10 Rue du Dr Albert Schweitzer, 13200 Arles, France"
}
```

## 🤖 Logique de l'application

### 1. Vérification de doublon
- L'app vérifie si `gcal_event_id` existe déjà
- Si oui → retourne l'intervention existante (évite les doublons)

### 2. Recherche ou création du client

#### Parsing des données client
L'app extrait les informations depuis `description` avec les hashtags :

**Format :**
```
#NomClient #TéléphoneClient #Intervention
Description détaillée
```

**Parsing :**
- Nom client : Premier hashtag qui n'est pas un numéro
- Téléphone : Hashtag de 10 chiffres
- Description : Texte après la première ligne

**Exemple :**
```
#Delmou #0663589521 #Intervention
intervention moteur de chauffe piscine intérieure
```
→ Nom: `Delmou`, Téléphone: `0663589521`, Description: `intervention moteur de chauffe piscine intérieure`

#### Recherche en BDD
- Recherche par `last_name` (case insensitive, recherche partielle)
- Si trouvé → utilise le client existant
- Si non trouvé → crée un nouveau client

#### Création de nouveau client
```typescript
{
  type: 'particulier',
  first_name: '',
  last_name: 'Delmou',
  mobile: '0663589521',
  address: '10 Rue du Dr Albert Schweitzer',
  postal_code: '13200',
  city: 'Arles',
  notes: 'Créé depuis Google Calendar le 27/10/2025'
}
```

### 3. Création de l'intervention

```typescript
{
  reference: 'INT-202410-123',
  client_id: '...',
  scheduled_date: '2024-10-28T10:00:00+02:00',
  status: 'scheduled',
  description: 'Entretien piscine',
  gcal_event_id: 'abc123xyz',
  created_from: 'gcal',
  synced_to_gcal: true
}
```

## 🔐 Sécurité (optionnel)

Pour sécuriser le webhook, vous pouvez ajouter un token d'authentification :

### Dans `.env.local`
```env
CALENDAR_WEBHOOK_SECRET=votre_token_secret_ici
```

### Dans n8n
Ajouter un header :
```json
{
  "Authorization": "Bearer votre_token_secret_ici"
}
```

### Dans le code (à implémenter si besoin)
```typescript
const authHeader = request.headers.get('authorization');
const expectedToken = process.env.CALENDAR_WEBHOOK_SECRET;

if (authHeader !== `Bearer ${expectedToken}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## 📝 Logs et Debugging

L'endpoint log toutes les actions :
```
📥 Événement Google Calendar reçu: { ... }
✅ Client existant trouvé: Dupont
✅ Intervention créée: INT-202410-123
```

Vérifiez les logs Docker/Vercel pour voir le traitement en temps réel.

## 🧪 Test manuel

Pour tester l'endpoint sans n8n :

```bash
curl -X POST https://votre-app.com/api/calendar/import-event \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test123",
    "summary": "Test intervention piscine",
    "description": "#TestClient #0612345678 #Intervention\nNettoyage complet de la piscine",
    "start": {
      "dateTime": "2025-10-28T10:00:00+02:00",
      "timeZone": "Europe/Paris"
    },
    "end": {
      "dateTime": "2025-10-28T12:00:00+02:00",
      "timeZone": "Europe/Paris"
    },
    "location": "15 rue Test, 75001 Paris"
  }'
```

## ✅ Résultat attendu

Après configuration, chaque nouvel événement dans Google Calendar "Piscine Delmas" :
1. ✅ Crée automatiquement le client (s'il n'existe pas)
2. ✅ Crée l'intervention avec le bon client
3. ✅ Apparaît dans le calendrier de l'app
4. ✅ Est marqué comme venant de Google Calendar (badge violet 🔗)

## 🔄 Flux bidirectionnel

### App → Google Calendar ✅
Déjà configuré via `/api/interventions/[id]/notify-completion`
- Variable : `N8N_WEBHOOK_VALIDATE_INTERVENTION`

### Google Calendar → App ✅
Nouveau endpoint : `/api/calendar/import-event`
- Configuré dans ce document

## 📞 Support

En cas de problème :
1. Vérifier les logs n8n
2. Vérifier les logs de l'app
3. Tester l'endpoint avec curl
4. Vérifier que le format des données correspond
