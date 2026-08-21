import json
from http.server import BaseHTTPRequestHandler, HTTPServer
import sys

# 🚀 CONFIGURACIÓN DE RESPUESTAS SIMULADAS (MOCKS)
# Modifica estos datos para simular diferentes respuestas de Django
MOCK_DATABASE = {
    "users": {
        "1": {"id": 1, "username": "ai_developer", "role": "admin", "is_active": True},
        "2": {"id": 2, "username": "data_scientist", "role": "user", "is_active": True}
    },
    "ai_tasks": {
        "task_991": {"id": "task_991", "status": "completed", "result": "Gato detectado con 98% de confianza."},
        "task_992": {"id": "task_992", "status": "processing", "result": None}
    }
}

class DjangoMockRequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200, content_type="application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        # Habilitar CORS para que tu servicio de IA pueda conectarse sin restricciones
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        # Manejo de peticiones preflight de CORS
        self._set_headers(200)

    def do_GET(self):
        # 1. Simular Endpoint de Autenticación / Perfil de usuario: GET /api/v1/users/profile/
        if self.path == "/api/v1/users/profile/":
            # Verificar si se envía un token simulado en las cabeceras
            auth_header = self.headers.get("Authorization", "")
            if "Bearer" in auth_header:
                self._set_headers(200)
                self.wfile.write(json.dumps(MOCK_DATABASE["users"]["1"]).encode("utf-8"))
            else:
                self._set_headers(401)
                self.wfile.write(json.dumps({"detail": "Las credenciales de autenticación no se proveyeron."}).encode("utf-8"))
        
        # 2. Simular Endpoint de Estado de Tareas de IA: GET /api/v1/ai/tasks/<id>/
        elif self.path.startswith("/api/v1/ai/tasks/"):
            task_id = self.path.split("/")[-2]  # Extraer el ID de la URL
            if task_id in MOCK_DATABASE["ai_tasks"]:
                self._set_headers(200)
                self.wfile.write(json.dumps(MOCK_DATABASE["ai_tasks"][task_id]).encode("utf-8"))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"detail": f"Tarea '{task_id}' no encontrada."}).encode("utf-8"))
        
        # 3. Endpoint de salud del servidor (Healthcheck)
        elif self.path == "/health/":
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "Django Mock Server is running"}).encode("utf-8"))
            
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"detail": "Ruta no encontrada en el mock de Django."}).encode("utf-8"))

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            body = json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            self._set_headers(400)
            self.wfile.write(json.dumps({"detail": "JSON inválido."}).encode("utf-8"))
            return

        # 1. Simular Login / Obtención de Token de Django REST Framework JWT
        if self.path == "/api/v1/token/":
            username = body.get("username")
            password = body.get("password")
            if username == "ai_developer" and password == "django123":
                self._set_headers(200)
                response_data = {
                    "access": "mock_jwt_access_token_xyz123",
                    "refresh": "mock_jwt_refresh_token_abc789"
                }
                self.wfile.write(json.dumps(response_data).encode("utf-8"))
            else:
                self._set_headers(400)
                self.wfile.write(json.dumps({"non_field_errors": ["No se pudo iniciar sesión con las credenciales provistas."]}).encode("utf-8"))

        # 2. Simular Registro de una nueva inferencia/métrica enviada por el AI Service hacia Django
        elif self.path == "/api/v1/ai/metrics/":
            # Validar que vengan campos clave requeridos por el backend
            if "model_name" in body and "execution_time" in body:
                self._set_headers(201)
                response_data = {
                    "status": "success",
                    "message": "Métrica registrada en Django con éxito.",
                    "received_data": body
                }
                self.wfile.write(json.dumps(response_data).encode("utf-8"))
            else:
                self._set_headers(400)
                self.wfile.write(json.dumps({"model_name": ["Este campo es requerido."], "execution_time": ["Este campo es requerido."]}).encode("utf-8"))

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"detail": "Ruta POST no encontrada."}).encode("utf-8"))

def run(server_class=HTTPServer, handler_class=DjangoMockRequestHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"🚀 Servidor Mock de Django corriendo en http://localhost:{port}")
    print("Presiona Ctrl+C para detenerlo.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Servidor Mock detenido.")
        sys.exit(0)

if __name__ == '__main__':
    # Puedes cambiar el puerto si tu servicio de IA ya usa el 8000
    run(port=8000)
