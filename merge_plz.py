import json
import sys

def read_json_file(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Fehler beim Lesen von {filename}: {str(e)}")
        sys.exit(1)

def write_json_file(filename, data):
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Fehler beim Schreiben von {filename}: {str(e)}")
        sys.exit(1)

# Lese die einzelnen JSON-Dateien
print("Lese PLZ-Dateien...")
wien_data = read_json_file('plz_wien.json')
print(f"Wien: {len(wien_data)} Einträge")

noe1_data = read_json_file('plz_noe_1.json')
print(f"NÖ Teil 1: {len(noe1_data)} Einträge")

noe2_data = read_json_file('plz_noe_2.json')
print(f"NÖ Teil 2: {len(noe2_data)} Einträge")

bgld_data = read_json_file('plz_bgld.json')
print(f"Burgenland: {len(bgld_data)} Einträge")

# Kombiniere alle Daten
print("\nKombiniere Daten...")
all_data = wien_data + noe1_data + noe2_data + bgld_data
print(f"Gesamt: {len(all_data)} Einträge")

# Sortiere die Daten nach PLZ
print("Sortiere Daten...")
all_data.sort(key=lambda x: x['PLZ'])

# Schreibe die kombinierten Daten in die Zieldatei
print("\nSchreibe kombinierte Daten...")
write_json_file('plz_ort_at.json', all_data)
print("Fertig!") 