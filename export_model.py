"""
Trains the RandomForest exactly as in app.py and exports the whole forest
(plus label encoders, examples, accuracy) to static/model.json so the
classifier can run fully client-side on GitHub Pages.
"""
import os
import json

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

HERE = os.path.dirname(__file__)

df = pd.read_csv(os.path.join(HERE, 'Stars.csv'))

le_color = LabelEncoder()
le_spec = LabelEncoder()
df['Color_Encoded'] = le_color.fit_transform(df['Star color'].astype(str))
df['Spec_Encoded'] = le_spec.fit_transform(df['Spectral Class'].astype(str))

FEATURES = ['Temperature (K)', 'Luminosity(L/Lo)', 'Radius(R/Ro)',
            'Absolute magnitude(Mv)', 'Color_Encoded', 'Spec_Encoded']
X = df[FEATURES]
y = df['Star type']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42)

model = RandomForestClassifier(
    n_estimators=100, max_depth=5, min_samples_leaf=2, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

accuracy = round(accuracy_score(y_test, model.predict(X_test)) * 100, 1)

# Serialize every tree. For leaves we store the normalized class probabilities
# (model.classes_ order). Internal nodes store feature index + threshold.
n_classes = len(model.classes_)


def export_tree(estimator):
    t = estimator.tree_
    nodes = []
    for i in range(t.node_count):
        left = int(t.children_left[i])
        right = int(t.children_right[i])
        if left == -1:  # leaf
            counts = t.value[i][0]
            total = counts.sum()
            probs = (counts / total).tolist() if total > 0 else [0.0] * n_classes
            nodes.append({'leaf': True, 'probs': probs})
        else:
            nodes.append({
                'leaf': False,
                'f': int(t.feature[i]),
                'th': float(t.threshold[i]),
                'l': left,
                'r': right,
            })
    return nodes


forest = [export_tree(est) for est in model.estimators_]

# Example rows for each star type (matches app.py)
examples = {}
for ttype in range(6):
    row = df[df['Star type'] == ttype].iloc[0]
    examples[str(ttype)] = {
        'temperature': float(row['Temperature (K)']),
        'luminosity': float(row['Luminosity(L/Lo)']),
        'radius': float(row['Radius(R/Ro)']),
        'abs_magnitude': float(row['Absolute magnitude(Mv)']),
        'color': str(row['Star color']),
        'spectral_class': str(row['Spectral Class']),
    }

colors = sorted(df['Star color'].astype(str).unique().tolist())
specs = sorted(df['Spectral Class'].astype(str).unique().tolist())

payload = {
    'classes': model.classes_.tolist(),
    'features': FEATURES,
    'color_classes': le_color.classes_.tolist(),
    'spec_classes': le_spec.classes_.tolist(),
    'forest': forest,
    'colors': colors,
    'specs': specs,
    'examples': examples,
    'accuracy': accuracy,
}

out_path = os.path.join(HERE, 'static', 'model.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))

size_kb = os.path.getsize(out_path) / 1024
print(f"[OK] accuracy={accuracy}% trees={len(forest)} -> {out_path} ({size_kb:.0f} KB)")
