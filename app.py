import os
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'
os.environ['NUMEXPR_NUM_THREADS'] = '1'
os.environ['VECLIB_MAXIMUM_THREADS'] = '1'

from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import os
import time

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.after_request
def no_cache(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    return response

STAR_INFO = {
    0: {
        'en': 'Brown Dwarf',
        'ru': 'Коричневый карлик',
        'color': '#CD853F',
        'glow': 'rgba(205, 133, 63, 0.4)',
        'description': 'Субзвёздный объект, масса которого недостаточна для устойчивого термоядерного синтеза водорода. Занимает промежуточное положение между планетами-гигантами и звёздами.',
        'facts': ['Масса: 13–80 масс Юпитера', 'Темп.: 300–2500 K', 'Светимость очень низкая']
    },
    1: {
        'en': 'Red Dwarf',
        'ru': 'Красный карлик',
        'color': '#FF6B35',
        'glow': 'rgba(255, 107, 53, 0.4)',
        'description': 'Самый распространённый тип звёзд во Вселенной. Маломассивные и холодные звёзды главной последовательности спектрального класса M.',
        'facts': ['Масса: 0.08–0.6 M☉', 'Темп.: 2500–4000 K', 'Живут до триллиона лет']
    },
    2: {
        'en': 'White Dwarf',
        'ru': 'Белый карлик',
        'color': '#A8D8FF',
        'glow': 'rgba(168, 216, 255, 0.4)',
        'description': 'Конечная стадия эволюции звёзд с малой и средней массой. Чрезвычайно плотный объект размером с Землю, лишённый источников термоядерной энергии.',
        'facts': ['Радиус ≈ радиус Земли', 'Масса до 1.4 M☉', 'Плотность ~10⁶ г/см³']
    },
    3: {
        'en': 'Main Sequence',
        'ru': 'Звезда главной последовательности',
        'color': '#FFD700',
        'glow': 'rgba(255, 215, 0, 0.4)',
        'description': 'Звёзды, находящиеся на стадии горения водорода в ядре. Наше Солнце — типичный представитель этого класса. Занимают диагональ диаграммы Герцшпрунга–Рассела.',
        'facts': ['Класс G: ~5778 K (Солнце)', 'Живут 1–10 млрд лет', 'Синтез He из H в ядре']
    },
    4: {
        'en': 'Supergiant',
        'ru': 'Сверхгигант',
        'color': '#FF69B4',
        'glow': 'rgba(255, 105, 180, 0.4)',
        'description': 'Одни из самых крупных и ярких звёзд во Вселенной. Являются эволюционной стадией массивных звёзд после исчерпания водорода в ядре.',
        'facts': ['Радиус: 30–500 R☉', 'Светимость: 10⁴–10⁶ L☉', 'Живут всего 10–50 млн лет']
    },
    5: {
        'en': 'Hypergiant',
        'ru': 'Гипергигант',
        'color': '#FF3333',
        'glow': 'rgba(255, 51, 51, 0.4)',
        'description': 'Крайне редкие и самые массивные из известных звёзд. Обладают колоссальной светимостью и быстро теряют массу через мощные звёздные ветры.',
        'facts': ['Радиус: >500 R☉', 'Масса: 100–300 M☉', 'Светимость: 10⁶ L☉ и выше']
    }
}

def train_model():
    csv_path = os.path.join(os.path.dirname(__file__), 'Stars.csv')
    df = pd.read_csv(csv_path)

    le_color = LabelEncoder()
    le_spec = LabelEncoder()

    df['Color_Encoded'] = le_color.fit_transform(df['Star color'].astype(str))
    df['Spec_Encoded'] = le_spec.fit_transform(df['Spectral Class'].astype(str))

    X = df[['Temperature (K)', 'Luminosity(L/Lo)', 'Radius(R/Ro)',
            'Absolute magnitude(Mv)', 'Color_Encoded', 'Spec_Encoded']]
    y = df['Star type']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

    model = RandomForestClassifier(
        n_estimators=100, max_depth=5, min_samples_leaf=2, random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train)

    accuracy = accuracy_score(y_test, model.predict(X_test))

    # Build example rows for each star type
    examples = {}
    for t in range(6):
        row = df[df['Star type'] == t].iloc[0]
        examples[t] = {
            'temperature': float(row['Temperature (K)']),
            'luminosity': float(row['Luminosity(L/Lo)']),
            'radius': float(row['Radius(R/Ro)']),
            'abs_magnitude': float(row['Absolute magnitude(Mv)']),
            'color': str(row['Star color']),
            'spectral_class': str(row['Spectral Class'])
        }

    colors = sorted(df['Star color'].astype(str).unique().tolist())
    specs = sorted(df['Spectral Class'].astype(str).unique().tolist())

    return model, le_color, le_spec, colors, specs, examples, round(accuracy * 100, 1)


model, le_color, le_spec, COLORS, SPECS, EXAMPLES, MODEL_ACCURACY = train_model()
print(f"[OK] Model trained. Test accuracy: {MODEL_ACCURACY}%")


@app.route('/')
def index():
    return render_template(
        'index.html',
        colors=COLORS,
        specs=SPECS,
        examples=EXAMPLES,
        accuracy=MODEL_ACCURACY,
        v=int(time.time())
    )


@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    try:
        temp = float(data['temperature'])
        lum = float(data['luminosity'])
        rad = float(data['radius'])
        abs_mag = float(data['abs_magnitude'])
        color = str(data['color'])
        spec = str(data['spectral_class'])

        c_code = le_color.transform([color])[0]
        s_code = le_spec.transform([spec])[0]

        input_df = pd.DataFrame(
            [[temp, lum, rad, abs_mag, c_code, s_code]],
            columns=['Temperature (K)', 'Luminosity(L/Lo)', 'Radius(R/Ro)',
                     'Absolute magnitude(Mv)', 'Color_Encoded', 'Spec_Encoded']
        )

        result = int(model.predict(input_df)[0])
        probs = model.predict_proba(input_df)[0]
        confidence = float(probs[result]) * 100
        all_probs = [float(p) * 100 for p in probs]

        return jsonify({
            'success': True,
            'type': result,
            'confidence': round(confidence, 2),
            'all_probs': [round(p, 2) for p in all_probs],
            'star_info': STAR_INFO[result]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


if __name__ == '__main__':
    app.run(debug=True, port=5000)
