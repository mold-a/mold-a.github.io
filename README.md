# Star Classifier ✦

Классификатор звёздных объектов на основе модели машинного обучения (Random Forest, 100 деревьев, 6 классов).

🔗 **Демо:** https://mold-a.github.io/

## Как это устроено

Изначально это Flask-приложение, где модель обучалась и предсказывала на сервере.
Чтобы развернуть проект на **GitHub Pages** (только статика, без бэкенда), модель
переносится в браузер:

1. `export_model.py` обучает `RandomForestClassifier` точно так же, как `app.py`,
   и сериализует весь лес (все деревья, пороги, листовые вероятности),
   label-энкодеры, примеры и точность в `static/model.json`.
2. `static/app.js` загружает `model.json` и выполняет предсказание целиком
   на стороне клиента: обход каждого дерева + усреднение вероятностей —
   эквивалент `RandomForestClassifier.predict_proba`.

Клиентское предсказание совпадает с предсказанием sklearn на всех 240 строках
датасета (проверено).

## Файлы

| Файл | Назначение |
|------|------------|
| `index.html` | Статическая страница (входная точка GitHub Pages) |
| `static/app.js` | Загрузка модели + классификация в браузере |
| `static/style.css` | Стили |
| `static/model.json` | Экспортированный Random Forest |
| `app.py` | Исходное Flask-приложение (для локального запуска) |
| `export_model.py` | Обучение и экспорт модели в JSON |
| `Stars.csv` | Датасет |

## Локальный запуск (Flask-версия)

```bash
pip install -r requirements.txt
python app.py        # http://localhost:5000
```

## Пересборка модели

```bash
python export_model.py   # обновляет static/model.json
```

---

Молдованов А.С. · ИДБ-24-12 · Модели и методы · 2025
Датасет: [Kaggle — Star dataset](https://www.kaggle.com/datasets/deepu1109/star-dataset)
