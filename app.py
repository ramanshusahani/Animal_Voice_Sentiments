from flask import Flask, render_template, jsonify, request
import pandas as pd
import os

app = Flask(__name__)

# Load the CSV data when the application starts
def load_data():
    try:
        csv_path = os.path.join(os.path.dirname(__file__), 'animal_sounds.csv')
        df = pd.read_csv(csv_path)

        # Normalize column names expected by the app/frontend
        column_mapping = {
            'Animal': 'animal',
            'Class': 'class',
            'Scientific Name': 'scientific_name',
            'Sound / Vocalization': 'sound',
            'Emotion Label': 'emotion_label',
            'Context / Trigger': 'context_trigger'
        }
        df = df.rename(columns=column_mapping)

        # Clean whitespace and standardize strings
        for col in ['animal', 'class', 'scientific_name', 'sound', 'emotion_label', 'context_trigger']:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip()

        # Drop completely empty rows (if any)
        df = df.dropna(how='all')

        return df
    except FileNotFoundError:
        print("Error: animal_sounds.csv file not found!")
        return pd.DataFrame()
    except Exception as e:
        print(f"Error loading data: {e}")
        return pd.DataFrame()

# Initialize the DataFrame
animal_data = load_data()

@app.route('/')
def home():
    """Main route that displays the home page with selectable classes and animals"""
    if animal_data.empty:
        classes = []
        unique_animals = []
    else:
        classes = sorted(animal_data['class'].dropna().unique().tolist())
        unique_animals = sorted(animal_data['animal'].dropna().unique().tolist())

    # 'animals' kept for legacy template usage; 'classes' used by current template
    return render_template('index.html', animals=unique_animals, classes=classes)

@app.route('/get_sounds/<animal_name>')
def get_sounds_legacy(animal_name):
    """Legacy route to fetch sounds for a selected animal by name only"""
    if animal_data.empty:
        return jsonify({'sounds': []})

    animal_sounds = animal_data[animal_data['animal'] == animal_name]['sound'].dropna().unique().tolist()
    return jsonify({'sounds': sorted(animal_sounds)})

@app.route('/get_sounds', methods=['POST'])
def get_sounds():
    """Return sounds for a selected animal given class and names"""
    if animal_data.empty:
        return jsonify({'sounds': []})

    data = request.get_json(silent=True) or {}
    english_name = data.get('english_name')
    scientific_name = data.get('scientific_name')
    animal_class = data.get('class')

    df = animal_data
    if animal_class:
        df = df[df['class'] == animal_class]
    if english_name:
        df = df[df['animal'] == english_name]
    if scientific_name:
        df = df[df['scientific_name'] == scientific_name]

    sounds = df['sound'].dropna().unique().tolist() if not df.empty else []
    return jsonify({'sounds': sorted(sounds)})

@app.route('/get_call_for', methods=['POST'])
def get_call_for():
    """Legacy-compatible route to get context for a specific animal sound"""
    if animal_data.empty:
        return jsonify({'call_for': 'No data available'})

    data = request.get_json(silent=True) or {}
    selected_animal = data.get('animal')
    selected_sound = data.get('sound')

    df = animal_data
    if selected_animal:
        df = df[df['animal'] == selected_animal]
    if selected_sound:
        df = df[df['sound'] == selected_sound]

    if not df.empty:
        # Prefer first non-empty context
        context_values = df['context_trigger'].dropna()
        context_value = context_values.iloc[0] if not context_values.empty else ''
        return jsonify({'call_for': context_value or 'No information found for this combination'})
    return jsonify({'call_for': 'No information found for this combination'})

@app.route('/get_animals_by_class/<animal_class>')
def get_animals_by_class(animal_class):
    """Return list of animals for a given class with english and scientific names"""
    if animal_data.empty:
        return jsonify({'animals': []})

    df = animal_data[animal_data['class'] == animal_class]
    if df.empty:
        return jsonify({'animals': []})

    # Build unique pairs
    pairs = (
        df[['animal', 'scientific_name']]
        .dropna()
        .drop_duplicates()
        .sort_values('animal')
        .to_dict(orient='records')
    )
    # Rename keys for frontend expectations
    animals = [
        {
            'english_name': pair['animal'],
            'scientific_name': pair['scientific_name']
        }
        for pair in pairs
    ]
    return jsonify({'animals': animals})

@app.route('/get_animal_by_name', methods=['POST'])
def get_animal_by_name():
    """Resolve english/scientific name to a canonical pair within a class"""
    if animal_data.empty:
        return jsonify({'animal': None})

    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    animal_class = data.get('class')

    if not name:
        return jsonify({'animal': None})

    df = animal_data
    if animal_class:
        df = df[df['class'] == animal_class]

    # Match either english (animal) or scientific_name, case-insensitive
    mask = (
        df['animal'].str.casefold() == name.casefold()
    ) | (
        df['scientific_name'].str.casefold() == name.casefold()
    )
    df_match = df[mask]

    if df_match.empty:
        return jsonify({'animal': None})

    row = df_match.iloc[0]
    return jsonify({'animal': {
        'english_name': row['animal'],
        'scientific_name': row['scientific_name']
    }})

@app.route('/get_result', methods=['POST'])
def get_result():
    """Return emotion and context for selected animal and sound"""
    if animal_data.empty:
        return jsonify({'result': None})

    data = request.get_json(silent=True) or {}
    english_name = data.get('english_name')
    scientific_name = data.get('scientific_name')
    animal_class = data.get('class')
    sound = data.get('sound')

    df = animal_data
    if animal_class:
        df = df[df['class'] == animal_class]
    if english_name:
        df = df[df['animal'] == english_name]
    if scientific_name:
        df = df[df['scientific_name'] == scientific_name]
    if sound:
        df = df[df['sound'] == sound]

    if df.empty:
        return jsonify({'result': None})

    row = df.iloc[0]
    result = {
        'emotion_label': row.get('emotion_label', ''),
        'context_trigger': row.get('context_trigger', '')
    }
    return jsonify({'result': result})

# Health check endpoint for monitoring
@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'data_loaded': not animal_data.empty})

if __name__ == '__main__':
    # For local development
    app.run(debug=True, host='127.0.0.1', port=5000)