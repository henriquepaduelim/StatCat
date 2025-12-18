"""
Script para testar a configuração de CORS do backend.
Execute este script no servidor para ver quais origens estão configuradas.
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

print("=" * 80)
print("CONFIGURAÇÃO DE CORS")
print("=" * 80)
print(f"\nEnvironment: {settings.ENVIRONMENT}")
print(f"\nBACKEND_CORS_ORIGINS configuradas:")
print("-" * 80)
for i, origin in enumerate(settings.BACKEND_CORS_ORIGINS, 1):
    print(f"{i}. {origin}")
print("-" * 80)
print(f"\nTotal de origens: {len(settings.BACKEND_CORS_ORIGINS)}")
print("\nTeste de origem específica:")
test_origin = "https://stats-cat.vercel.app"
print(f"Origem: {test_origin}")
print(f"Está na lista? {test_origin in settings.BACKEND_CORS_ORIGINS}")
print("=" * 80)
