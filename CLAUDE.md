# Ensayos Dashboard

Aplicación React SPA para visualizar el progreso de ensayos de calificación farmacéutica.

## Stack
- React 18 + Vite
- Tailwind CSS
- Recharts (gráficos)
- PapaParse (parseo CSV)
- Anthropic API opcional (reporte en texto)

## Fuente de datos
Los datos vienen de Google Sheets públicos (export CSV). 
No hay backend. Todo corre en el browser.
El usuario pega la URL del Sheet una vez → se guarda en localStorage.

## Dos tipos de archivo
1. RawData (salas/áreas): hojas "RawData" y "PD"
2. Flujos (equipos LAF): hojas "Data" y "Resultados"

## Reglas de desarrollo
- Siempre crear los archivos en el orden del plan
- Verificar que cada módulo funcione antes de pasar al siguiente
- Los índices de columna del parseo están fijados en la spec — no cambiarlos
- Idioma de la UI: español
