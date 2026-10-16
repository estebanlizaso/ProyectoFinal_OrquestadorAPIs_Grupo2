import type { GeneratedCodeResponse } from '../src/features/global-context/types.ts'

export const MOCK_GENERATED_CONTENT: GeneratedCodeResponse = {
  status: 'ready',
  language: 'python',
  summary: 'Se generará un script en Python para consumir la API pública de Pokémon y retornar los datos en formato JSON.',
  questions: [],
  plan: [
    'Importar las librerías necesarias como requests.',
    'Crear una función para realizar la petición HTTP GET a la PokeAPI usando un nombre de Pokémon o ID.',
    'Verificar el estado de la respuesta y retornar los datos en formato JSON.',
  ],
  code: [
    'import requests',
    '',
    '',
    'def obtener_pokemon(nombre_o_id):',
    '    url = f"https://pokeapi.co/api/v2/pokemon/{str(nombre_o_id).lower()}"',
    '    try:',
    '        response = requests.get(url)',
    '        if response.status_code == 200:',
    '            return response.json()',
    '        return {"error": "Pokémon no encontrado", "status_code": response.status_code}',
    '    except requests.exceptions.RequestException as error:',
    '        return {"error": str(error)}',
    '',
    '',
    'if __name__ == "__main__":',
    '    print(obtener_pokemon("pikachu"))',
  ].join('\n'),
}
