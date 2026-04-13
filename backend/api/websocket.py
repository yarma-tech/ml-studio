import time
from fastapi import WebSocket

_connections: dict[str, list[WebSocket]] = {}
_statuses: dict[str, dict] = {}
_timestamps: dict[str, float] = {}

ZOMBIE_TIMEOUT = 600  # 10 minutes

async def connect(websocket: WebSocket, training_id: str):
    await websocket.accept()
    _connections.setdefault(training_id, []).append(websocket)
    if training_id in _statuses:
        await websocket.send_json(_statuses[training_id])

async def disconnect(websocket: WebSocket, training_id: str):
    if training_id in _connections:
        _connections[training_id] = [ws for ws in _connections[training_id] if ws != websocket]

async def broadcast(training_id: str, data: dict):
    _statuses[training_id] = data
    _timestamps[training_id] = time.time()
    if training_id not in _connections:
        return
    for ws in _connections[training_id]:
        try:
            await ws.send_json(data)
        except Exception:
            pass

def get_status(training_id: str) -> dict | None:
    status = _statuses.get(training_id)
    if not status:
        return None
    # Auto-expire zombie trainings stuck in "training" state
    if status.get("status") == "training":
        age = time.time() - _timestamps.get(training_id, 0)
        if age > ZOMBIE_TIMEOUT:
            status = {
                **status,
                "status": "error",
                "message": "Entraînement expiré (timeout). Veuillez réessayer avec un dataset plus petit ou moins d'algorithmes.",
            }
            _statuses[training_id] = status
    return status

def set_status(training_id: str, data: dict):
    _statuses[training_id] = data
    _timestamps[training_id] = time.time()
