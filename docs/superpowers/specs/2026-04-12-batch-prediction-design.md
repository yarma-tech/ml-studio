# Batch Prediction Feature — Design Spec

## Context

ML Studio est une plateforme no-code pour étudiants. Actuellement, après entraînement, l'étudiant peut visualiser les métriques et exporter le modèle `.joblib`, mais ne peut pas l'utiliser directement pour prédire de nouvelles données. Le batch prediction comble ce manque en permettant d'uploader un CSV et d'obtenir les prédictions sans quitter l'interface.

## Approche retenue

Endpoint dédié rattaché au training existant (`_results` en mémoire). Le preprocessing (scaler, encoding) est réappliqué automatiquement aux nouvelles données en réutilisant les transformers stockés lors de l'entraînement.

## Backend

### Endpoint prédiction : `POST /api/training/{training_id}/predict`

**Input** : `multipart/form-data` avec fichier CSV + query param `model_name` (optionnel, défaut = meilleur modèle)

**Logique** :
1. Valider que `training_id` existe dans `_results`
2. Lire le CSV uploadé avec pandas
3. Vérifier que les colonnes features attendues sont présentes
4. Appliquer le preprocessing aux nouvelles données :
   - Missing values : même stratégie (mean/median/mode/drop)
   - Encoding : même méthode (one-hot/label) — utiliser `pd.get_dummies` + `reindex(columns=feature_names, fill_value=0)` pour aligner les colonnes
   - Scaling : utiliser le `scaler` stocké dans `_results` via `.transform()` (pas `.fit_transform()`)
5. Prédire avec le modèle sélectionné
6. Si `target_encoder` existe, inverse-transformer les prédictions
7. Retourner les résultats

**Output** :
```json
{
  "model_name": "random_forest",
  "prediction_column": "target_name",
  "total_rows": 100,
  "columns": ["feature1", "feature2", "prediction"],
  "rows": [
    {"feature1": 1.2, "feature2": "A", "prediction": "class_1"},
    ...
  ]
}
```

### Endpoint téléchargement : `GET /api/training/{training_id}/predict/download`

**Input** : query params `model_name` (optionnel), réutilise les dernières prédictions stockées temporairement dans `_results[training_id]["last_predictions"]`

**Output** : `StreamingResponse` avec CSV (media_type `text/csv`, Content-Disposition attachment)

### Fichiers modifiés
- `backend/api/training.py` — 2 nouveaux endpoints + fonction `_preprocess_new_data()`
- Aucun nouveau fichier backend nécessaire

### Gestion d'erreurs
- `404` si training_id introuvable
- `400` si colonnes manquantes dans le CSV (liste les colonnes attendues vs fournies)
- `400` si le fichier n'est pas un CSV valide

## Frontend

### Nouveau composant : `BatchPredict.tsx`

**Emplacement** : `frontend/components/results/BatchPredict.tsx`

**Props** : `{ trainingId: string, models: ModelResult[], taskType: string }`

**UI** :
- Card "Prédiction par lot"
- Dropdown sélection modèle (défaut = meilleur, badge "meilleur" sur le modèle best)
- Zone d'upload simplifiée (drag-drop ou clic, accepte `.csv` uniquement)
- État loading pendant la prédiction
- Tableau des résultats avec colonne prédiction mise en évidence (fond coloré)
- Bouton "Télécharger CSV" sous le tableau
- Message d'erreur si colonnes incompatibles

### API client

**Fichier** : `frontend/lib/api.ts`

```typescript
// Nouvelles fonctions
export async function predictBatch(trainingId: string, file: File, modelName?: string): Promise<BatchPredictionResult>
export function getPredictionDownloadUrl(trainingId: string, modelName?: string): string
```

### Types

**Fichier** : `frontend/lib/types.ts`

```typescript
export interface BatchPredictionResult {
  model_name: string;
  prediction_column: string;
  total_rows: number;
  columns: string[];
  rows: Record<string, unknown>[];
}
```

### Intégration dans le studio

**Fichier** : `frontend/app/studio/page.tsx`

Ajouter `<BatchPredict>` dans l'étape Résultats (step 5), après `ModelExport`, pour les deux types de tâches (classification et regression).

## Vérification

1. **Backend** : Lancer le serveur, entraîner un modèle, puis `curl -F "file=@test.csv" localhost:8000/api/training/{id}/predict` et vérifier les prédictions
2. **Frontend** : Vérifier que le composant s'affiche dans l'étape Résultats, uploader un CSV, voir le tableau, télécharger le CSV résultat
3. **Erreurs** : Uploader un CSV avec des colonnes manquantes → message d'erreur clair
4. **Tests** : Ajouter un test dans `backend/tests/test_training.py` pour l'endpoint predict
