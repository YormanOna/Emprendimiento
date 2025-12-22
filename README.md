# Setup y Ejecución

## Backend

### 1. Crear entorno virtual
```bash
cd backend
python -m venv venv
```

### 2. Activar entorno virtual
```bash
venv\Scripts\activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Configurar `.env`
Crear archivo `backend\.env`:
```
DATABASE_URL=mysql+aiomysql://root:TU_PASSWORD@localhost:3306/cuidado_adulto_mayor
JWT_SECRET_KEY=tu_secret_key_aqui_minimo_32_caracteres_random
```

### 5. Crear base de datos
```bash
mysql -u root -p
CREATE DATABASE cuidado_adulto_mayor;
exit
```

### 6. Iniciar servidor
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
El backend estará en `http://localhost:8000`

---

## Frontend

### 1. Instalar dependencias
```bash
cd Front
npm install
```

### 2. Instalar Expo Go en tu celular
- Android: https://play.google.com/store/apps/details?id=host.exp.exponent
- iOS: https://apps.apple.com/app/expo-go/id982107779

### 3. Configurar IP local
Editar `Front\services\api.ts` línea 8:
```typescript
const LOCAL_IP = '192.168.X.X'; // Cambiar por tu IP local
```

Para obtener tu IP en Windows:
```bash
ipconfig
```
Buscar "Dirección IPv4" de tu adaptador WiFi/Ethernet

### 4. Iniciar servidor
```bash
npm start
```

### 5. Conectar desde celular
- Escanear el QR con Expo Go (Android) o con la Cámara (iOS)
- El celular debe estar en la misma red WiFi que tu PC

---

## Comandos Útiles

### Limpiar cache frontend
```bash
cd Front
npm start -- -c
```

