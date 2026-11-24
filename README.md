# UniBars · El Universo de las Barras

Portal y red social de calistenia de WOPE. Next.js (App Router) + Supabase (Postgres, Auth, RLS).
Se despliega en `portal.wopecalistenia.com`.

## Desarrollo
```bash
cp .env.example .env.local   # completa con la URL y la clave publicable de Supabase
npm install
npm run dev
```

## Reglas
- La clave secreta de Supabase nunca va en el código ni en el navegador.
- Todo permiso vive en la base (RLS + funciones). Las acciones sensibles son funciones RPC.
- Marca (nombre, lema, colores) editable desde la tabla `config_marca`.
- Especificación funcional: ver el proyecto MAESTRO CALISTENIA (UniBars).
